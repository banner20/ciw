// heuristics.ts — Computes data-driven insights from the user's video library

const LAYER_TAG_SUGGESTIONS: Record<string, string[]> = {
  descriptive: ['Hook', 'B-Roll', 'Talking Head', 'Voiceover', 'Close-up', 'Montage', 'Overlay', 'Reaction Shot'],
  framework:   ['Curiosity Loop', 'Pattern Interrupt', 'Big Promise', 'Open Loop', 'Mid Video Superhook', 'Deliberate Delay', 'Story Arc', 'Contrarian Opinion'],
  structural:  ['Intro', 'Outro', 'CTA', 'Transition', 'Chapter Break', 'Title Card', 'Recap', 'Teaser'],
  audio:       ['Music Swell', 'Sound Effect', 'Silence', 'Voiceover', 'Natural Audio', 'Music Drop', 'Ambient', 'Hard Cut'],
  visual:      ['Visual Hook', 'Text Overlay', 'Animation', 'Jump Cut', 'Slow Mo', 'Split Screen', 'Zoom', 'B-Roll'],
  custom:      [],
};

export function suggestTagsForLayer(layer: string, start: number, end: number, duration: number): string[] {
  const layerSuggestions = LAYER_TAG_SUGGESTIONS[layer] ?? [];
  const timeSuggestions = suggestTags(start, end, duration);
  const combined = layer === 'custom'
    ? timeSuggestions
    : [...layerSuggestions, ...timeSuggestions.filter(t => !layerSuggestions.includes(t))];
  return [...new Set(combined)].slice(0, 6);
}

