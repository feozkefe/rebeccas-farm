import Phaser from "phaser";
import { Sfx } from "../systems/Sfx";

/**
 * Späti sahnesi — bahçe kapısından çıkınca gelinen köşe dükkanı.
 * Solda renkli şişelerle dolu buzdolabı (klasik Berlin Späti'si),
 * ortada malzeme rafı: 📄 kağıt / 🚬 tütün / 🌿 yeşillik — dokun, satın al.
 * Tezgahta uyuyan Späti kedisi (her Späti'nin bir kedisi vardır).
 */

interface Product {
  key: "papers" | "tobacco" | "weed";
  emoji: string;
  name: string;
  price: number;
}

const PRODUCTS: Product[] = [
  { key: "papers", emoji: "📄", name: "Papers", price: 3 },
  { key: "tobacco", emoji: "🚬", name: "Tobacco", price: 5 },
  { key: "weed", emoji: "🌿", name: "Green", price: 10 },
];

export class SpatiScene extends Phaser.Scene {
  private onClose: (() => void) | null = null;
  private sfx = new Sfx();
  private closing = false;
  private countTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super("Spati");
  }

  init(data: { onClose: () => void }) {
    this.onClose = data.onClose;
    this.closing = false;
    this.countTexts.clear();
  }

  create() {
    this.registry.set("rolling", true); // bahçe dokunuşlarını kilitle
    const w = this.scale.width;
    const h = this.scale.height;

    this.drawInterior(w, h);
    this.drawFridge(w, h);
    this.createShelf(w, h);
    this.createCounterCat(w, h);
    this.createHud(w);
  }

  // ---------- görsel kurulum ----------

  private drawInterior(w: number, h: number) {
    // Duvar + zemin (akşam Späti loşluğu)
    this.add.rectangle(0, 0, w, h * 0.78, 0x4a3a52).setOrigin(0);
    this.add.rectangle(0, h * 0.78, w, h * 0.22, 0x3a2e40).setOrigin(0);
    // Zemin karoları
    const g = this.add.graphics();
    g.lineStyle(2, 0x322738);
    for (let x = 0; x < w; x += 70) g.lineBetween(x, h * 0.78, x - 40, h);
    // Neon tabela
    const sign = this.add
      .text(w / 2, h * 0.06, "★ SPÄTI 24h ★", {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#ff8ac8",
        stroke: "#8a2a6a",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: sign,
      alpha: 0.65,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // Asılı ampul
    const bulb = this.add.graphics();
    bulb.lineStyle(2, 0x2a2030);
    bulb.lineBetween(w * 0.78, 0, w * 0.78, h * 0.13);
    bulb.fillStyle(0xf2c53d, 0.9);
    bulb.fillCircle(w * 0.78, h * 0.14, 9);
    this.add.circle(w * 0.78, h * 0.14, 26, 0xf2c53d, 0.12);
  }

  /** Klasik Späti buzdolabı: camlı kapı, rengarenk şişeler */
  private drawFridge(w: number, h: number) {
    const fx = w * 0.14;
    const fy = h * 0.2;
    const fw = Math.min(w * 0.24, 190);
    const fh = h * 0.56;
    const g = this.add.graphics();
    g.fillStyle(0xd8d8e0); // gövde
    g.fillRoundedRect(fx - 8, fy - 10, fw + 16, fh + 20, 8);
    g.fillStyle(0x1a2430); // cam
    g.fillRect(fx, fy, fw, fh);
    // Raflar + şişeler
    const bottleColors = [0xe23d2e, 0xf2c53d, 0x5ec850, 0x4a90d9, 0xe89ac8, 0xd96a35];
    for (let shelf = 0; shelf < 4; shelf++) {
      const sy = fy + fh * (0.22 + shelf * 0.22);
      g.fillStyle(0x2a3440);
      g.fillRect(fx, sy, fw, 4);
      for (let b = 0; b < 5; b++) {
        const bx = fx + 12 + b * ((fw - 24) / 4);
        const color = bottleColors[(shelf * 5 + b) % bottleColors.length];
        g.fillStyle(color, 0.95);
        g.fillRoundedRect(bx - 5, sy - 26, 10, 24, 3);
        g.fillStyle(0xffffff, 0.25); // parlama
        g.fillRect(bx - 3, sy - 24, 2, 18);
      }
    }
    // Cam yansıması + soğuk ışıltı
    g.fillStyle(0xffffff, 0.06);
    g.fillTriangle(fx, fy, fx + fw * 0.5, fy, fx, fy + fh);
    this.add.rectangle(fx + fw / 2, fy + fh / 2, fw, fh, 0x8ac8e8, 0.05);
  }

  /** Malzeme rafı: 3 ürün kartı, dokununca satın alır */
  private createShelf(w: number, h: number) {
    const baseX = w * 0.62;
    const baseY = h * 0.42;
    const gap = Math.min(h * 0.2, 150);

    PRODUCTS.forEach((p, i) => {
      const y = baseY + (i - 1) * gap;
      // Raf tahtası
      const shelf = this.add.graphics();
      shelf.fillStyle(0x6b4a2f);
      shelf.fillRect(baseX - 90, y + 34, 180, 10);
      shelf.fillStyle(0x5d3f27);
      shelf.fillRect(baseX - 90, y + 44, 180, 4);

      // Ürün kartı
      const card = this.add.container(baseX, y);
      const bg = this.add.graphics();
      bg.fillStyle(0x2a2038, 0.92);
      bg.fillRoundedRect(-84, -32, 168, 64, 10);
      bg.lineStyle(2, 0x9a6ac8, 0.7);
      bg.strokeRoundedRect(-84, -32, 168, 64, 10);
      const icon = this.add.text(-58, 0, p.emoji, { fontSize: "30px" }).setOrigin(0.5);
      const name = this.add
        .text(-30, -12, p.name, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: "#f0e0ff",
        })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(-30, 12, `${p.price}c`, {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#f2c53d",
        })
        .setOrigin(0, 0.5);
      const count = this.add
        .text(62, 0, "", {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#b8e8b8",
        })
        .setOrigin(0.5);
      this.countTexts.set(p.key, count);
      card.add([bg, icon, name, price, count]);
      card.setSize(168, 64).setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => this.buy(p, card));
    });
    this.refreshCounts();
  }

  /** Her Späti'nin tezgah kedisi — gri tekir, uyuyor */
  private createCounterCat(w: number, h: number) {
    const cx = w * 0.24;
    const cy = h * 0.84;
    const g = this.add.graphics();
    g.fillStyle(0x8a8a92); // gri yumak
    g.fillEllipse(0, 0, 52, 30);
    g.fillStyle(0x74747c); // tekir çizgileri
    g.fillRect(-16, -12, 6, 8);
    g.fillRect(-2, -14, 6, 8);
    g.fillRect(12, -10, 6, 8);
    g.fillStyle(0x8a8a92); // kulaklar
    g.fillTriangle(-24, -8, -18, -18, -12, -10);
    g.fillStyle(0x74747c); // kuyruk öne sarılı
    g.fillEllipse(14, 10, 34, 8);
    const cat = this.add.container(cx, cy, [g]);
    cat.setSize(60, 36).setInteractive({ useHandCursor: true });
    cat.on("pointerdown", () => {
      this.sfx.purr();
      const z = this.add
        .text(cx + 14, cy - 22, "mrrp~", {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#e8d8f0",
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: z,
        y: z.y - 18,
        alpha: 0,
        duration: 1000,
        onComplete: () => z.destroy(),
      });
    });
    // Nefes alma
    this.tweens.add({
      targets: cat,
      scaleY: 1.05,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  private createHud(w: number) {
    this.add
      .text(w / 2, 60, "What do we need? Ne lazımsa al 🛒", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f0e0ff",
        backgroundColor: "#2a203899",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 0);

    const close = this.add
      .text(w - 16, 14, "✕", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#f0e0ff",
        backgroundColor: "#2a203899",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.close());
  }

  // ---------- alışveriş ----------

  private buy(p: Product, card: Phaser.GameObjects.Container) {
    const coins = (this.registry.get("coins") as number) ?? 0;
    if (coins < p.price) {
      this.sfx.denied();
      this.tweens.add({
        targets: card,
        x: card.x + 6,
        duration: 45,
        yoyo: true,
        repeat: 3,
      });
      return;
    }
    this.registry.set("coins", coins - p.price);
    this.registry.set(p.key, ((this.registry.get(p.key) as number) ?? 0) + 1);
    this.sfx.coin();
    this.refreshCounts();
    // Kart zıplar + uçan "+1"
    this.tweens.add({
      targets: card,
      scale: 1.06,
      duration: 110,
      yoyo: true,
    });
    const tag = this.add
      .text(card.x + 40, card.y - 30, `+1 ${p.emoji}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#b8e8b8",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: tag,
      y: tag.y - 26,
      alpha: 0,
      duration: 800,
      onComplete: () => tag.destroy(),
    });
  }

  private refreshCounts() {
    for (const p of PRODUCTS) {
      const n = (this.registry.get(p.key) as number) ?? 0;
      this.countTexts.get(p.key)?.setText(`x${n}`);
    }
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
