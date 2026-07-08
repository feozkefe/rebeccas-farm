import Phaser from "phaser";
import { Sfx } from "../systems/Sfx";
import type { LaundryState } from "../systems/SaveSystem";

/**
 * Çamaşır sahnesi — kurutma şemsiyesinin (Wäschespinne) yakın görünümü.
 * İki mod:
 *   hang:    sepetteki ıslak çamaşırları tek tek iplere as
 *   collect: kuruyanları topla (+3c her biri, güneş kokulu bonus)
 * Sakin, acele yok; çamaşırlar rüzgârda hafifçe sallanır. ✕ ile çıkılır,
 * durum kalıcıdır (yarım kalan asma/toplama kaybolmaz).
 */

const CLOTH_COLORS: [number, number][] = [
  [0xd96a35, 0xc55c2c], // Rebecca'nın turuncu tişörtü
  [0x8fb8dd, 0x7ba7d9], // kot şort
  [0xf5f2e8, 0xe0dcc8], // havlu
  [0x5ec850, 0x3e8e3e], // çizgili çorap
  [0xe89ac8, 0xd97ba8], // pembe çarşaf
];

const HINTS = {
  hang: "Hang the laundry — sepetten as 🧺",
  hangDone: "All hung! Hepsi asıldı, güneş halletsin ☀️",
  collect: "They're dry! Topla bakalım 🌸",
  collectDone: "Smells like sunshine! Mis gibi oldu ✨",
};

export class LaundryScene extends Phaser.Scene {
  private mode: "hang" | "collect" = "hang";
  private laundry!: LaundryState;
  private onClose: (() => void) | null = null;
  private sfx = new Sfx();
  private hint!: Phaser.GameObjects.Text;
  private basket!: Phaser.GameObjects.Container;
  private basketPile!: Phaser.GameObjects.Graphics;
  private spots: Phaser.Math.Vector2[] = [];
  private hungClothes: (Phaser.GameObjects.Container | null)[] = [];
  private busy = false;

  constructor() {
    super("Laundry");
  }

  init(data: {
    mode: "hang" | "collect";
    laundry: LaundryState;
    onClose: () => void;
  }) {
    this.mode = data.mode;
    this.laundry = data.laundry;
    this.onClose = data.onClose;
    this.busy = false;
    this.closing = false;
  }

  create() {
    this.registry.set("rolling", true); // bahçe dokunuşlarını kilitle
    const w = this.scale.width;
    const h = this.scale.height;

    this.drawBackdrop(w, h);
    this.computeSpots(w, h);
    this.drawDryer(w, h);
    this.createBasket(w, h);
    this.createHud(w);

    // Asılı duranlar (collect modunda hepsi, hang modunda önceden asılanlar)
    this.hungClothes = this.spots.map(() => null);
    for (let i = 0; i < this.laundry.hung; i++) {
      if (i >= this.spots.length) break;
      this.hungClothes[i] = this.createCloth(i, this.spots[i], this.mode === "collect");
    }
    this.redrawBasketPile();
  }

  // ---------- görsel kurulum ----------

