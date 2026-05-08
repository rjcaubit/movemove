import * as Phaser from 'phaser';
import { strings } from '../../i18n/strings.ts';
import { isPortrait } from '../config.ts';

export function addBackButton(
  scene: Phaser.Scene,
  target: string = 'MiniGamesHub',
  onBeforeNav?: () => void,
): Phaser.GameObjects.Text {
  const portrait = isPortrait();
  const btn = scene.add.text(
    scene.scale.width - 20,
    scene.scale.height - 20,
    '← ' + strings.miniGames.back,
    {
      fontFamily: 'VT323, ui-monospace',
      fontSize: portrait ? '22px' : '14px',
      color: '#f5f5f5',
      backgroundColor: 'rgba(0,0,0,0.55)',
      padding: portrait ? { x: 18, y: 10 } : { x: 12, y: 6 },
    },
  ).setOrigin(1, 1).setInteractive({ useHandCursor: true }).setDepth(150);
  btn.setStroke('#000', 3);
  btn.on('pointerup', () => {
    if (onBeforeNav) onBeforeNav();
    scene.scene.start(target);
  });
  return btn;
}
