import Phaser from "phaser";
import { PLANTS } from "../data/plants";

/**
 * HUD — Garden sahnesinin üstünde ayrı, zoom'suz bir sahne olarak çalışır.
 * Sol üst: coin. Sağ üst: tohum seçici (dokununca sıradaki tohuma geçer).
 * Chill mode aktifken ekrana dreamy mor filtre + sayaç biner.
 * Veri kaynağı: game registry ("coins", "seedIndex", "chillUntil").
 */
export class UIScene extends Phaser.Scene {
  private coinText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private chillOverlay!: Phaser.GameObjects.Rectangle;
  private chillGlow!: Phaser.GameObjects.Rectangle;
  private chillText!: Phaser.GameObjects.Text;
  private ambientOverlay!: Phaser.GameObjects.Rectangle;
  private rainOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("UI");
  }

  create() {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#00000099",
      padding: { x: 10, y: 6 },
    };

    // Gün/gece tonu (saate göre) + yağmur grisi — chill tülünün altında
    this.ambientOverlay = this.add
      .rectangle(0, 0, 10, 10, 0x1a2350, 0)
      .setOrigin(0)
      .setDepth(3);
    this.rainOverlay = this.add
      .rectangle(0, 0, 10, 10, 0x5a708a, 0)
      .setOrigin(0)
      .setDepth(4);

    // Chill filtresi: mor tül + alttan sıcak pembe parıltı
    this.chillOverlay = this.add
      .rectangle(0, 0, 10, 10, 0x9a6ac8, 0.14)
      .setOrigin(0)
      .setDepth(5)
      .setVisible(false);
    this.chillGlow = this.add
      .rectangle(0, 0, 10, 10, 0xe89ac8, 0.08)
      .setOrigin(0)
      .setDepth(5)
      .setVisible(false);
    this.chillText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f0e0ff",
        backgroundColor: "#4a2a6a99",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(10)
      .setVisible(false);

    this.coinText = this.add.text(10, 10, "", style).setDepth(10);

    this.seedText = this.add
      .text(this.scale.width - 10, 10, "", style)
      .setOrigin(1, 0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    this.seedText.on("pointerdown", () => {
      const idx = (this.registry.get("seedIndex") as number) ?? 0;
      this.registry.set("seedIndex", (idx + 1) % PLANTS.length);
    });

    this.registry.events.on("changedata", this.refresh, this);
    this.scale.on("resize", () => this.layout());
    this.layout();
    this.refresh();
  }

  private layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.seedText.setX(w - 10);
    this.chillOverlay.setSize(w, h);
    this.chillGlow.setPosition(0, h * 0.6).setSize(w, h * 0.4);
    this.chillText.setPosition(w / 2, h - 14);
    this.ambientOverlay.setSize(w, h);
    this.rainOverlay.setSize(w, h);
  }

  private refresh() {
    const coins = (this.registry.get("coins") as number) ?? 0;
    const idx = (this.registry.get("seedIndex") as number) ?? 0;
    const seed = PLANTS[idx % PLANTS.length];
    this.coinText.setText(`🪙 ${coins}`);
    this.seedText.setText(
      `${seed.emoji} ${seed.name} — ${seed.seedPrice}c  ▸`
    );
  }

  update() {
    const active = (this.registry.get("chilling") as boolean) ?? false;
    this.chillOverlay.setVisible(active);
    this.chillGlow.setVisible(active);
    this.chillText.setVisible(active);
    if (active) {
      // Yumuşak nefes alan tül efekti
      const pulse = 0.12 + 0.04 * Math.sin(this.time.now / 900);
      this.chillOverlay.setFillStyle(0x9a6ac8, pulse);
      this.chillText.setText("🌿 chill mode — plants grow 2x");
    }
    this.updateAmbient();
  }

  /** Cihaz saatine göre gün/gece tonu + yağmur grisi */
  private updateAmbient() {
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 5) {
      this.ambientOverlay.setFillStyle(0x1a2350, 0.3); // gece
    } else if (hour >= 19) {
      this.ambientOverlay.setFillStyle(0x8a4a6a, 0.15); // akşamüstü
    } else if (hour < 7) {
      this.ambientOverlay.setFillStyle(0xffd8a8, 0.1); // şafak
    } else {
      this.ambientOverlay.setFillStyle(0x1a2350, 0); // gündüz
    }
    const raining = (this.registry.get("raining") as boolean) ?? false;
    this.rainOverlay.setFillStyle(0x5a708a, raining ? 0.14 : 0);
  }
}