export function suggestTags(start: number, end: number, duration: number): string[] {
  const suggestions: string[] = [];
  const segDuration = end - start;
  const pct = start / duration;

  if (start < 3)                      suggestions.push('Hook', 'Curiosity Loop', 'Visual Hook');
  if (pct < 0.1)                      suggestions.push('Big Promise', 'Pattern Interrupt');
  if (pct >= 0.4 && pct <= 0.65)      suggestions.push('Mid Video Superhook', 'Deliberate Delay');
  if (pct >= 0.7)                     suggestions.push('CTA', 'Emotion Spike');
  if (pct >= 0.85)                    suggestions.push('CTA');
  if (segDuration >= 10)              suggestions.push('Talking Head', 'Voiceover');
  if (segDuration <= 3)               suggestions.push('Pattern Interrupt', 'Silent Pause');
  if (segDuration >= 8 && pct > 0.2)  suggestions.push('B-Roll', 'Montage');

  return [...new Set(suggestions)].slice(0, 4);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface VideoInput {
  id: string;
  title: string;
  platform: string;
  formatType?: string;
  duration: number;
  language: string;
  createdAt: string;
  metrics: { retention: number; saves: number; views: number; shares?: number; follows?: number };
}

interface SegmentInput {
  videoId: string;
  tags: string[];
  start: number;
  end: number;
}

interface InsightResult {
  title: string;
  summary: string;
  relatedTags: string[];
  relatedVideos: string[];
  score: number;
  type: string;
  icon: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateInsightsFromData(
  videos: VideoInput[],
  segments: SegmentInput[]
): InsightResult[] {
  const insights: InsightResult[] = [];
  if (!videos.length) return insights;

  // ─── 1. Best tag co-occurrence pattern ────────────────────────────────────
  const tagPairs: Record<string, { videos: string[]; retentions: number[] }> = {};
  for (const seg of segments) {
    const video = videos.find(v => v.id === seg.videoId);
    if (!video) continue;
    for (let i = 0; i < seg.tags.length; i++) {
      for (let j = i + 1; j < seg.tags.length; j++) {
        const key = [seg.tags[i], seg.tags[j]].sort().join(' + ');
        if (!tagPairs[key]) tagPairs[key] = { videos: [], retentions: [] };
        if (!tagPairs[key].videos.includes(seg.videoId)) {
          tagPairs[key].videos.push(seg.videoId);
          tagPairs[key].retentions.push(video.metrics.retention);
        }
      }
    }
  }
  const pairs = Object.entries(tagPairs).filter(([, v]) => v.videos.length >= 2);
  if (pairs.length) {
    const best = pairs.sort(([, a], [, b]) => mean(b.retentions) - mean(a.retentions))[0];
    const [pair, data] = best;
    const avgRet = Math.round(mean(data.retentions));
    insights.push({
      title: `"${pair}" together drives ${avgRet}% avg retention`,
      summary: `Videos featuring both ${pair} consistently outperform your average. This combination appears in ${data.videos.length} video${data.videos.length > 1 ? 's' : ''} — lean into it deliberately in your next script.`,
      relatedTags: pair.split(' + '),
      relatedVideos: data.videos,
      score: Math.min(98, 55 + avgRet),
      type: 'pattern',
      icon: '🔥',
    });
  }

  // ─── 2. Best vs worst tag by retention ────────────────────────────────────
  const tagRetentions: Record<string, number[]> = {};
  for (const seg of segments) {
    const video = videos.find(v => v.id === seg.videoId);
    if (!video) continue;
    for (const tag of seg.tags) {
      if (!tagRetentions[tag]) tagRetentions[tag] = [];
      tagRetentions[tag].push(video.metrics.retention);
    }
  }
  const tagEntries = Object.entries(tagRetentions).filter(([, r]) => r.length >= 2);
  if (tagEntries.length >= 2) {
    const sorted = tagEntries.sort(([, a], [, b]) => mean(b) - mean(a));
    const [bestTag, bestRets] = sorted[0];
    const [worstTag, worstRets] = sorted[sorted.length - 1];
    const bestAvg  = Math.round(mean(bestRets));
    const worstAvg = Math.round(mean(worstRets));
    const delta    = bestAvg - worstAvg;
    if (delta > 5) {
      insights.push({
        title: `"${bestTag}" retains ${delta}% more viewers than "${worstTag}"`,
        summary: `"${bestTag}" appears in ${bestRets.length} videos averaging ${bestAvg}% retention, while "${worstTag}" averages only ${worstAvg}%. Consider replacing or restructuring "${worstTag}" sections.`,
        relatedTags: [bestTag, worstTag],
        relatedVideos: segments.filter(s => s.tags.includes(bestTag)).map(s => s.videoId).filter((v, i, a) => a.indexOf(v) === i),
        score: Math.min(95, 50 + delta * 2),
        type: 'comparison',
        icon: '📊',
      });
    }
  }

  // ─── 3. Hook length vs retention ──────────────────────────────────────────
  const hookVideos: { videoId: string; hookDuration: number; retention: number }[] = [];
  for (const seg of segments) {
    const video = videos.find(v => v.id === seg.videoId);
    if (!video || seg.start > 5) continue;
    const hasHookTag = seg.tags.some(t => ['Hook', 'Visual Hook', 'Curiosity Loop', 'Pattern Interrupt'].includes(t));
    if (hasHookTag) hookVideos.push({ videoId: seg.videoId, hookDuration: seg.end - seg.start, retention: video.metrics.retention });
  }
  if (hookVideos.length >= 3) {
    const shortHooks = hookVideos.filter(h => h.hookDuration <= 3);
    const longHooks  = hookVideos.filter(h => h.hookDuration > 3);
    if (shortHooks.length >= 2 && longHooks.length >= 2) {
      const shortAvg = Math.round(mean(shortHooks.map(h => h.retention)));
      const longAvg  = Math.round(mean(longHooks.map(h => h.retention)));
      const winnerIsShort = shortAvg >= longAvg;
      insights.push({
        title: `${winnerIsShort ? 'Short' : 'Longer'} hooks perform better — ${Math.max(shortAvg, longAvg)}% avg retention`,
        summary: `Short hooks (≤3s) average ${shortAvg}% retention vs ${longAvg}% for longer hooks. ${winnerIsShort ? 'Get to the point faster.' : 'Your audience responds to more setup before the payoff.'}`,
        relatedTags: ['Hook', 'Visual Hook'],
        relatedVideos: hookVideos.map(h => h.videoId).filter((v, i, a) => a.indexOf(v) === i),
        score: 80,
        type: 'recommendation',
        icon: '⚡',
      });
    }
  }

  // ─── 4. Video length sweet spot ───────────────────────────────────────────
  if (videos.length >= 3) {
    const buckets: Record<string, { ids: string[]; rets: number[] }> = {
      'under 60s': { ids: [], rets: [] },
      '1–3 min':   { ids: [], rets: [] },
      '3–10 min':  { ids: [], rets: [] },
      'over 10 min': { ids: [], rets: [] },
    };
    for (const v of videos) {
      const d = v.duration;
      const key = d < 60 ? 'under 60s' : d < 180 ? '1–3 min' : d < 600 ? '3–10 min' : 'over 10 min';
      buckets[key].ids.push(v.id);
      buckets[key].rets.push(v.metrics.retention);
    }
    const filled = Object.entries(buckets).filter(([, b]) => b.rets.length >= 2);
    if (filled.length >= 2) {
      const best = filled.sort(([, a], [, b]) => mean(b.rets) - mean(a.rets))[0];
      const [range, { ids, rets }] = best;
      const avg = Math.round(mean(rets));
      insights.push({
        title: `${range} videos hit ${avg}% avg retention — your sweet spot`,
        summary: `Videos in the ${range} range outperform other lengths with ${avg}% average retention across ${rets.length} video${rets.length > 1 ? 's' : ''}. Consider prioritising this format.`,
        relatedTags: [],
        relatedVideos: ids,
        score: 76,
        type: 'performance',
        icon: '⏱️',
      });
    }
  }

  // ─── 5. Best platform by retention ────────────────────────────────────────
  const platformGroups: Record<string, { ids: string[]; rets: number[] }> = {};
  for (const v of videos) {
    if (!platformGroups[v.platform]) platformGroups[v.platform] = { ids: [], rets: [] };
    platformGroups[v.platform].ids.push(v.id);
    platformGroups[v.platform].rets.push(v.metrics.retention);
  }
  const platformEntries = Object.entries(platformGroups).filter(([, b]) => b.rets.length >= 2);
  if (platformEntries.length >= 2) {
    const sorted = platformEntries.sort(([, a], [, b]) => mean(b.rets) - mean(a.rets));
    const [topPlat, { ids, rets }] = sorted[0];
    const topAvg  = Math.round(mean(rets));
    const nextAvg = sorted[1] ? Math.round(mean(sorted[1][1].rets)) : null;
    insights.push({
      title: `${topPlat.charAt(0).toUpperCase() + topPlat.slice(1)} is your strongest platform — ${topAvg}% retention`,
      summary: `Your ${topPlat} content averages ${topAvg}% retention across ${rets.length} videos.${nextAvg !== null ? ` That's ${topAvg - nextAvg}% better than ${sorted[1][0]} at ${nextAvg}%.` : ''} Double down here.`,
      relatedTags: [],
      relatedVideos: ids,
      score: 82,
      type: 'comparison',
      icon: '🌐',
    });
  }

  // ─── 6. Language comparison ────────────────────────────────────────────────
  const langGroups: Record<string, { ids: string[]; rets: number[] }> = {};
  for (const v of videos) {
    if (!langGroups[v.language]) langGroups[v.language] = { ids: [], rets: [] };
    langGroups[v.language].ids.push(v.id);
    langGroups[v.language].rets.push(v.metrics.retention);
  }
  const langEntries = Object.entries(langGroups).filter(([, b]) => b.rets.length > 0);
  if (langEntries.length > 1) {
    const sorted = langEntries.sort(([, a], [, b]) => mean(b.rets) - mean(a.rets));
    const [topLang, { ids, rets }] = sorted[0];
    const topAvg = Math.round(mean(rets));
    const langName: Record<string, string> = { en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', other: 'Other' };
    insights.push({
      title: `${langName[topLang] ?? topLang} content leads with ${topAvg}% retention`,
      summary: `Your ${langName[topLang] ?? topLang}-language content outperforms other languages with ${topAvg}% average retention. Consider expanding your output in this language.`,
      relatedTags: [],
      relatedVideos: ids,
      score: 85,
      type: 'comparison',
      icon: '🗣️',
    });
  }

  // ─── 7. Top save-driving tag ───────────────────────────────────────────────
  const savesByTag: Record<string, { total: number; count: number; videoIds: string[] }> = {};
  for (const seg of segments) {
    const video = videos.find(v => v.id === seg.videoId);
    if (!video) continue;
    for (const tag of seg.tags) {
      if (!savesByTag[tag]) savesByTag[tag] = { total: 0, count: 0, videoIds: [] };
      savesByTag[tag].total += video.metrics.saves;
      savesByTag[tag].count += 1;
      if (!savesByTag[tag].videoIds.includes(video.id)) savesByTag[tag].videoIds.push(video.id);
    }
  }
  const saveEntries = Object.entries(savesByTag).sort(([, a], [, b]) => (b.total / b.count) - (a.total / a.count));
  if (saveEntries.length >= 1) {
    const [topTag, data] = saveEntries[0];
    insights.push({
      title: `"${topTag}" content gets saved the most`,
      summary: `Segments tagged "${topTag}" appear in your highest-save videos. Saves signal intent — viewers are bookmarking this to revisit. Lean into this format to build a loyal audience.`,
      relatedTags: [topTag],
      relatedVideos: data.videoIds,
      score: 78,
      type: 'performance',
      icon: '💾',
    });
  }

  // ─── 8. Posting cadence & performance trend ───────────────────────────────
  if (videos.length >= 4) {
    const sorted = [...videos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((new Date(sorted[i].createdAt).getTime() - new Date(sorted[i-1].createdAt).getTime()) / 86_400_000);
    }
    const medGap = Math.round(median(gaps));
    const half = Math.ceil(sorted.length / 2);
    const recentAvg = Math.round(mean(sorted.slice(-half).map(v => v.metrics.retention)));
    const olderAvg  = Math.round(mean(sorted.slice(0, half).map(v => v.metrics.retention)));
    const trend = recentAvg > olderAvg + 2 ? 'improving' : recentAvg < olderAvg - 2 ? 'declining' : 'stable';
    insights.push({
      title: `You post every ~${medGap} day${medGap !== 1 ? 's' : ''} — retention is ${trend}`,
      summary: `Median posting cadence: ${medGap} day${medGap !== 1 ? 's' : ''}. Recent videos average ${recentAvg}% retention vs ${olderAvg}% earlier. ${trend === 'improving' ? 'Keep the momentum going.' : trend === 'declining' ? 'Slow down and focus on quality over quantity.' : 'Consistency is paying off.'}`,
      relatedTags: [],
      relatedVideos: sorted.slice(-half).map(v => v.id),
      score: 70,
      type: 'pattern',
      icon: '📅',
    });
  }

  // ─── 9. Undertagged / untagged videos ─────────────────────────────────────
  const segmentedIds = new Set(segments.map(s => s.videoId));
  const untagged  = videos.filter(v => !segmentedIds.has(v.id));
  const emptyTags = videos.filter(v => segments.some(s => s.videoId === v.id) && segments.filter(s => s.videoId === v.id).every(s => s.tags.length === 0));
  const needsWork = [...untagged, ...emptyTags];
  if (needsWork.length > 0 && videos.length > needsWork.length) {
    const taggedAvg = Math.round(mean(
      videos.filter(v => segmentedIds.has(v.id) && !emptyTags.includes(v)).map(v => v.metrics.retention)
    ));
    insights.push({
      title: `${needsWork.length} video${needsWork.length > 1 ? 's' : ''} still need annotation`,
      summary: `${needsWork.length} of your ${videos.length} videos have no tagged segments. Tagged videos average ${taggedAvg}% retention. Annotating these unlocks more patterns and improves insight accuracy.`,
      relatedTags: [],
      relatedVideos: needsWork.map(v => v.id),
      score: 65,
      type: 'recommendation',
      icon: '🏷️',
    });
  }

  // ─── 10. Hidden gems — high saves, low reach ─────────────────────────────
  if (videos.length >= 3) {
    const avgViews   = mean(videos.map(v => v.metrics.views));
    const saveRates  = videos.map(v => ({ ...v, saveRate: v.metrics.saves / Math.max(v.metrics.views, 1) }));
    const medSaveRate = median(saveRates.map(v => v.saveRate));
    const gems = saveRates.filter(v => v.saveRate > medSaveRate * 1.8 && v.metrics.views < avgViews * 0.75);
    if (gems.length > 0) {
      insights.push({
        title: `${gems.length} hidden gem${gems.length > 1 ? 's' : ''} — high saves, low reach`,
        summary: `${gems.map(v => `"${v.title.slice(0, 25)}"`).join(', ')} ${gems.length > 1 ? 'have' : 'has'} an unusually high save rate despite low view counts. The content is clearly valuable — consider re-promoting or repurposing it.`,
        relatedTags: [],
        relatedVideos: gems.map(v => v.id),
        score: 88,
        type: 'performance',
        icon: '💎',
      });
    }
  }

  // Sort by score descending, cap at 8 insights
  return insights.sort((a, b) => b.score - a.score).slice(0, 8);
}
