import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GardenScene } from "./scenes/GardenScene";
import { RollScene } from "./scenes/RollScene";
import { LaundryScene } from "./scenes/LaundryScene";
import { UIScene } from "./ui/HUD";

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
  scene: [BootScene, GardenScene, RollScene, LaundryScene, UIScene],
};

const game = new Phaser.Game(config);
// Konsoldan/testten erişim için (debug)
(window as unknown as { game: Phaser.Game }).game = game;

// PWA: service worker sadece production build'de (dev'de HMR ile çakışır)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // kayıt başarısızsa oyun normal çalışmaya devam eder
    });
  });
}
