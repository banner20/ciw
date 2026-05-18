/**
 * Client-side retention curve extractor.
 *
 * Two modes:
 *  1. `extractFull`  — auto-detects the graph region and extracts the curve
 *  2. `extractRegion` — you pass explicit pixel bounds for the graph area
 *
 * The algorithm works by:
 *  - Sampling N columns across the graph width
 *  - In each column finding the "curve pixel" = the topmost bright / most-saturated pixel
 *    (Instagram's curve is either a bright white line or a coloured area fill)
 *  - Mapping its Y position to a 0-100 retention %
 *  - Smoothing the resulting array with a sliding window
 */

const SAMPLES = 50; // points we output

/* ── colour helpers ─────────────────────────────────────────────────── */

function brightness(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function score(r: number, g: number, b: number, a: number) {
  if (a < 30) return 0; // transparent → skip
  const br  = brightness(r, g, b);
  const sat = saturation(r, g, b);
  // Prioritise: bright whites AND coloured fills (Instagram uses both styles)
  return br * 0.6 + sat * 255 * 0.4;
}

/* ── auto-detect graph bounding box ─────────────────────────────────── */

/**
 * Finds the rectangular region in the image that looks like a dark-background graph.
 * Strategy: look for a large contiguous dark region with bright content inside it.
 */
function detectGraphRegion(
  data: Uint8ClampedArray,
  W: number,
  H: number,
): { x0: number; y0: number; x1: number; y1: number } {
  // 1. Build a brightness map (downsampled 4×)
  const STEP = 4;
  const cols = Math.floor(W / STEP);
  const rows = Math.floor(H / STEP);

  const brMap: number[] = new Array(cols * rows).fill(0);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = (row * STEP * W + col * STEP) * 4;
      brMap[row * cols + col] = brightness(data[px], data[px + 1], data[px + 2]);
    }
  }

  // 2. Find the "darkest" horizontal band (candidate graph background)
  let bestRowSum = Infinity;
  let bestRow = Math.floor(rows * 0.2);
  for (let row = Math.floor(rows * 0.1); row < Math.floor(rows * 0.9); row++) {
    let sum = 0;
    for (let col = 0; col < cols; col++) sum += brMap[row * cols + col];
    if (sum < bestRowSum) { bestRowSum = sum; bestRow = row; }
  }

  // 3. Expand from bestRow up and down while avg brightness stays dark
  const threshold = bestRowSum / cols + 40;
  let y0row = bestRow, y1row = bestRow;
  while (y0row > 0) {
    const avg = brMap.slice((y0row - 1) * cols, y0row * cols).reduce((a, b) => a + b, 0) / cols;
    if (avg > threshold) break;
    y0row--;
  }
  while (y1row < rows - 1) {
    const avg = brMap.slice((y1row + 1) * cols, (y1row + 2) * cols).reduce((a, b) => a + b, 0) / cols;
    if (avg > threshold) break;
    y1row++;
  }

  // 4. Similarly find left / right column bounds
  let bestColSum = Infinity;
  let x0col = Math.floor(cols * 0.05), x1col = Math.floor(cols * 0.95);
  // Simple approach: trim columns where avg brightness is high (UI labels on edges)
  for (let col = 0; col < Math.floor(cols * 0.4); col++) {
    let sum = 0;
    for (let row = y0row; row <= y1row; row++) sum += brMap[row * cols + col];
    const avg = sum / (y1row - y0row + 1);
    if (avg < threshold) { x0col = col; break; }
  }
  for (let col = cols - 1; col > Math.floor(cols * 0.6); col--) {
    let sum = 0;
    for (let row = y0row; row <= y1row; row++) sum += brMap[row * cols + col];
    const avg = sum / (y1row - y0row + 1);
    if (avg < threshold) { x1col = col; break; }
  }

  // 5. Add a small inset margin to skip axis labels
  const marginX = Math.max(2, Math.floor((x1col - x0col) * 0.03));
  const marginY = Math.max(2, Math.floor((y1row - y0row) * 0.05));

  return {
    x0: (x0col + marginX) * STEP,
    y0: (y0row + marginY) * STEP,
    x1: (x1col - marginX) * STEP,
    y1: (y1row - marginY) * STEP,
  };
}

/* ── curve extraction ────────────────────────────────────────────────── */

function extractCurveFromRegion(
  data: Uint8ClampedArray,
  W: number,
  region: { x0: number; y0: number; x1: number; y1: number },
  nSamples: number,
): number[] {
  const { x0, y0, x1, y1 } = region;
  const gW = x1 - x0;
  const gH = y1 - y0;
  if (gW <= 0 || gH <= 0) return Array(nSamples).fill(50);

  const raw: number[] = [];

  for (let i = 0; i < nSamples; i++) {
    const colX = Math.round(x0 + (i / (nSamples - 1)) * gW);

    let bestScore = -1;
    let bestY = y1; // default: bottom = 0%

    // Scan this column top-to-bottom within the graph region
    for (let py = y0; py <= y1; py++) {
      const idx = (py * W + colX) * 4;
      const s = score(data[idx], data[idx + 1], data[idx + 2], data[idx + 3]);
      if (s > bestScore) {
        bestScore = s;
        bestY = py;
      }
    }

    // Map bestY to retention%: top of region = 100%, bottom = 0%
    const pct = 1 - (bestY - y0) / gH;
    raw.push(Math.max(0, Math.min(100, pct * 100)));
  }

  return smoothCurve(raw, 3);
}

/* ── smoothing ───────────────────────────────────────────────────────── */

function smoothCurve(arr: number[], windowSize: number): number[] {
  return arr.map((_, i) => {
    const from = Math.max(0, i - windowSize);
    const to   = Math.min(arr.length - 1, i + windowSize);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += arr[j];
    return sum / (to - from + 1);
  });
}

/* ── public API ──────────────────────────────────────────────────────── */

/** Draw an image file onto an OffscreenCanvas and return its pixel data */
async function imageToPixels(file: File): Promise<{ data: Uint8ClampedArray; W: number; H: number }> {
  const bitmap = await createImageBitmap(file);
  const W = bitmap.width;
  const H = bitmap.height;
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, W, H);
  return { data: imageData.data, W, H };
}

/**
 * Full automatic extraction.
 * Auto-detects the graph region, then extracts the retention curve.
 */
export async function extractRetentionCurve(file: File): Promise<{
  curve: number[];
  region: { x0: number; y0: number; x1: number; y1: number };
  W: number;
  H: number;
}> {
  const { data, W, H } = await imageToPixels(file);
  const region = detectGraphRegion(data, W, H);
  const curve  = extractCurveFromRegion(data, W, region, SAMPLES);
  return { curve, region, W, H };
}

/**
 * Region-specific extraction.
 * Use when the user has manually cropped / indicated the graph area.
 * x0,y0,x1,y1 are in image pixels (not CSS pixels).
 */
export async function extractRetentionCurveFromRegion(
  file: File,
  region: { x0: number; y0: number; x1: number; y1: number },
): Promise<number[]> {
  const { data, W } = await imageToPixels(file);
  return extractCurveFromRegion(data, W, region, SAMPLES);
}
