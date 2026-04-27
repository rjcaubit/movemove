/** mulberry32 — RNG seedável determinístico de 32 bits. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getRng(): () => number {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  if (seed && Number.isFinite(Number(seed))) return mulberry32(Number(seed));
  return Math.random;
}
