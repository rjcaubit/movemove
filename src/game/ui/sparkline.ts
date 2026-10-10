/** Renderiza SVG sparkline inline. Downsample pra max N pontos. */
export function sparklineSvg(values: number[], width = 300, height = 60, color = '#4cd964'): string {
  if (values.length === 0) return `<svg width="${width}" height="${height}"></svg>`;
  const downsampled = downsample(values, 60);
  const max = Math.max(...downsampled, 1);
  const points = downsampled.map((v, i) => {
    const x = (i / (downsampled.length - 1 || 1)) * width;
    const y = height - (v / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><polyline fill="none" stroke="${color}" stroke-width="2" points="${points}"/></svg>`;
}

function downsample(arr: number[], target: number): number[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let sum = 0; let n = 0;
    for (let j = start; j < end; j++) { sum += arr[j]; n++; }
    out.push(n > 0 ? sum / n : 0);
  }
  return out;
}
