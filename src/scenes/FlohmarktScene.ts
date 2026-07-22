import Phaser from "phaser";
import { Sfx } from "../systems/Sfx";
import { DECORATIONS, type DecorationDef } from "../data/decorations";

/**
 * Flohmarkt — Berlin bit pazarı. Coin ile bahçe dekorasyonu alınır.
 * Alınan öğe kulübe (shed) envanterine düşer; oradan bahçeye yerleştirilir.
 * Çizgili tenteler, ahşap tezgahlar, rengarenk ıvır zıvır.
 */

export class FlohmarktScene extends Phaser.Scene {
  private onBuy: ((id: string) => void) | null = null;
  private onClose: (() => void) | null = null;
  private sfx = new Sfx();
  private closing = false;
  private coinText!: Phaser.GameObjects.Text;
  private ownedText = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super("Flohmarkt");
  }

  init(data: {
    onBuy: (id: string) => void;
    onClose: () => void;
    ownedCounts: Record<string, number>;
  }) {
    this.onBuy = data.onBuy;
    this.onClose = data.onClose;
    this.closing = false;
    this.ownedText.clear();
  }

  create() {
    this.registry.set("rolling", true);
    const w = this.scale.width;
    const h = this.scale.height;

    this.drawBackdrop(w, h);
    this.createStalls(w, h);
    this.createHud(w, h);
  }

  private drawBackdrop(w: number, h: number) {
    // Açık hava pazarı: gökyüzü + taş zemin
    this.add.rectangle(0, 0, w, h * 0.5, 0xbcd6e8).setOrigin(0);
    this.add.rectangle(0, h * 0.5, w, h * 0.5, 0xb0a794).setOrigin(0);
    const g = this.add.graphics();
    g.lineStyle(1, 0x9a917e);
    for (let x = 0; x < w; x += 44) g.lineBetween(x, h * 0.5, x, h);
    for (let y = h * 0.5; y < h; y += 30) g.lineBetween(0, y, w, y);
    // Çizgili tente şeridi (üstte)
    for (let i = 0; i * 44 < w; i++) {
      g.fillStyle(i % 2 === 0 ? 0xd93a3a : 0xf5f5e8);
      g.fillRect(i * 44, 0, 44, 18);
    }
    // Tabela
    this.add
      .text(w / 2, 30, "✦ FLOHMARKT ✦", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#3a2a1a",
        stroke: "#f2c53d",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
  }

  private createStalls(w: number, h: number) {
    const cols = 2;
    const cardW = Math.min(w * 0.42, 220);
    const cardH = 92;
    const gapX = (w - cols * cardW) / (cols + 1);
    const startY = h * 0.2;
    const gapY = 20;

    DECORATIONS.forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gapX + col * (cardW + gapX) + cardW / 2;
      const y = startY + row * (cardH + gapY) + cardH / 2;
      this.createCard(d, x, y, cardW, cardH);
    });
  }

  private createCard(d: DecorationDef, x: number, y: number, cw: number, ch: number) {
    const card = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0xf5efe0, 0.96);
    bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 8);
    bg.lineStyle(2, 0x8a5a3b, 0.9);
    bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 8);
    card.add(bg);

    // Öğe önizleme (deco texture)
    const preview = this.add.image(-cw / 2 + 34, 0, `deco_${d.id}`).setScale(1.6);
    card.add(preview);

    const name = this.add
      .text(-cw / 2 + 66, -22, d.name, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#3a2a1a",
      })
      .setOrigin(0, 0.5);
    card.add(name);

    const price = this.add
      .text(-cw / 2 + 66, -2, `🪙 ${d.price}`, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#8a5a2b",
      })
      .setOrigin(0, 0.5);
    card.add(price);

    const owned = this.add
      .text(-cw / 2 + 66, 16, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#3a7a4a",
      })
      .setOrigin(0, 0.5);
    card.add(owned);
    this.ownedText.set(d.id, owned);

    const buyBtn = this.add
      .text(cw / 2 - 30, 0, "Buy", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffffff",
        backgroundColor: "#3a7a4a",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    buyBtn.on("pointerdown", () => this.buy(d, card));
    card.add(buyBtn);

    this.refreshOwned();
  }

  private buy(d: DecorationDef, card: Phaser.GameObjects.Container) {
    const coins = (this.registry.get("coins") as number) ?? 0;
    if (coins < d.price) {
      this.sfx.denied();
      this.tweens.add({ targets: card, x: card.x + 6, duration: 45, yoyo: true, repeat: 3 });
      return;
    }
    this.registry.set("coins", coins - d.price);
    this.onBuy?.(d.id);
    this.sfx.coin();
    this.refreshOwned();
    this.updateCoinText();
    this.tweens.add({ targets: card, scale: 1.04, duration: 110, yoyo: true });
    const tag = this.add
      .text(card.x, card.y - 40, `+1 ${d.emoji}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#2a6a3a",
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({
      targets: tag,
      y: tag.y - 24,
      alpha: 0,
      duration: 800,
      onComplete: () => tag.destroy(),
    });
  }

  private refreshOwned() {
    // GardenScene sahibi olduğu sayıyı registry'ye yazar; okumak için basitçe
    // her satın alımda +1 gösteriyoruz (tam sayaç DecorationSystem'de).
    for (const d of DECORATIONS) {
      const n = (this.registry.get(`owned_${d.id}`) as number) ?? 0;
      const t = this.ownedText.get(d.id);
      if (t) t.setText(n > 0 ? `sahip: ${n} 🏚️` : "");
    }
  }

  private createHud(w: number, h: number) {
    this.coinText = this.add
      .text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#3a2a1a",
        backgroundColor: "#f5efe0cc",
        padding: { x: 10, y: 6 },
      })
      .setDepth(50);
    this.updateCoinText();

    const close = this.add
      .text(w - 16, 14, "✕", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#3a2a1a",
        backgroundColor: "#f5efe0cc",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.close());

    const exit = this.add
      .text(w / 2, h - 16, "🚪 Leave — bahçeye dön", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#3a2a1a",
        backgroundColor: "#e0b878cc",
        padding: { x: 16, y: 9 },
      })
      .setOrigin(0.5, 1)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    exit.on("pointerdown", () => this.close());
    this.tweens.add({ targets: exit, alpha: 0.8, duration: 900, yoyo: true, repeat: -1 });
  }

  private updateCoinText() {
    this.coinText.setText(`🪙 ${(this.registry.get("coins") as number) ?? 0}`);
  }

  private close() {
    if (this.closing || !this.cameras?.main) return;
    this.closing = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(260, () => {
      this.registry.set("rolling", false);
      const done = this.onClose;
      this.onClose = null;
      this.scene.stop();
      done?.();
    });
  }
}
