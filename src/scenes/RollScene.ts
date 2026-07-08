import Phaser from "phaser";
import { Sfx } from "../systems/Sfx";

/**
 * Oyuncu gözünden sarma sahnesi — sakin, aceleye gerek yok, kaybetmek yok.
 * Ahşap masa + tepsi; adımlar:
 *   0) kağıda dokun → tepsiye serilir
 *   1) keseye dokun (3 tutam) → yeşiller kağıda dökülür
 *   2) yukarı kaydır (3 kez) → kağıt kıvrılarak sarılır
 *   3) dokun → yapıştır, Perfect! → chill başlar
 * ✕ ile her an vazgeçilebilir (kağıt harcanmaz).
 */

const STEP_HINTS = [
  "Take a paper... Kağıdı al 📄",
  "Tap the pouch to sprinkle — keseye dokun 🌿",
  "Swipe up to roll — yukarı kaydırarak sar",
  "Tap to seal it — dokun, yapıştır 👅",
];

export class RollScene extends Phaser.Scene {
  private onDone: (() => void) | null = null;
  private sfx = new Sfx();
  private step = 0;
  private sprinkles = 0;
  private rollProgress = 0;
  private hint!: Phaser.GameObjects.Text;
  private paperGfx!: Phaser.GameObjects.Graphics;
  private paper!: Phaser.GameObjects.Container;
  private pouch!: Phaser.GameObjects.Container;
  private swipeStartY: number | null = null;
  // Yerleşim (create'te hesaplanır)
  private cx = 0;
  private cy = 0;
  private paperW = 0;
  private paperH = 0;

  constructor() {
    super("Roll");
  }

  init(data: { onDone: () => void }) {
    this.onDone = data.onDone;
    this.step = 0;
    this.sprinkles = 0;
    this.rollProgress = 0;
    this.swipeStartY = null;
  }

  create() {
    this.registry.set("rolling", true);
    const w = this.scale.width;
    const h = this.scale.height;
    this.cx = w / 2;
    this.cy = h * 0.62;
    this.paperW = Math.min(w * 0.42, 300);
    this.paperH = this.paperW * 0.34;

    this.drawBackdrop(w, h);
    this.createPouch();
    this.createPaper();
    this.createHud(w);
    this.setupSwipe();
  }

  // ---------- görsel kurulum ----------

  /** Akşam bahçesi + ahşap masa + tepsi (oyuncu gözünden) */
  private drawBackdrop(w: number, h: number) {
    // Loş akşam bahçesi
    this.add.rectangle(0, 0, w, h * 0.5, 0x22301e).setOrigin(0);
    // Bulanık ışık benekleri (bokeh) — chill his
    for (let i = 0; i < 10; i++) {
      this.add
        .circle(
          Phaser.Math.Between(0, w),
          Phaser.Math.Between(10, h * 0.4),
          Phaser.Math.Between(6, 18),
          Phaser.Math.RND.pick([0xf2c53d, 0x9a6ac8, 0x5ec850]),
          0.12
        );
    }
    // Ahşap masa
    const table = this.add.graphics();
    table.fillStyle(0x6b4a2f);
    table.fillRect(0, h * 0.45, w, h * 0.55);
    table.lineStyle(3, 0x5d3f27);
    for (let y = h * 0.45 + 40; y < h; y += 56) table.lineBetween(0, y, w, y);
    // Tepsi
    const trayW = Math.min(w * 0.72, 520);
    const trayH = h * 0.34;
    table.fillStyle(0x4a3320);
    table.fillRoundedRect(this.cx - trayW / 2, this.cy - trayH / 2, trayW, trayH, 18);
    table.lineStyle(4, 0x3a2818);
    table.strokeRoundedRect(this.cx - trayW / 2, this.cy - trayH / 2, trayW, trayH, 18);
  }

