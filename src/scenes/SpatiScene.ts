import Phaser from "phaser";
import { Sfx } from "../systems/Sfx";

/**
 * KIOSK 44 — reference/spati/ fotoğraflarındaki gerçek Späti.
 * Pembe neon "BISTRO KIOSK 44" tabelası, mor LED şeritli ahşap raflar,
 * içki şişeleri, cips/şeker rafı, sigara duvarı, tezgahta çakmak standı
 * ve balık lamba. Tezgahın arkasında HAMUDI: kumral hafif kıvırcık orta
 * boy saç, hafif kirli sakal. Rebecca ile Almanca konuşurlar.
 */

interface Product {
  key: "papers" | "tobacco" | "weed";
  emoji: string;
  name: string;
  price: number;
}

const PRODUCTS: Product[] = [
  { key: "papers", emoji: "📄", name: "Papers", price: 6 },
  { key: "tobacco", emoji: "🚬", name: "Tobacco", price: 10 },
  { key: "weed", emoji: "🌿", name: "Green", price: 22 },
];

/** Selamlaşma çiftleri: [Hamudi, Rebecca] — Almanca, B1 tadında */
const GREETINGS: [string, string][] = [
  ["Na, Rebecca! Alles klar?", "Hallo Hamudi! Alles gut, und bei dir?"],
  ["Wie geht's dem Garten?", "Super — die Tomaten werden riesig!"],
  ["Schönes Wetter heute, oder?", "Perfekt zum Chillen im Garten."],
  ["Lange nicht gesehen!", "Haha, ich war gestern hier, Hamudi."],
];

/** Hamudi'ye dokununca muhabbet çiftleri */
const SMALLTALK: [string, string][] = [
  ["Wie geht's Spicey?", "Frech wie immer. Sie schläft den ganzen Tag."],
  ["Neue Lieferung kommt Freitag.", "Ah nice, dann bis Freitag!"],
  ["Willst du einen Kaffee?", "Nee danke, ich hab schon Tee gehabt."],
  ["Berlin ist heute ruhig, ne?", "Zu ruhig... fast verdächtig."],
];

const BUY_LINES = ["Gute Wahl!", "Bitteschön!", "Brauchst du noch was?", "Alles frisch!"];
const BROKE_LINES = ["Nicht genug Coins? Nächstes Mal!", "Kein Stress, komm später wieder."];
const BYE_PAIR: [string, string] = ["Tschüss! Grüß Spicey von mir!", "Mach ich! Bis bald!"];

export class SpatiScene extends Phaser.Scene {
  private onClose: (() => void) | null = null;
  private sfx = new Sfx();
  private closing = false;
  private countTexts = new Map<string, Phaser.GameObjects.Text>();
  private hamudi!: Phaser.GameObjects.Container;
  private hamudiBubble: Phaser.GameObjects.Container | null = null;
  private rebeccaBubble: Phaser.GameObjects.Container | null = null;

  constructor() {
    super("Spati");
  }

  init(data: { onClose: () => void }) {
    this.onClose = data.onClose;
    this.closing = false;
    this.countTexts.clear();
    this.hamudiBubble = null;
    this.rebeccaBubble = null;
  }

  create() {
    this.registry.set("rolling", true); // bahçe dokunuşlarını kilitle
    const w = this.scale.width;
    const h = this.scale.height;

    this.drawInterior(w, h);
    this.drawLeftShelves(w, h);
    this.drawCigaretteWall(w, h);
    this.drawCounter(w, h);
    this.createHamudi(w, h);
    this.createShelf(w, h);
    this.createHud(w, h);

    // Kapıdan girince selamlaşma
    this.time.delayedCall(400, () => {
      const [hi, re] = Phaser.Math.RND.pick(GREETINGS);
      this.exchange(hi, re);
    });
  }

  // ---------- görsel kurulum ----------

