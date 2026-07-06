import Phaser from "phaser";
import { PLANTS } from "../data/plants";
import { audioEngine } from "../systems/AudioEngine";
import { Sfx } from "../systems/Sfx";

/** Sarma mini oyunu adımları */
const ROLL_STEPS = [
  "Paper out... Kağıdı ser 📄",
  "Sprinkle it... Serpiştir 🌿",
  "Roll & lick! Sar, yapıştır 👅",
];
const ROLL_BAR_W = 200;

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
  private sfx = new Sfx();
  // Sarma mini oyunu
  private rollPanel: Phaser.GameObjects.Container | null = null;
  private rollZone: Phaser.GameObjects.Rectangle | null = null;
  private rollTitle!: Phaser.GameObjects.Text;
  private rollCursor!: Phaser.GameObjects.Rectangle;
  private rollTarget!: Phaser.GameObjects.Rectangle;
  private rollDots: Phaser.GameObjects.Arc[] = [];
  private rollStep = 0;
  private rollT = 0; // 0..1 imleç konumu
  private rollDir = 1;
  private rollTargetStart = 0.4; // 0..1
  private rollTargetWidth = 0.22;
  private onRollDone: (() => void) | null = null;

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

    // Ses düğmesi — coin'in altında
    const muteBtn = this.add
      .text(10, 52, audioEngine.isMuted() ? "🔇" : "🔊", style)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    muteBtn.on("pointerdown", () => {
      audioEngine.unlock(); // dokunuş = ses iznini de aç
      audioEngine.setMuted(!audioEngine.isMuted());
      muteBtn.setText(audioEngine.isMuted() ? "🔇" : "🔊");
    });

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

  // ---------- sarma mini oyunu ----------

  /**
   * Timing bar: imleç sağa-sola gider, yeşil bölgedeyken dokun.
   * 3 başarılı adım = joint sarıldı → onDone (chill başlar).
   */
  startRollGame(onDone: () => void) {
    if (this.rollPanel) return;
    this.onRollDone = onDone;
    this.rollStep = 0;
    this.rollT = 0;
    this.rollDir = 1;
    this.registry.set("rolling", true);

    const w = this.scale.width;
    const h = this.scale.height;

    // Dokunuşları yakalayan tam ekran bölge (bahçe input'u registry ile kapalı)
    this.rollZone = this.add
      .rectangle(0, 0, w, h, 0x000000, 0.001)
      .setOrigin(0)
      .setDepth(19)
      .setInteractive();
    this.rollZone.on("pointerdown", () => this.tryRollTap());

    const panel = this.add.container(w / 2, h - 120).setDepth(20);

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2038, 0.94);
    bg.fillRoundedRect(-140, -52, 280, 104, 10);
    bg.lineStyle(2, 0x9a6ac8, 0.8);
    bg.strokeRoundedRect(-140, -52, 280, 104, 10);
    panel.add(bg);

    this.rollTitle = this.add
      .text(0, -34, ROLL_STEPS[0], {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#f0e0ff",
      })
      .setOrigin(0.5);
    panel.add(this.rollTitle);

    // Bar zemini
    const barBg = this.add
      .rectangle(0, 2, ROLL_BAR_W, 14, 0x1a1426)
      .setOrigin(0.5);
    panel.add(barBg);

    // Yeşil hedef bölge + imleç
    this.rollTarget = this.add
      .rectangle(0, 2, ROLL_BAR_W * this.rollTargetWidth, 14, 0x5ec850, 0.85)
      .setOrigin(0, 0.5);
    panel.add(this.rollTarget);
    this.rollCursor = this.add
      .rectangle(-ROLL_BAR_W / 2, 2, 4, 22, 0xffffff)
      .setOrigin(0.5);
    panel.add(this.rollCursor);

    // Adım noktaları
    this.rollDots = [];
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle((i - 1) * 18, 26, 4, 0x4a3a5e);
      panel.add(dot);
      this.rollDots.push(dot);
    }

    const hint = this.add
      .text(0, 42, "tap when the marker is in the green — yeşilde bas!", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#b8a8d0",
      })
      .setOrigin(0.5);
    panel.add(hint);

    // Vazgeç düğmesi
    const close = this.add
      .text(128, -40, "✕", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#d0c0e8",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev?: { stopPropagation?: () => void }) => {
      ev?.stopPropagation?.();
      this.cancelRollGame();
    });
    panel.add(close);

    this.rollPanel = panel;
    this.randomizeRollTarget();
  }

  cancelRollGame() {
    this.rollPanel?.destroy();
    this.rollZone?.destroy();
    this.rollPanel = null;
    this.rollZone = null;
    this.registry.set("rolling", false);
  }

  private randomizeRollTarget() {
    this.rollTargetWidth = 0.24 - this.rollStep * 0.04;
    this.rollTargetStart = Phaser.Math.FloatBetween(0.12, 0.84 - this.rollTargetWidth);
    this.rollTarget.setSize(ROLL_BAR_W * this.rollTargetWidth, 14);
    this.rollTarget.setX(-ROLL_BAR_W / 2 + ROLL_BAR_W * this.rollTargetStart);
  }

  private tryRollTap() {
    if (!this.rollPanel) return;
    const inTarget =
      this.rollT >= this.rollTargetStart &&
      this.rollT <= this.rollTargetStart + this.rollTargetWidth;
    if (!inTarget) {
      this.sfx.denied();
      this.tweens.add({
        targets: this.rollPanel,
        x: this.rollPanel.x + 5,
        duration: 45,
        yoyo: true,
        repeat: 3,
      });
      return;
    }
    this.sfx.coin();
    this.rollDots[this.rollStep].setFillStyle(0x5ec850);
    this.rollStep++;
    if (this.rollStep >= ROLL_STEPS.length) {
      this.rollTitle.setText("Perfect! 🌿✨");
      this.sfx.gift();
      const done = this.onRollDone;
      this.time.delayedCall(650, () => {
        this.cancelRollGame();
        done?.();
      });
      this.onRollDone = null;
      return;
    }
    this.rollTitle.setText(ROLL_STEPS[this.rollStep]);
    this.randomizeRollTarget();
  }

  private updateRollGame(delta: number) {
    if (!this.rollPanel || this.rollStep >= ROLL_STEPS.length) return;
    // İmleç ping-pong; her adımda biraz hızlanır
    const speed = 0.0009 * (1 + this.rollStep * 0.45);
    this.rollT += this.rollDir * speed * delta;
    if (this.rollT >= 1) {
      this.rollT = 1;
      this.rollDir = -1;
    } else if (this.rollT <= 0) {
      this.rollT = 0;
      this.rollDir = 1;
    }
    this.rollCursor.setX(-ROLL_BAR_W / 2 + ROLL_BAR_W * this.rollT);
  }

  update(_time: number, delta: number) {
    this.updateRollGame(delta);
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
