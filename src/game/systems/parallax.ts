import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';

interface Layer { ts: Phaser.GameObjects.TileSprite; speedFactor: number }

export class Parallax {
  private layers: Layer[] = [];

  constructor(scene: Phaser.Scene) {
    const { width } = GAME_CONFIG;
    const sky = scene.add.tileSprite(0, 0, width, GAME_CONFIG.horizonY + 40, 'bg_sky')
      .setOrigin(0, 0).setDepth(-3);
    const far = scene.add.tileSprite(0, GAME_CONFIG.horizonY - 60, width, 100, 'bg_far')
      .setOrigin(0, 0).setDepth(-2);
    const near = scene.add.tileSprite(0, GAME_CONFIG.horizonY - 30, width, 80, 'bg_near')
      .setOrigin(0, 0).setDepth(-1);
    this.layers = [
      { ts: sky, speedFactor: 0.1 },
      { ts: far, speedFactor: 0.3 },
      { ts: near, speedFactor: 0.6 },
    ];
  }

  update(speedMps: number, dtSec: number): void {
    for (const l of this.layers) {
      l.ts.tilePositionX += speedMps * dtSec * l.speedFactor * 60;
    }
  }

  destroy(): void { for (const l of this.layers) l.ts.destroy(); }
}