  private drawInterior(w: number, h: number) {
    // Ahşap duvar + gri zemin (fotoğraftaki gibi)
    this.add.rectangle(0, 0, w, h * 0.72, 0x8a7a68).setOrigin(0);
    this.add.rectangle(0, h * 0.72, w, h * 0.28, 0x5a5a60).setOrigin(0);
    const g = this.add.graphics();
    g.lineStyle(2, 0x4a4a50);
    for (let x = 0; x < w; x += 80) g.lineBetween(x, h * 0.72, x - 50, h);

    // Neon tabela: BISTRO (beyaz, küçük) + KIOSK 44 (pembe neon)
    this.add
      .text(w / 2, h * 0.025, "BISTRO", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f0f0f0",
        stroke: "#8a8a92",
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0);
    const sign = this.add
      .text(w / 2, h * 0.05, "KIOSK 44", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#ff4ab8",
        stroke: "#8a1a6a",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    this.add
      .ellipse(w / 2, h * 0.075, 220, 54, 0xff4ab8, 0.1)
      .setOrigin(0.5);
    this.tweens.add({
      targets: sign,
      alpha: 0.7,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  /** Mor LED şeritli raf + üzerine çizim yapan yardımcı */
  private ledShelf(g: Phaser.GameObjects.Graphics, x: number, y: number, sw: number) {
    g.fillStyle(0x6a5a48); // ahşap raf tahtası
    g.fillRect(x, y, sw, 6);
    g.fillStyle(0xb88ae8, 0.9); // mor LED şerit (fotoğrafın imzası)
    g.fillRect(x, y + 6, sw, 2);
    g.fillStyle(0xb88ae8, 0.12); // yumuşak mor parıltı
    g.fillRect(x, y + 8, sw, 10);
  }

  /** Sol raf ünitesi: üstte içkiler, altta cips/şeker (fotoğraftaki gibi) */
  private drawLeftShelves(w: number, h: number) {
    const x0 = w * 0.03;
    const sw = w * 0.3;
    const g = this.add.graphics();
    // Raf arkalığı
    g.fillStyle(0x7a6a58);
    g.fillRect(x0 - 6, h * 0.12, sw + 12, h * 0.56);

    // Raf 1 (üst): içki şişeleri — koyu, farklı boylar
    const y1 = h * 0.2;
    this.ledShelf(g, x0, y1, sw);
    const bottleColors = [0x3a2a1a, 0x1a3a2a, 0x2a1a3a, 0x4a3a1a, 0x1a1a2a];
    for (let i = 0; i < 6; i++) {
      const bx = x0 + 10 + i * (sw / 6);
      const bh = Phaser.Math.Between(26, 38);
      g.fillStyle(bottleColors[i % bottleColors.length]);
      g.fillRoundedRect(bx, y1 - bh, 11, bh, 3);
      g.fillStyle(0xf2c53d, 0.8); // etiket
      g.fillRect(bx + 2, y1 - bh * 0.55, 7, 8);
    }

    // Raf 2: cips paketleri — parlak renkli (Takis/Pringles havası)
    const y2 = h * 0.36;
    this.ledShelf(g, x0, y2, sw);
    const chipColors = [0xe23d2e, 0x6a3ae8, 0x2a6ae8, 0xf2a53d, 0xe23d8e];
    for (let i = 0; i < 5; i++) {
      const bx = x0 + 8 + i * (sw / 5);
      g.fillStyle(chipColors[i]);
      g.fillRoundedRect(bx, y2 - 30, 16, 30, 4);
      g.fillStyle(0xffffff, 0.35); // parlama
      g.fillRect(bx + 2, y2 - 27, 3, 24);
    }

    // Raf 3: şekerler — küçük rengarenk paketler (Haribo/M&M's havası)
    const y3 = h * 0.52;
    this.ledShelf(g, x0, y3, sw);
    const candyColors = [0xf2c53d, 0x5ec850, 0xe89ac8, 0x4a90d9, 0xe23d2e, 0xffffff];
    for (let i = 0; i < 8; i++) {
      const bx = x0 + 6 + i * (sw / 8);
      g.fillStyle(candyColors[i % candyColors.length]);
      g.fillRoundedRect(bx, y3 - 16, 10, 16, 3);
    }

    // Dikey mor LED kenar (raf ünitesinin kıvrımı, fotoğraftaki gibi)
    g.fillStyle(0xb88ae8, 0.9);
    g.fillRect(x0 + sw + 4, h * 0.12, 3, h * 0.56);
  }

  /** Sağ duvar: sigara duvarı — beyaz/renkli paket ızgarası */
  private drawCigaretteWall(w: number, h: number) {
    const x0 = w * 0.76;
    const sw = w * 0.21;
    const g = this.add.graphics();
    g.fillStyle(0x7a6a58);
    g.fillRect(x0 - 6, h * 0.12, sw + 12, h * 0.4);
    const packColors = [0xf5f2e8, 0xe23d2e, 0x2a6ae8, 0xf2c53d, 0xf5f2e8, 0x5a5a60];
    const cols = 4;
    const rows = 7;
    const pw = sw / cols;
    for (let r = 0; r < rows; r++) {
      const py = h * 0.14 + r * (h * 0.052);
      for (let c = 0; c < cols; c++) {
        g.fillStyle(packColors[(r * cols + c) % packColors.length]);
        g.fillRoundedRect(x0 + c * pw + 1, py, pw - 3, h * 0.042, 2);
      }
      g.fillStyle(0xb88ae8, 0.5); // raf arası ince mor LED
      g.fillRect(x0, py + h * 0.045, sw, 1);
    }
  }

  /** Gri tezgah + mor LED kenar + çakmak standı + balık lamba */
  private drawCounter(w: number, h: number) {
    const cy = h * 0.6;
    const g = this.add.graphics();
    g.fillStyle(0x8a8a92); // gri tezgah üstü
    g.fillRect(0, cy, w, 14);
    g.fillStyle(0x6a5a48); // ahşap ön yüz
    g.fillRect(0, cy + 14, w, h * 0.16);
    g.fillStyle(0xb88ae8, 0.9); // mor LED kenar şeridi
    g.fillRect(0, cy + 11, w, 3);
    g.lineStyle(2, 0x5d4f3e);
    for (let x = 30; x < w; x += 90) g.lineBetween(x, cy + 14, x - 20, cy + 14 + h * 0.16);

    // Çakmak standı (sarı CLIPPER standı + renkli çakmaklar)
    const lx = w * 0.09;
    g.fillStyle(0xf2c53d);
    g.fillRoundedRect(lx - 16, cy - 34, 32, 34, 4);
    const lighterColors = [0xe23d2e, 0x5ec850, 0x4a90d9, 0xe89ac8, 0x6a3ae8, 0xf2a53d];
    for (let i = 0; i < 6; i++) {
      g.fillStyle(lighterColors[i]);
      g.fillRoundedRect(lx - 12 + (i % 3) * 9, cy - 30 + Math.floor(i / 3) * 14, 6, 12, 2);
    }

    // Balık lamba (fotoğraftaki turuncu-pembe balık!)
    const fx = w * 0.24;
    g.fillStyle(0xf28a5d);
    g.fillEllipse(fx, cy - 12, 34, 20);
    g.fillStyle(0xe85d8a); // kuyruk
    g.fillTriangle(fx + 15, cy - 12, fx + 28, cy - 22, fx + 28, cy - 2);
    g.fillStyle(0x2a2a30); // göz
    g.fillCircle(fx - 9, cy - 14, 2);
    this.add.ellipse(fx, cy - 12, 52, 34, 0xf28a5d, 0.16); // lamba parıltısı
  }

  /** Hamudi — kumral hafif kıvırcık orta boy saç, hafif kirli sakal */
  private createHamudi(w: number, h: number) {
    const P = Math.max(3, Math.round(Math.min(w, h) / 130)); // piksel birimi
    const g = this.add.graphics();

    // Orta boy kıvırcık kumral saç: üstte ve yanlarda bukle yumruları
    g.fillStyle(0xa07848);
    g.fillCircle(0, -10 * P, 4 * P);
    g.fillCircle(-4 * P, -9 * P, 3.4 * P);
    g.fillCircle(4 * P, -9 * P, 3.4 * P);
    g.fillCircle(-6 * P, -6 * P, 2.8 * P); // yan bukleler (kulak hizasına iner)
    g.fillCircle(6 * P, -6 * P, 2.8 * P);
    g.fillCircle(-6.5 * P, -3 * P, 2.2 * P);
    g.fillCircle(6.5 * P, -3 * P, 2.2 * P);
    g.fillStyle(0x8a6238, 0.6); // bukle gölgeleri (kıvırcık dokusu)
    g.fillCircle(-2 * P, -11 * P, 1.4 * P);
    g.fillCircle(2.5 * P, -10.5 * P, 1.4 * P);
    g.fillCircle(-5 * P, -7.5 * P, 1.2 * P);
    g.fillCircle(5 * P, -7 * P, 1.2 * P);

    // Yüz
    g.fillStyle(0xe0b088);
    g.fillRoundedRect(-4 * P, -8 * P, 8 * P, 9 * P, 2 * P);
    // Kaşlar + gözler
    g.fillStyle(0x6b4a2f);
    g.fillRect(-3 * P, -5.5 * P, 2.2 * P, 0.7 * P);
    g.fillRect(1 * P, -5.5 * P, 2.2 * P, 0.7 * P);
    g.fillStyle(0x3a2a1a);
    g.fillRect(-2.5 * P, -4.5 * P, 1.3 * P, 1.3 * P);
    g.fillRect(1.5 * P, -4.5 * P, 1.3 * P, 1.3 * P);
    // Burun
    g.fillStyle(0xd0a078);
    g.fillRect(-0.5 * P, -3 * P, 1 * P, 1.6 * P);
    // Hafif kirli sakal: çene + yanaklarda koyu gölge ve kıl noktaları
    g.fillStyle(0x8a6a50, 0.55);
    g.fillRoundedRect(-4 * P, -1.6 * P, 8 * P, 2.6 * P, P);
    g.fillStyle(0x6b5540, 0.7);
    for (const [sx, sy] of [
      [-3.2, -1], [-1.8, -0.4], [-0.2, -1.1], [1.4, -0.5], [2.8, -1], [-2.4, 0.2], [0.8, 0.3], [2.2, 0.1],
    ]) {
      g.fillRect(sx * P, sy * P, 0.6 * P, 0.6 * P);
    }
    // Ağız (hafif gülümseme)
    g.fillStyle(0x9a6a55);
    g.fillRect(-1.2 * P, -0.6 * P, 2.4 * P, 0.6 * P);

    // Gövde: koyu tişört (tezgah arkasında üst beden)
    g.fillStyle(0x3a3a42);
    g.fillRoundedRect(-7 * P, 1.5 * P, 14 * P, 9 * P, 2 * P);
    g.fillStyle(0x2a2a32); // yaka
    g.fillRect(-2.5 * P, 1.5 * P, 5 * P, 1.2 * P);

    this.hamudi = this.add.container(w * 0.38, h * 0.47, [g]);
    this.hamudi.setSize(15 * P, 22 * P).setInteractive({ useHandCursor: true });
    this.hamudi.on("pointerdown", () => {
      const [hi, re] = Phaser.Math.RND.pick(SMALLTALK);
      this.exchange(hi, re);
    });
    // Nefes alma
    this.tweens.add({
      targets: this.hamudi,
      scaleY: 1.015,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  /** Ürün kartları — sağda dikey sıra (mor LED çerçeveli) */
  private createShelf(w: number, h: number) {
    const baseX = w * 0.72;
    const baseY = h * 0.33;
    const gap = Math.min(h * 0.15, 110);

    PRODUCTS.forEach((p, i) => {
      const y = baseY + i * gap;
      const card = this.add.container(baseX, y);
      const bg = this.add.graphics();
      bg.fillStyle(0x2a2432, 0.94);
      bg.fillRoundedRect(-80, -30, 160, 60, 10);
      bg.lineStyle(2, 0xb88ae8, 0.9);
      bg.strokeRoundedRect(-80, -30, 160, 60, 10);
      const icon = this.add.text(-54, 0, p.emoji, { fontSize: "26px" }).setOrigin(0.5);
      const name = this.add
        .text(-28, -11, p.name, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#f0e0ff",
        })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(-28, 11, `${p.price}c`, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#f2c53d",
        })
        .setOrigin(0, 0.5);
      const count = this.add
        .text(58, 0, "", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#b8e8b8",
        })
        .setOrigin(0.5);
      this.countTexts.set(p.key, count);
      card.add([bg, icon, name, price, count]);
      card.setSize(160, 60).setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => this.buy(p, card));
    });
    this.refreshCounts();
  }

  private createHud(w: number, h: number) {
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
    close.on("pointerdown", () => this.leave());

    const exit = this.add
      .text(w / 2, h - 16, "🚪 Leave — bahçeye dön", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#f0e0ff",
        backgroundColor: "#6a3a8acc",
        padding: { x: 16, y: 9 },
      })
      .setOrigin(0.5, 1)
      .setInteractive({ useHandCursor: true });
    exit.on("pointerdown", () => this.leave());
    this.tweens.add({
      targets: exit,
      alpha: 0.8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  // ---------- diyalog (Almanca) ----------

  /** Hamudi konuşur, kısa süre sonra Rebecca (ekran altından) cevap verir */
  private exchange(hamudiLine: string, rebeccaLine: string) {
    this.hamudiSay(hamudiLine);
    this.time.delayedCall(1400, () => this.rebeccaSay(rebeccaLine));
  }

  private hamudiSay(text: string) {
    this.hamudiBubble?.destroy();
    this.hamudiBubble = this.makeBubble(
      this.hamudi.x,
      this.hamudi.y - this.hamudi.height / 2 - 8,
      text,
      0xffffff
    );
  }

  /** Rebecca ekranda görünmüyor (POV) — sesi alttan gelir */
  private rebeccaSay(text: string) {
    this.rebeccaBubble?.destroy();
    this.rebeccaBubble = this.makeBubble(
      this.scale.width / 2,
      this.scale.height - 64,
      `Rebecca: ${text}`,
      0xffe8f4
    );
  }

  private makeBubble(x: number, y: number, text: string, tint: number) {
    const label = this.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#2a2030",
        align: "center",
        wordWrap: { width: Math.min(this.scale.width * 0.7, 300) },
      })
      .setOrigin(0.5, 1);
    const bw = label.width + 16;
    const bh = label.height + 12;
    const bg = this.add.graphics();
    bg.fillStyle(tint, 0.96);
    bg.fillRoundedRect(-bw / 2, -bh - 6, bw, bh, 8);
    bg.fillTriangle(-5, -6, 5, -6, 0, 2);
    label.setY(-12);
    const bubble = this.add.container(x, y, [bg, label]).setDepth(50);
    // Ekran dışına taşmasın
    const half = bw / 2;
    bubble.setX(Phaser.Math.Clamp(x, half + 6, this.scale.width - half - 6));
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: bubble,
        alpha: 0,
        duration: 300,
        onComplete: () => bubble.destroy(),
      });
    });
    return bubble;
  }

  // ---------- alışveriş ----------

  private buy(p: Product, card: Phaser.GameObjects.Container) {
    const coins = (this.registry.get("coins") as number) ?? 0;
    if (coins < p.price) {
      this.sfx.denied();
      this.hamudiSay(Phaser.Math.RND.pick(BROKE_LINES));
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
    this.hamudiSay(Phaser.Math.RND.pick(BUY_LINES));
    this.tweens.add({ targets: card, scale: 1.06, duration: 110, yoyo: true });
    const tag = this.add
      .text(card.x + 40, card.y - 28, `+1 ${p.emoji}`, {
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

  /** Çıkışta vedalaşıp kapanır */
  private leave() {
    if (this.closing) return;
    const [hi, re] = BYE_PAIR;
    this.hamudiSay(hi);
    this.time.delayedCall(900, () => this.rebeccaSay(re));
    this.time.delayedCall(1900, () => this.close());
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
