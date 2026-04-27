import * as Phaser from 'phaser';

/** Gera textura procedural como placeholder até PNG real estar disponível. */
export function ensureTexture(
  scene: Phaser.Scene,
  key: string,
  w: number, h: number,
  color: number,
  shape: 'rect' | 'tree' | 'coin' = 'rect',
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(color, 1);
  if (shape === 'tree') {
    g.fillTriangle(w / 2, 0, 0, h * 0.7, w, h * 0.7);
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(w * 0.4, h * 0.7, w * 0.2, h * 0.3);
  } else if (shape === 'coin') {
    g.fillCircle(w / 2, h / 2, Math.min(w, h) / 2 - 2);
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(w / 2, h / 2, Math.min(w, h) / 2 - 6);
  } else {
    g.fillRect(0, 0, w, h);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}
