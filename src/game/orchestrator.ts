import * as Phaser from 'phaser';
import { GAME_CONFIG } from './config.ts';
import { Boot } from './scenes/Boot.ts';
import { Welcome } from './scenes/Welcome.ts';
import { Loading } from './scenes/Loading.ts';
import { Tutorial } from './scenes/Tutorial.ts';
import { Calibration } from './scenes/Calibration.ts';
import { Play } from './scenes/Play.ts';
import { GameOver } from './scenes/GameOver.ts';

export function startApp(): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: GAME_CONFIG.bgColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_CONFIG.width,
      height: GAME_CONFIG.height,
    },
    scene: [Boot, Welcome, Loading, Tutorial, Calibration, Play, GameOver],
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    render: { pixelArt: true, antialias: false },
  });
  return game;
}
