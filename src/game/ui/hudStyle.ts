import * as Phaser from 'phaser';

const FONT = 'VT323, ui-monospace';

export interface PillOpts {
  width: number;
  height?: number;
  fill: number;
  stroke: number;
  textColor: string;
  fontSize: number;
  icon?: string;
  iconColor?: string;
  origin?: [number, number];
}

export class Pill {
  readonly container: Phaser.GameObjects.Container;
  private textEl: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, initial: string, opts: PillOpts) {
    const w = opts.width;
    const h = opts.height ?? 48;
    const r = h / 2;
    const [ox, oy] = opts.origin ?? [0.5, 0.5];

    const cx = -w * (ox - 0.5);
    const cy = -h * (oy - 0.5);

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.45);
    shadow.fillRoundedRect(cx - w / 2 + 3, cy - h / 2 + 5, w, h, r);

    const bg = scene.add.graphics();
    bg.fillStyle(opts.fill, 1);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
    bg.lineStyle(4, opts.stroke, 1);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r);

    const items: Phaser.GameObjects.GameObject[] = [shadow, bg];

    let textCenterX = cx;
    if (opts.icon) {
      const iconSize = h - 16;
      const iconX = cx - w / 2 + 14;
      const iconBg = scene.add.graphics();
      iconBg.fillStyle(0xffffff, 0.9);
      iconBg.fillCircle(iconX + iconSize / 2, cy, iconSize / 2 + 2);
      iconBg.lineStyle(3, opts.stroke, 1);
      iconBg.strokeCircle(iconX + iconSize / 2, cy, iconSize / 2 + 2);
      const iconEl = scene.add.text(iconX + iconSize / 2, cy, opts.icon, {
        fontSize: `${iconSize - 6}px`, color: opts.iconColor ?? '#000',
      }).setOrigin(0.5);
      items.push(iconBg, iconEl);
      textCenterX = cx + iconSize / 2 + 4;
    }

    this.textEl = scene.add.text(textCenterX, cy, initial, {
      fontFamily: FONT, fontSize: `${opts.fontSize}px`,
      color: opts.textColor, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    items.push(this.textEl);

    this.container = scene.add.container(x, y, items).setDepth(50);
  }

  setText(s: string): void { this.textEl.setText(s); }
  setColor(c: string): void { this.textEl.setColor(c); }
}

export function addTitleBanner(
  scene: Phaser.Scene,
  x: number, y: number,
  text: string,
  fill: number,
  stroke: number,
  textColor = '#ffffff',
): Phaser.GameObjects.Container {
  const t = scene.add.text(0, 0, text, {
    fontFamily: FONT, fontSize: '34px', color: textColor,
    fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
  }).setOrigin(0.5);
  const w = Math.max(220, t.width + 70);
  const h = 56;
  const r = 16;
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.5);
  shadow.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, r);
  const bg = scene.add.graphics();
  bg.fillStyle(fill, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  bg.lineStyle(5, stroke, 1);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  const ribbon = scene.add.graphics();
  ribbon.fillStyle(0xffffff, 0.18);
  ribbon.fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.35, 8);
  return scene.add.container(x, y, [shadow, bg, ribbon, t]).setDepth(60);
}

export type Theme = 'ghost' | 'trunk' | 'bell' | 'chicken' | 'dance' | 'castor' | 'helicopter';

interface ThemeColors {
  topBand: number;
  bottomBand: number;
  accent: number;
  vignette: number;
}

const THEMES: Record<Theme, ThemeColors> = {
  ghost:   { topBand: 0x2a1a4a, bottomBand: 0x0a0612, accent: 0x9d6cff, vignette: 0x0a0612 },
  trunk:   { topBand: 0x4a1a4a, bottomBand: 0x14081a, accent: 0xbf5af2, vignette: 0x14081a },
  bell:    { topBand: 0x5a3a0a, bottomBand: 0x1a1004, accent: 0xffd60a, vignette: 0x1a1004 },
  chicken: { topBand: 0x2a4a1a, bottomBand: 0x141a08, accent: 0xffae0a, vignette: 0x141a08 },
  dance:   { topBand: 0x1a0a4a, bottomBand: 0x080214, accent: 0xff2bd6, vignette: 0x080214 },
  castor:  { topBand: 0x2a1400, bottomBand: 0x0a0600, accent: 0x8b4513, vignette: 0x0a0600 },
  helicopter: { topBand: 0x0a2a4a, bottomBand: 0x1a3d0a, accent: 0x4cd964, vignette: 0x050e14 },
};

/**
 * Decoração de tema: faixa superior + faixa inferior em gradiente, vignette nas
 * bordas. Camera backdrop fica visível no centro. Tudo desenhado em depth -90
 * (acima da câmera em -100, abaixo da HUD em 50+).
 */
export function addThemedFrame(scene: Phaser.Scene, theme: Theme): void {
  const { width, height } = scene.scale;
  const c = THEMES[theme];

  const topBandH = 110;
  const botBandH = 90;

  const top = scene.add.graphics().setDepth(-90);
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const a = 0.85 * (1 - i / steps);
    top.fillStyle(c.topBand, a);
    top.fillRect(0, (topBandH / steps) * i, width, topBandH / steps + 1);
  }

  const bot = scene.add.graphics().setDepth(-90);
  for (let i = 0; i < steps; i++) {
    const a = 0.85 * (i / steps);
    bot.fillStyle(c.bottomBand, a);
    bot.fillRect(0, height - botBandH + (botBandH / steps) * i, width, botBandH / steps + 1);
  }

  const sides = scene.add.graphics().setDepth(-90);
  sides.fillStyle(c.vignette, 0.55);
  sides.fillRect(0, 0, 80, height);
  sides.fillRect(width - 80, 0, 80, height);

  // Accents — bolhas decorativas no canto
  const acc = scene.add.graphics().setDepth(-89);
  acc.fillStyle(c.accent, 0.18);
  acc.fillCircle(60, 60, 50);
  acc.fillCircle(width - 60, height - 60, 60);
}