  private drawBackdrop(w: number, h: number) {
    // Gökyüzü + güneş + tembel bulutlar
    this.add.rectangle(0, 0, w, h, 0xa8d8ea).setOrigin(0);
    this.add.circle(w * 0.82, h * 0.14, 34, 0xf2c53d, 0.9);
    const cloud = (cx: number, cy: number, s: number) => {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.85);
      g.fillEllipse(cx, cy, 90 * s, 30 * s);
      g.fillEllipse(cx - 25 * s, cy + 6 * s, 60 * s, 24 * s);
      g.fillEllipse(cx + 30 * s, cy + 5 * s, 55 * s, 22 * s);
      this.tweens.add({
        targets: g,
        x: 30,
        duration: 24000 * s,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    };
    cloud(w * 0.2, h * 0.12, 1);
    cloud(w * 0.6, h * 0.2, 0.7);
    // Çim zemin
    this.add.rectangle(0, h * 0.84, w, h * 0.16, 0x7ec850).setOrigin(0);
    this.add.rectangle(0, h * 0.84, w, 6, 0x6aa844).setOrigin(0);
  }

  /** Asma noktaları: üst ipte 2, alt ipte 3 */
  private computeSpots(w: number, h: number) {
    const cx = w / 2;
    this.spots = [
      new Phaser.Math.Vector2(cx - w * 0.13, h * 0.34),
      new Phaser.Math.Vector2(cx + w * 0.13, h * 0.34),
      new Phaser.Math.Vector2(cx - w * 0.24, h * 0.52),
      new Phaser.Math.Vector2(cx, h * 0.52),
      new Phaser.Math.Vector2(cx + w * 0.24, h * 0.52),
    ];
  }

  /** Fotoğraftaki mavi kurutma şemsiyesi — önden, büyük */
  private drawDryer(w: number, h: number) {
    const cx = w / 2;
    const topY = h * 0.22;
    const g = this.add.graphics();
    // Direk
    g.fillStyle(0x8a8a92);
    g.fillRect(cx - 5, topY, 10, h * 0.62);
    g.fillStyle(0x74747c);
    g.fillRect(cx - 5, topY, 4, h * 0.62);
    // Kollar (direk tepesinden ip uçlarına)
    const line1W = w * 0.36;
    const line2W = w * 0.62;
    g.lineStyle(5, 0x3aa5b8);
    g.lineBetween(cx, topY, cx - line1W / 2 - 20, h * 0.34);
    g.lineBetween(cx, topY, cx + line1W / 2 + 20, h * 0.34);
    g.lineBetween(cx, topY, cx - line2W / 2 - 20, h * 0.52);
    g.lineBetween(cx, topY, cx + line2W / 2 + 20, h * 0.52);
    // İpler (çamaşırların asılacağı yatay hatlar)
    g.lineStyle(4, 0x4ab5c8);
    g.lineBetween(cx - line1W / 2 - 20, h * 0.34, cx + line1W / 2 + 20, h * 0.34);
    g.lineBetween(cx - line2W / 2 - 20, h * 0.52, cx + line2W / 2 + 20, h * 0.52);
    // Tepe düğümü
    g.fillStyle(0x3aa5b8);
    g.fillCircle(cx, topY, 8);
  }

  private createBasket(w: number, h: number) {
    const g = this.add.graphics();
    g.fillStyle(0x9a7448); // hasır sepet
    g.fillRoundedRect(-70, -20, 140, 52, 12);
    g.lineStyle(3, 0x7d5c38);
    for (let i = -60; i <= 60; i += 16) g.lineBetween(i, -20, i, 32);
    g.strokeRoundedRect(-70, -20, 140, 52, 12);
    this.basketPile = this.add.graphics();
    this.basket = this.add.container(w / 2, h * 0.87, [g, this.basketPile]);
    this.basket.setSize(160, 90);
    if (this.mode === "hang") {
      this.basket.setInteractive({ useHandCursor: true });
      this.basket.on("pointerdown", () => this.hangNext());
      // Dikkat çeken minik zıplama
      this.tweens.add({
        targets: this.basket,
        y: this.basket.y - 4,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
  }

  /** Sepetin içindeki rengarenk yığın — kalan çamaşır kadar */
  private redrawBasketPile() {
    const g = this.basketPile;
    g.clear();
    for (let i = 0; i < this.laundry.basket; i++) {
      const [main] = CLOTH_COLORS[i % CLOTH_COLORS.length];
      g.fillStyle(main);
      g.fillEllipse(-40 + i * 20, -22 + (i % 2) * 6, 34, 18);
    }
  }

  private createHud(w: number) {
    this.hint = this.add
      .text(w / 2, 20, this.mode === "hang" ? HINTS.hang : HINTS.collect, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#2a3a4a",
        backgroundColor: "#ffffffcc",
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5, 0);

    const close = this.add
      .text(w - 14, 14, "✕", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#2a3a4a",
        backgroundColor: "#ffffffcc",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.close());
  }

  // ---------- çamaşır çizimi ----------

  /** index → tip (tişört/şort/havlu/çorap/çarşaf), spot'a asılı konteyner */
  private createCloth(
    index: number,
    spot: Phaser.Math.Vector2,
    dry: boolean
  ): Phaser.GameObjects.Container {
    const [main, shade] = CLOTH_COLORS[index % CLOTH_COLORS.length];
    const g = this.add.graphics();
    const type = index % CLOTH_COLORS.length;
    // Islakken hafif koyu/soluk, kuruyunca canlı
    const alpha = dry ? 1 : 0.82;

    g.fillStyle(main, alpha);
    if (type === 0) {
      // Tişört
      g.fillRect(-24, 0, 48, 44);
      g.fillRect(-34, 2, 10, 16);
      g.fillRect(24, 2, 10, 16);
      g.fillStyle(shade, alpha);
      g.fillRect(-8, 0, 4, 44);
      g.fillRect(6, 0, 4, 44);
    } else if (type === 1) {
      // Şort
      g.fillRect(-22, 0, 44, 20);
      g.fillRect(-22, 20, 18, 18);
      g.fillRect(4, 20, 18, 18);
      g.fillStyle(shade, alpha);
      g.fillRect(-22, 34, 18, 4);
      g.fillRect(4, 34, 18, 4);
    } else if (type === 2) {
      // Havlu
      g.fillRect(-20, 0, 40, 52);
      g.fillStyle(shade, alpha);
      g.fillRect(-20, 38, 40, 5);
      g.fillRect(-20, 10, 40, 3);
    } else if (type === 3) {
      // Çorap çifti
      g.fillRect(-20, 0, 12, 30);
      g.fillRect(-20, 24, 18, 12);
      g.fillRect(8, 0, 12, 30);
      g.fillRect(2, 24, 18, 12);
      g.fillStyle(shade, alpha);
      g.fillRect(-20, 6, 12, 4);
      g.fillRect(8, 6, 12, 4);
    } else {
      // Çarşaf
      g.fillRect(-30, 0, 60, 48);
      g.fillStyle(shade, alpha);
      g.fillTriangle(-30, 48, -10, 48, -30, 28);
    }
    // Mandallar
    g.fillStyle(0xf2c53d);
    g.fillRect(-16, -8, 6, 12);
    g.fillRect(10, -8, 6, 12);

    const c = this.add.container(spot.x, spot.y - 2, [g]);
    if (dry) {
      c.setSize(80, 70).setInteractive({ useHandCursor: true });
      c.on("pointerdown", () => this.collectCloth(c, index));
    }
    // Rüzgârda salınım (ip üstünden, mandal noktasından döner gibi)
    this.tweens.add({
      targets: c,
      angle: Phaser.Math.RND.pick([3.5, -3.5]),
      duration: Phaser.Math.Between(1100, 1600),
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
      delay: index * 180,
    });
    return c;
  }

  // ---------- aksiyonlar ----------

  /** Sepetten sıradaki çamaşırı boş ipe as */
  private hangNext() {
    if (this.busy || this.laundry.basket <= 0) return;
    const freeIdx = this.hungClothes.findIndex((c) => c === null);
    if (freeIdx === -1) return;
    this.busy = true;

    this.laundry.basket--;
    this.laundry.hung++;
    this.laundry.hungAt = Date.now();
    this.redrawBasketPile();
    this.sfx.cloth();

    // Sepetten ipe uçuş
    const cloth = this.createCloth(freeIdx, this.spots[freeIdx], false);
    this.hungClothes[freeIdx] = cloth;
    const targetY = cloth.y;
    cloth.setPosition(this.basket.x, this.basket.y - 30);
    cloth.setScale(0.4);
    this.tweens.add({
      targets: cloth,
      x: this.spots[freeIdx].x,
      y: targetY,
      scale: 1,
      duration: 520,
      ease: "Back.out",
      onComplete: () => {
        this.busy = false;
        if (this.laundry.basket <= 0) {
          this.hint.setText(HINTS.hangDone);
          this.time.delayedCall(1400, () => this.close());
        }
      },
    });
  }

  /** Kuru çamaşırı topla: +3c */
  private collectCloth(cloth: Phaser.GameObjects.Container, index: number) {
    if (this.hungClothes[index] !== cloth) return;
    this.hungClothes[index] = null;
    this.laundry.hung--;
    this.sfx.coin();
    const coins = (this.registry.get("coins") as number) ?? 0;
    this.registry.set("coins", coins + 3);

    const tag = this.add
      .text(cloth.x, cloth.y - 12, "+3c ✨", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#2a6a3a",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: tag,
      y: tag.y - 26,
      alpha: 0,
      duration: 800,
      onComplete: () => tag.destroy(),
    });
    // Sepete süzülüş
    this.tweens.add({
      targets: cloth,
      x: this.basket.x,
      y: this.basket.y - 20,
      scale: 0.3,
      angle: 0,
      duration: 450,
      ease: "Quad.in",
      onComplete: () => {
        cloth.destroy();
        if (this.laundry.hung <= 0) {
          this.hint.setText(HINTS.collectDone);
          this.sfx.gift();
          this.time.delayedCall(1400, () => this.close());
        }
      },
    });
  }

  private closing = false;

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
