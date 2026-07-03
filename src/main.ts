import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GardenScene } from "./scenes/GardenScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#2d1e2f",
  pixelArt: true, // pixel art için: antialiasing kapalı, keskin pikseller
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, GardenScene],
};

new Phaser.Game(config);