  /** Ot kesesi — tepsinin solunda, dokununca tutam serper */
  private createPouch() {
    const px = this.cx - Math.min(this.scale.width * 0.72, 520) / 2 + 60;
    const py = this.cy + 10;
    const g = this.add.graphics();
    g.fillStyle(0x2f5e3f);
    g.fillRoundedRect(-34, -26, 68, 56, 12); // kese gövdesi
    g.fillStyle(0x3e7a4e);
    g.fillRoundedRect(-34, -26, 68, 20, { tl: 12, tr: 12, bl: 0, br: 0 }); // kapak
    g.fillStyle(0xf2c53d);
    g.fillCircle(0, -16, 4); // düğme
    const label = this.add
      .text(0, 8, "🌿", { fontSize: "22px" })
      .setOrigin(0.5);
    this.pouch = this.add.container(px, py, [g, label]);
    this.pouch.setSize(80, 70).setInteractive({ useHandCursor: true });
    this.pouch.on("pointerdown", () => this.sprinkle());
    // Hafif nefes alan sallanma
    this.tweens.add({
      targets: this.pouch,
      angle: 3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  /** Kağıt — başta tepsinin sağ üstünde eğik durur */
  private createPaper() {
    this.paperGfx = this.add.graphics();
    this.paper = this.add.container(this.cx + this.paperW * 0.55, this.cy - 40, [
      this.paperGfx,
    ]);
    this.paper.setAngle(-14);
    this.paper
      .setSize(this.paperW, this.paperH + 30)
      .setInteractive({ useHandCursor: true });
    this.paper.on("pointerdown", () => {
      if (this.step === 0) this.placePaper();
      else if (this.step === 3) this.seal();
    });
    this.redrawPaper();
  }

  private createHud(w: number) {
    this.hint = this.add
      .text(w / 2, 26, STEP_HINTS[0], {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#f0e0ff",
        backgroundColor: "#2a203899",
        padding: { x: 12, y: 7 },
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
    close.on("pointerdown", () => this.close(false));
  }

  // ---------- adımlar ----------

  private placePaper() {
    this.step = 1;
    this.sfx.dig(); // kağıt hışırtısı yerine geçer
    this.tweens.add({
      targets: this.paper,
      x: this.cx,
      y: this.cy,
      angle: 0,
      duration: 450,
      ease: "Sine.out",
      onComplete: () => this.setHint(1),
    });
  }

  private sprinkle() {
    if (this.step !== 1) return;
    this.sfx.plant();
    // Keseden kağıda düşen yeşil kıymıklar
    for (let i = 0; i < 7; i++) {
      const bit = this.add.rectangle(
        this.pouch.x + Phaser.Math.Between(-8, 8),
        this.pouch.y - 20,
        4,
        4,
        Phaser.Math.RND.pick([0x5ec850, 0x3e8e3e, 0x7ec850])
      );
      this.tweens.add({
        targets: bit,
        x: this.cx + Phaser.Math.Between(-this.paperW / 4, this.paperW / 4),
        y: this.cy + Phaser.Math.Between(-6, 6),
        duration: Phaser.Math.Between(380, 560),
        ease: "Quad.in",
        delay: i * 35,
        onComplete: () => bit.destroy(),
      });
    }
    this.sprinkles = Math.min(this.sprinkles + 1, 3);
    this.time.delayedCall(500, () => this.redrawPaper());
    if (this.sprinkles >= 3) {
      this.step = 2;
      this.time.delayedCall(700, () => this.setHint(2));
    }
  }

  private setupSwipe() {
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.step === 2) this.swipeStartY = p.y;
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.step !== 2 || this.swipeStartY === null) return;
      const dy = this.swipeStartY - p.y;
      this.swipeStartY = null;
      if (dy > 30) {
        this.rollProgress = Math.min(this.rollProgress + 1, 3);
        this.sfx.water(); // yumuşak sürtünme sesi
        this.redrawPaper();
        if (this.rollProgress >= 3) {
          this.step = 3;
          this.setHint(3);
        }
      }
    });
  }

  private seal() {
    this.step = 4;
    this.sfx.harvest();
    this.hint.setText("Perfect! 🌿✨");
    const spark = this.add
      .text(this.cx, this.cy - 30, "✨", { fontSize: "26px" })
      .setOrigin(0.5);
    this.tweens.add({
      targets: spark,
      y: spark.y - 30,
      alpha: 0,
      duration: 900,
      onComplete: () => spark.destroy(),
    });
    // Minik duman + kapanış
    this.time.delayedCall(500, () => {
      this.sfx.gift();
      for (let i = 0; i < 3; i++) {
        const puff = this.add.circle(
          this.cx + this.paperW * 0.32,
          this.cy - 14,
          6,
          0xcccccc,
          0.7
        );
        this.tweens.add({
          targets: puff,
          y: puff.y - 60 - i * 18,
          alpha: 0,
          scale: 2.4,
          duration: 1000,
          delay: i * 220,
          onComplete: () => puff.destroy(),
        });
      }
    });
    this.time.delayedCall(1600, () => this.close(true));
  }

  private close(success: boolean) {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(260, () => {
      this.registry.set("rolling", false);
      const done = this.onDone;
      this.onDone = null;
      this.scene.stop();
      if (success) done?.();
    });
  }

  private setHint(step: number) {
    this.hint.setText(STEP_HINTS[step]);
  }

  // ---------- kağıt çizimi (duruma göre) ----------

  private redrawPaper() {
    const g = this.paperGfx;
    const W = this.paperW;
    const H = this.paperH;
    g.clear();

    if (this.rollProgress === 0) {
      // Düz kağıt + (varsa) ot yığını
      g.fillStyle(0x00000, 0.25);
      g.fillRoundedRect(-W / 2 + 5, -H / 2 + 7, W, H, 8); // gölge
      g.fillStyle(0xf5f2e8);
      g.fillRoundedRect(-W / 2, -H / 2, W, H, 8);
      g.lineStyle(2, 0xe0dcc8);
      g.lineBetween(-W / 2 + 8, 0, W / 2 - 8, 0); // kırışık çizgisi
      if (this.sprinkles > 0) {
        const heapW = W * (0.25 + this.sprinkles * 0.15);
        g.fillStyle(0x3e8e3e);
        g.fillEllipse(0, 2, heapW, H * 0.42);
        g.fillStyle(0x5ec850);
        g.fillEllipse(-heapW * 0.15, -2, heapW * 0.6, H * 0.28);
      }
      return;
    }

    // Sarılma aşamaları: giderek silindirleşir
    const t = this.rollProgress; // 1..3
    const h = H * (1 - t * 0.2); // incelme
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-W / 2 + 5, -h / 2 + 7, W, h, h / 2);
    g.fillStyle(0xf5f2e8);
    g.fillRoundedRect(-W / 2, -h / 2, W, h, h / 2);
    g.lineStyle(2, 0xe0dcc8);
    g.lineBetween(-W / 2 + 10, -h / 4, W / 2 - 10, -h / 4);
    if (t < 3) {
      // İçi hâlâ görünen ot
      g.fillStyle(0x3e8e3e);
      g.fillEllipse(0, 0, W * 0.5, h * 0.4);
    } else {
      // Bitmiş joint: uçta büküm + ağız ucu
      g.fillStyle(0xe8e2d0);
      g.fillTriangle(W / 2 - 4, -h / 2, W / 2 + 14, 0, W / 2 - 4, h / 2);
      g.fillStyle(0xd0c8b0);
      g.fillRect(-W / 2, -h / 2, 10, h);
    }
  }
}
