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
  // Mix in time-position hints for framework and structural
  const timeSuggestions = suggestTags(start, end, duration);
  const combined = layer === 'custom'
    ? timeSuggestions
    : [...layerSuggestions, ...timeSuggestions.filter(t => !layerSuggestions.includes(t))];
  return [...new Set(combined)].slice(0, 6);
}

// Lightweight heuristic tag suggestions based on segment position and duration
export function suggestTags(start: number, end: number, duration: number): string[] {
  const suggestions: string[] = [];
  const segDuration = end - start;
  const pct = start / duration;

  // Position-based
  if (start < 3) {
    suggestions.push('Hook', 'Curiosity Loop', 'Visual Hook');
  }
  if (pct < 0.1) {
    suggestions.push('Big Promise', 'Pattern Interrupt');
  }
  if (pct >= 0.4 && pct <= 0.65) {
    suggestions.push('Mid Video Superhook', 'Deliberate Delay');
  }
  if (pct >= 0.7) {
    suggestions.push('CTA', 'Emotion Spike');
  }
  if (pct >= 0.85) {
    suggestions.push('CTA');
  }

  // Duration-based
  if (segDuration >= 10) {
    suggestions.push('Talking Head', 'Voiceover');
  }
  if (segDuration <= 3) {
    suggestions.push('Pattern Interrupt', 'Silent Pause');
  }
  if (segDuration >= 8 && pct > 0.2) {
    suggestions.push('B-Roll', 'Montage');
  }

  // De-dupe and return top 4
  return [...new Set(suggestions)].slice(0, 4);
}

export function generateInsightsFromData(
  videos: { id: string; title: string; metrics: { retention: number; saves: number; views: number }; language: string }[],
  segments: { videoId: string; tags: string[]; start: number; end: number }[]
): Array<{ title: string; summary: string; relatedTags: string[]; relatedVideos: string[]; score: number; type: string; icon: string }> {
  const insights = [];

  // Tag co-occurrence patterns
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

  // Best performing pair
  const pairs = Object.entries(tagPairs).filter(([, v]) => v.videos.length >= 2);
  if (pairs.length) {
    const best = pairs.sort(([, a], [, b]) => {
      const avgA = a.retentions.reduce((s, r) => s + r, 0) / a.retentions.length;
      const avgB = b.retentions.reduce((s, r) => s + r, 0) / b.retentions.length;
      return avgB - avgA;
    })[0];
    const [pair, data] = best;
    const avgRet = Math.round(data.retentions.reduce((s, r) => s + r, 0) / data.retentions.length);
    insights.push({
      title: `${pair} drives ${avgRet}% average retention`,
      summary: `Videos featuring both ${pair} together show an average ${avgRet}% retention rate — the strongest combination in your current dataset.`,
      relatedTags: pair.split(' + '),
      relatedVideos: data.videos,
      score: Math.min(98, 60 + avgRet),
      type: 'pattern',
      icon: '🔥',
    });
  }

  // Language comparison
  const langGroups: Record<string, number[]> = {};
  for (const v of videos) {
    if (!langGroups[v.language]) langGroups[v.language] = [];
    langGroups[v.language].push(v.metrics.retention);
  }
  const langEntries = Object.entries(langGroups).filter(([, r]) => r.length > 0);
  if (langEntries.length > 1) {
    const sorted = langEntries.sort(([, a], [, b]) => {
      const avgA = a.reduce((s, r) => s + r, 0) / a.length;
      const avgB = b.reduce((s, r) => s + r, 0) / b.length;
      return avgB - avgA;
    });
    const [topLang, topRets] = sorted[0];
    const topAvg = Math.round(topRets.reduce((s, r) => s + r, 0) / topRets.length);
    insights.push({
      title: `${topLang.toUpperCase()} content leads with ${topAvg}% retention`,
      summary: `Your ${topLang === 'hi' ? 'Hindi' : topLang.toUpperCase()}-language content outperforms others with an average ${topAvg}% retention. Consider creating more content for this audience segment.`,
      relatedTags: [],
      relatedVideos: videos.filter(v => v.language === topLang).map(v => v.id),
      score: 85,
      type: 'comparison',
      icon: '🌐',
    });
  }

  // Top save driver
  const savesByTag: Record<string, { total: number; count: number }> = {};
  for (const seg of segments) {
    const video = videos.find(v => v.id === seg.videoId);
    if (!video) continue;
    for (const tag of seg.tags) {
      if (!savesByTag[tag]) savesByTag[tag] = { total: 0, count: 0 };
      savesByTag[tag].total += video.metrics.saves;
      savesByTag[tag].count += 1;
    }
  }
  const topSaveTag = Object.entries(savesByTag).sort(([, a], [, b]) => b.total / b.count - a.total / a.count)[0];
  if (topSaveTag) {
    insights.push({
      title: `"${topSaveTag[0]}" segments generate the most saves`,
      summary: `Segments tagged with "${topSaveTag[0]}" appear in videos with the highest save rates. Viewers save content they plan to reference — lean into this format.`,
      relatedTags: [topSaveTag[0]],
      relatedVideos: segments.filter(s => s.tags.includes(topSaveTag[0])).map(s => s.videoId).filter((v, i, a) => a.indexOf(v) === i),
      score: 78,
      type: 'performance',
      icon: '💾',
    });
  }

  return insights;
}
