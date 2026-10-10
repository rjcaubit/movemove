import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config.ts';
import { zToScale, zToY } from './pseudo3d.ts';
import { ensureTexture } from './textureGen.ts';

const C = GAME_CONFIG;
const TREE_Z_POSITIONS = [0.95, 0.80, 0.65, 0.50, 0.35, 0.20];

export class BillboardLayer {
  private sprites: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene) {
    ensureTexture(scene, 'billboard_tree', 64, 128, 0x228b22, 'tree');
    ensureTexture(scene, 'billboard_sign', 48, 64, 0xf0c040, 'rect');

    for (const z of TREE_Z_POSITIONS) {
      const scale     = zToScale(z);
      const y         = zToY(z);
      const zLerp     = 1 - z;
      const halfW     = C.laneXOffsetAtHorizon + (C.laneXOffsetAtNear - C.laneXOffsetAtHorizon) * zLerp;
      const roadEdgeL = C.width / 2 - halfW * 1.7;
      const roadEdgeR = C.width / 2 + halfW * 1.7;

      const treeL = scene.add.sprite(roadEdgeL - 32 * scale, y, 'billboard_tree')
        .setOrigin(0.5, 1).setScale(scale).setDepth(4 + zLerp * 8);
      const treeR = scene.add.sprite(roadEdgeR + 32 * scale, y, 'billboard_tree')
        .setOrigin(0.5, 1).setScale(scale).setDepth(4 + zLerp * 8);
      this.sprites.push(treeL, treeR);
    }
  }

  destroy(): void { this.sprites.forEach(s => s.destroy()); this.sprites = []; }
}
