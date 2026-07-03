import Phaser from "phaser";
import { PLANTS } from "../data/plants";

/**
 * HUD — Garden sahnesinin üstünde ayrı, zoom'suz bir sahne olarak çalışır.
 * Sol üst: coin. Sağ üst: tohum seçici (dokununca sıradaki tohuma geçer).
 * Veri kaynağı: game registry ("coins", "seedIndex").
 */
export class UIScene extends Phaser.Scene {
  private coinText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;

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
    this.scale.on("resize", () => {
      this.seedText.setX(this.scale.width - 10);
    });
    this.refresh();
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
}
