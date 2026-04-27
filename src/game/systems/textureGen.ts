import * as Phaser from 'phaser';

/** Gera textura procedural como placeholder até PNG real estar disponível. */
export function ensureTexture(
  scene: Phaser.Scene,
  key: string,
  w: number, h: number,
  color: number,
  shape: 'rect' | 'tree' | 'coin' | 'log' | 'banner' | 'brick' | 'column' | 'laser' = 'rect',
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });

  if (shape === 'tree') {
    g.fillStyle(color, 1);
    g.fillTriangle(w / 2, 0, 0, h * 0.7, w, h * 0.7);
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(w * 0.4, h * 0.7, w * 0.2, h * 0.3);

  } else if (shape === 'coin') {
    g.fillStyle(color, 1);
    g.fillCircle(w / 2, h / 2, Math.min(w, h) / 2 - 2);
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(w / 2, h / 2, Math.min(w, h) / 2 - 6);

  } else if (shape === 'log') {
    // Tronco cilíndrico deitado
    const r = h / 2;
    g.fillStyle(color, 1);
    g.fillRect(r, 0, w - 2 * r, h);
    g.fillCircle(r, r, r);
    g.fillCircle(w - r, r, r);
    // Anéis de madeira
    g.lineStyle(2, 0x5a2d0c, 0.7);
    g.strokeCircle(r, r, r * 0.5);
    g.strokeCircle(w - r, r, r * 0.5);
    // Listras longitudinais
    g.lineStyle(1, 0x5a2d0c, 0.4);
    for (let i = 1; i <= 3; i++) {
      const lx = r + (w - 2 * r) * (i / 4);
      g.beginPath(); g.moveTo(lx, 3); g.lineTo(lx, h - 3); g.strokePath();
    }

  } else if (shape === 'banner') {
    // Banner suspenso: dois postes + faixa horizontal no topo
    const postW = 6;
    const bandH = Math.floor(h * 0.35);
    // Postes verticais
    g.fillStyle(0x888888, 1);
    g.fillRect(0, 0, postW, h);
    g.fillRect(w - postW, 0, postW, h);
    // Faixa colorida (banner)
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, bandH);
    // Listra decorativa
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(0, bandH * 0.3, w, bandH * 0.15);
    // Borda inferior da faixa
    g.lineStyle(2, 0x000000, 0.5);
    g.beginPath(); g.moveTo(0, bandH); g.lineTo(w, bandH); g.strokePath();

  } else if (shape === 'brick') {
    // Muro de tijolos
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    // Padrão de tijolos
    const bW = w / 3, bH = h / 4;
    g.lineStyle(2, 0x000000, 0.4);
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 === 0 ? 0 : bW / 2;
      for (let col = -1; col < 4; col++) {
        g.strokeRect(col * bW + offset, row * bH, bW, bH);
      }
    }

  } else if (shape === 'column') {
    // Coluna de pedra
    g.fillStyle(color, 1);
    g.fillRect(w * 0.1, 0, w * 0.8, h);
    // Capitel (topo)
    g.fillStyle(0xaaaaaa, 1);
    g.fillRect(0, 0, w, h * 0.12);
    g.fillRect(0, h - h * 0.08, w, h * 0.08);
    // Linhas verticais de pedra
    g.lineStyle(1, 0x000000, 0.25);
    g.beginPath(); g.moveTo(w * 0.35, h * 0.12); g.lineTo(w * 0.35, h - h * 0.08); g.strokePath();
    g.beginPath(); g.moveTo(w * 0.65, h * 0.12); g.lineTo(w * 0.65, h - h * 0.08); g.strokePath();

  } else if (shape === 'laser') {
    // Feixe de laser horizontal (agachar para passar)
    // Emissor esquerdo
    g.fillStyle(0x333333, 1);
    g.fillRect(0, h * 0.25, w * 0.08, h * 0.5);
    // Feixe
    g.fillStyle(0xff0044, 1);
    g.fillRect(w * 0.08, h * 0.42, w * 0.84, h * 0.16);
    // Brilho central
    g.fillStyle(0xff88aa, 1);
    g.fillRect(w * 0.08, h * 0.47, w * 0.84, h * 0.06);
    // Emissor direito
    g.fillStyle(0x333333, 1);
    g.fillRect(w * 0.92, h * 0.25, w * 0.08, h * 0.5);

  } else {
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
  }

  g.generateTexture(key, w, h);
  g.destroy();
}
