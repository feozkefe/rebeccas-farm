import Phaser from "phaser";
import { TILE, MAP_W } from "../data/mapLayout";
import type { PlantSystem } from "./PlantSystem";
import type { Sfx } from "./Sfx";

/**
 * Feyza — arada bahçeye gelip Rebecca'ya yardım eden sevgili.
 * Serbest ziyaret (Rebecca oynanabilir kalır): kapıdan girer, sular,
 * yan yana gelince kalpli öpüşme anı olur.
 * Bazen "beraber eve" gider: kısa bir cutscene — ikisi kapıdan kaybolur,
 * oyuncu bahçede kalır (Spicey gezinir), zaman hızlı geçer + romantik
 * müzik + kalpler, ~30 sn sonra dönerler.
 *
 * Diller: Rebecca + Feyza sıcak İngilizce/Türkçe karışık konuşur.
 */

type State =
  | "away"
  | "arriving"
  | "helping"
  | "leavingAlone"
  | "toGate"
  | "home"
  | "returning"
  | "toBench"
  | "atBench";

export interface FeyzaCtx {
  scene: Phaser.Scene;
  player: Phaser.Physics.Arcade.Sprite;
  plants: PlantSystem;
  sfx: Sfx;
  gateFront: () => Phaser.Math.Vector2;
  sayRebecca: (text: string) => void;
}

const ARRIVE = [
  "Hey love! Geldim 💕",
  "Surprise! Bahçede yardım lazım mı?",
  "Merhaba canım! Seni görmeye geldim.",
];
const GREET = [
  "Feyza! Canım geldi 🥰",
  "You're here! Özledim seni.",
  "Aa Feyza! Tam zamanında.",
];
const HELP = [
  "Let me help — ben sularım 💧",
  "Bunlar susamış, hallederim.",
  "Sen dinlen, ben bakarım.",
];
const KISS_F = ["Seni seviyorum 💕", "Öptüm seni 😚", "Canım benim."];
const KISS_R = ["Öptüm 😚", "I love you too 💕", "Aşkım 🥰"];
const HOME_F = ["Eve gidelim mi? 🏡", "Hadi eve, biraz sarılalım 💕"];
const HOME_R = ["Hadi... Spicey, sen bahçeye bak! 🐈", "Let's go home 💕 Spicey, görüşürüz!"];
const RETURN_R = ["We're back! Döndük 💕", "Ahh, iyi geldi. Neredeyse akşam olmuş!"];
const RETURN_F = ["That was nice 🥰", "Bahçe bize emanetti Spicey, aferin."];
const BYE_F = ["Kaçtım ben, görüşürüz! 💕", "Bye love! Sonra gelirim."];
const BYE_R = ["Bye canım! 💕", "Görüşürüz aşkım 🥰"];
const BENCH_F = [
  "Bana da sar bakiim 🌿💕",
  "Beraber içmek daha güzel.",
  "Geldim aşkım, kaydır bakalım.",
];

export class FeyzaSystem {
  private c: FeyzaCtx;
  private feyza!: Phaser.Physics.Arcade.Sprite;
  private state: State = "away";
  private visitTimer = 0; // sıradaki ziyarete kalan
  private stayTimer = 0; // ziyarette kalma süresi
  private helpTimer = 0; // sulama aksiyonu arası
  private kissCooldown = 0;
  private homeTimer = 0;
  private heartTimer = 0;
  private helpPlot: { tx: number; ty: number } | null = null;
  private firstVisitDone = false; // ilk gelişte beraber eve giderler
  private benchSeat: Phaser.Math.Vector2 | null = null; // bankta buluşma noktası
  private benchPuffTimer = 0;

  constructor(ctx: FeyzaCtx) {
    this.c = ctx;
    this.feyza = ctx.scene.physics.add
      .sprite(16 * TILE, 42 * TILE, "feyza")
      .setVisible(false)
      .setActive(false);
    this.feyza.body!.setSize(10, 8).setOffset(3, 15);
    this.visitTimer = Phaser.Math.Between(90_000, 160_000);
  }

  /** Öncelikli kilit: bir alt-sahne açıksa (Roll/Spati/Laundry) beklet. */
  private busyElsewhere() {
    return this.c.scene.registry.get("rolling") === true;
  }

  update(delta: number) {
    switch (this.state) {
      case "away":
        if (this.busyElsewhere() || this.chilling()) return;
        this.visitTimer -= delta;
        if (this.visitTimer <= 0) this.startArrive();
        break;
      case "arriving":
        if (this.busyElsewhere()) return;
        this.walkTo(this.feyza, this.playerVec(), 70);
        this.depth(this.feyza);
        if (this.near(this.feyza, this.playerVec(), 34)) {
          this.feyza.setVelocity(0);
          // İlk ziyaret: hemen beraber eve; sonrakiler: yardım döngüsü
          if (!this.firstVisitDone) {
            this.firstVisitDone = true;
            this.c.sayRebecca(Phaser.Math.RND.pick(GREET));
            this.startToGate();
          } else {
            this.beginHelping();
          }
        }
        break;
      case "helping":
        if (this.busyElsewhere()) {
          this.feyza.setVelocity(0);
          return;
        }
        this.updateHelping(delta);
        break;
      case "leavingAlone":
        this.walkTo(this.feyza, this.c.gateFront(), 70);
        this.depth(this.feyza);
        if (this.near(this.feyza, this.c.gateFront(), 12)) {
          this.hide();
          this.state = "away";
          this.visitTimer = Phaser.Math.Between(120_000, 240_000);
        }
        break;
      case "toGate":
        this.updateToGate();
        break;
      case "home":
        this.homeTimer -= delta;
        this.heartTimer -= delta;
        if (this.heartTimer <= 0) {
          this.spawnScreenHeart();
          this.heartTimer = Phaser.Math.Between(280, 520);
        }
        if (this.homeTimer <= 0) this.startReturn();
        break;
      case "returning":
        this.updateReturning();
        break;
      case "toBench":
        this.walkTo(this.feyza, this.benchSeat!, 66);
        this.depth(this.feyza);
        if (this.near(this.feyza, this.benchSeat!, 8)) {
          this.feyza.setPosition(this.benchSeat!.x, this.benchSeat!.y).setVelocity(0);
          this.state = "atBench";
          this.benchPuffTimer = 800;
          this.bubble(this.feyza, Phaser.Math.RND.pick(BENCH_F));
        }
        break;
      case "atBench":
        this.depth(this.feyza);
        this.benchPuffTimer -= delta;
        if (this.benchPuffTimer <= 0) {
          this.benchPuff();
          this.benchPuffTimer = Phaser.Math.Between(1400, 2400);
        }
        break;
    }
    // Feyza görünürse yürüyüş animasyonunu sür (bankta otururken hariç)
    if (this.feyza.visible && this.state !== "home" && this.state !== "atBench") {
      this.animateWalk(this.feyza);
    }
  }

  // ---------- bankta beraber weed (Rebecca çağırır) ----------

  /** Chill sırasında çağrılabilir mi? (evde/cutscene'de değilse) */
  canJoinBench() {
    return (
      this.state === "away" ||
      this.state === "helping" ||
      this.state === "arriving" ||
      this.state === "leavingAlone"
    );
  }

  atBenchNow() {
    return this.state === "atBench" || this.state === "toBench";
  }

  /** Rebecca çağırdı: Feyza gelip bankta yanına otursun. seat = yan koltuk. */
  comeToBench(seat: Phaser.Math.Vector2) {
    if (!this.canJoinBench()) return;
    this.benchSeat = seat.clone();
    if (!this.feyza.visible) {
      const gate = this.c.gateFront();
      this.feyza.setPosition(gate.x, gate.y).setVisible(true).setActive(true).setAlpha(1);
    }
    this.helpPlot = null;
    this.state = "toBench";
  }

  /** Chill bitti: Feyza banktan kalkıp gider. */
  leaveBench() {
    if (this.state === "atBench" || this.state === "toBench") {
      this.bubble(this.feyza, Phaser.Math.RND.pick(BYE_F));
      this.state = "leavingAlone";
    }
  }

  private benchPuff() {
    // İki minik duman + arada kalp (Rebecca + Feyza yan yana bankta)
    const xs = [this.feyza.x + 3, this.c.player.x + 3];
    for (const x of xs) {
      const puff = this.c.scene.add
        .circle(x, this.feyza.y - 8, 1.5, 0xcccccc, 0.7)
        .setDepth(100000);
      this.c.scene.tweens.add({
        targets: puff,
        y: puff.y - 12,
        alpha: 0,
        scale: 2.4,
        duration: 1100,
        onComplete: () => puff.destroy(),
      });
    }
    if (Phaser.Math.Between(0, 100) < 45) {
      const mx = (this.feyza.x + this.c.player.x) / 2;
      const heart = this.c.scene.add
        .text(mx, this.feyza.y - 10, "❤", { fontSize: "8px", color: "#ff5a8a" })
        .setOrigin(0.5)
        .setDepth(100000);
      this.c.scene.tweens.add({
        targets: heart,
        y: heart.y - 14,
        alpha: 0,
        duration: 1200,
        onComplete: () => heart.destroy(),
      });
    }
  }

  // ---------- durum geçişleri ----------

  private startArrive() {
    const gate = this.c.gateFront();
    this.feyza.setPosition(gate.x, gate.y).setVisible(true).setActive(true);
    this.feyza.setAlpha(0);
    this.c.scene.tweens.add({ targets: this.feyza, alpha: 1, duration: 400 });
    this.bubble(this.feyza, Phaser.Math.RND.pick(ARRIVE));
    this.state = "arriving";
  }

  private beginHelping() {
    this.c.sayRebecca(Phaser.Math.RND.pick(GREET));
    this.state = "helping";
    this.stayTimer = Phaser.Math.Between(55_000, 95_000);
    this.helpTimer = Phaser.Math.Between(4_000, 8_000);
    this.kissCooldown = 6_000;
    this.helpPlot = null;
  }

  private updateHelping(delta: number) {
    this.stayTimer -= delta;
    this.kissCooldown -= delta;
    this.depth(this.feyza);

    // Sulama görevi: sulanmamış ekine yürü, varınca sula
    if (this.helpPlot) {
      const target = new Phaser.Math.Vector2(
        this.helpPlot.tx * TILE + TILE / 2,
        this.helpPlot.ty * TILE + TILE + 6
      );
      this.walkTo(this.feyza, target, 62);
      if (this.near(this.feyza, target, 14)) {
        this.feyza.setVelocity(0);
        const plot = this.c.plants.getPlotAt(this.helpPlot.tx, this.helpPlot.ty);
        if (plot && this.c.plants.waterPlot(plot)) {
          this.c.sfx.water();
          this.waterSplash(target.x, this.helpPlot.ty * TILE + TILE / 2);
          this.bubble(this.feyza, Phaser.Math.RND.pick(HELP));
        }
        this.helpPlot = null;
        this.helpTimer = Phaser.Math.Between(6_000, 11_000);
      }
      return;
    }

    // Yan yana → öpüşme anı
    if (this.kissCooldown <= 0 && this.near(this.feyza, this.playerVec(), 22)) {
      this.feyza.setVelocity(0);
      this.kissMoment();
      this.kissCooldown = Phaser.Math.Between(12_000, 22_000);
    } else if (!this.near(this.feyza, this.playerVec(), 40)) {
      // Rebecca'dan uzaklaştıysa yanına yaklaş
      this.walkTo(this.feyza, this.playerVec(), 58);
    } else {
      this.feyza.setVelocity(0);
      this.helpTimer -= delta;
      if (this.helpTimer <= 0) {
        const plot = this.c.plants.randomUnwateredPlot();
        this.helpPlot = plot ? { tx: plot.tx, ty: plot.ty } : null;
        if (!this.helpPlot) this.helpTimer = Phaser.Math.Between(5_000, 9_000);
      }
    }

    // Ziyaret bitti: %45 beraber eve, yoksa yalnız ayrıl
    if (this.stayTimer <= 0) {
      if (Phaser.Math.Between(0, 100) < 45) this.startToGate();
      else this.startLeaveAlone();
    }
  }

  private startLeaveAlone() {
    this.bubble(this.feyza, Phaser.Math.RND.pick(BYE_F));
    this.c.sayRebecca(Phaser.Math.RND.pick(BYE_R));
    this.state = "leavingAlone";
  }

  private startToGate() {
    this.bubble(this.feyza, Phaser.Math.RND.pick(HOME_F));
    this.c.sayRebecca(Phaser.Math.RND.pick(HOME_R));
    this.c.scene.registry.set("cutscene", true); // bahçe input kilidi
    this.state = "toGate";
  }

  private updateToGate() {
    const gate = this.c.gateFront();
    const feyzaTarget = new Phaser.Math.Vector2(gate.x - 8, gate.y);
    const playerTarget = new Phaser.Math.Vector2(gate.x + 8, gate.y);
    this.walkTo(this.feyza, feyzaTarget, 60);
    this.walkTo(this.c.player, playerTarget, 60);
    this.animateWalk(this.c.player);
    this.depth(this.feyza);
    if (
      this.near(this.feyza, feyzaTarget, 12) &&
      this.near(this.c.player, playerTarget, 14)
    ) {
      this.feyza.setVelocity(0);
      this.c.player.setVelocity(0);
      this.startHome();
    }
  }

  private startHome() {
    // İkisi kapıdan kaybolur; oyuncu bahçede kalır
    this.c.scene.tweens.add({ targets: [this.feyza, this.c.player], alpha: 0, duration: 400 });
    this.c.scene.time.delayedCall(420, () => {
      this.feyza.setVisible(false).setActive(false);
      this.c.player.setVisible(false);
    });
    // Kamera bahçenin ortasında dursun (biz izleriz)
    const cam = this.c.scene.cameras.main;
    cam.stopFollow();
    cam.pan(19 * TILE, 20 * TILE, 800, "Sine.easeInOut");
    this.c.scene.registry.set("romantic", true); // romantik müzik
    this.homeTimer = 30_000;
    this.heartTimer = 0;
    // Zaman hızlı geçti: ekinler ilerlesin
    this.c.plants.fastForward(150_000);
    this.state = "home";
  }

  private startReturn() {
    this.c.scene.registry.set("romantic", false);
    const gate = this.c.gateFront();
    this.feyza.setPosition(gate.x - 8, gate.y).setVisible(true).setActive(true).setAlpha(0);
    this.c.player.setPosition(gate.x + 8, gate.y).setVisible(true).setAlpha(0);
    this.c.scene.tweens.add({
      targets: [this.feyza, this.c.player],
      alpha: 1,
      duration: 450,
    });
    this.c.sayRebecca(Phaser.Math.RND.pick(RETURN_R));
    this.state = "returning";
  }

  private updateReturning() {
    // Rebecca bahçeye döner (biraz içeri), Feyza vedalaşıp gider
    const inGarden = new Phaser.Math.Vector2(16 * TILE, 36 * TILE);
    this.walkTo(this.c.player, inGarden, 62);
    this.animateWalk(this.c.player);
    this.walkTo(this.feyza, this.c.gateFront(), 60);
    this.depth(this.feyza);
    const playerHome = this.near(this.c.player, inGarden, 16);
    if (playerHome) {
      this.c.player.setVelocity(0).setAlpha(1);
      // Kontrol geri: kamera Rebecca'yı takip etsin, kilit açılsın
      this.c.scene.cameras.main.startFollow(this.c.player, true, 0.12, 0.12);
      this.c.scene.registry.set("cutscene", false);
      this.bubble(this.feyza, Phaser.Math.RND.pick(RETURN_F));
      this.hide();
      this.state = "away";
      this.visitTimer = Phaser.Math.Between(150_000, 280_000);
    }
  }

  // ---------- efektler ----------

  private kissMoment() {
    this.c.sfx.purr();
    this.c.sayRebecca(Phaser.Math.RND.pick(KISS_R));
    this.bubble(this.feyza, Phaser.Math.RND.pick(KISS_F), 1400);
    const mx = (this.feyza.x + this.c.player.x) / 2;
    const my = (this.feyza.y + this.c.player.y) / 2 - 8;
    for (let i = 0; i < 6; i++) {
      const heart = this.c.scene.add
        .text(mx + Phaser.Math.Between(-6, 6), my, "❤", {
          fontSize: "9px",
          color: "#ff5a8a",
        })
        .setOrigin(0.5)
        .setDepth(100000);
      this.c.scene.tweens.add({
        targets: heart,
        y: my - Phaser.Math.Between(14, 26),
        x: heart.x + Phaser.Math.Between(-8, 8),
        alpha: 0,
        scale: 1.4,
        duration: Phaser.Math.Between(900, 1400),
        delay: i * 90,
        onComplete: () => heart.destroy(),
      });
    }
    // İki karakter birbirine minik zıplama
    for (const s of [this.feyza, this.c.player]) {
      this.c.scene.tweens.add({
        targets: s,
        y: s.y - 3,
        duration: 160,
        yoyo: true,
        ease: "Quad.out",
      });
    }
  }

  private waterSplash(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const drop = this.c.scene.add
        .circle(x + Phaser.Math.Between(-4, 4), y - 4, 1, 0x8fb8dd)
        .setDepth(100000);
      this.c.scene.tweens.add({
        targets: drop,
        y: drop.y + Phaser.Math.Between(4, 9),
        alpha: 0,
        duration: 420,
        delay: i * 40,
        onComplete: () => drop.destroy(),
      });
    }
  }

  /** "home" sırasında ekranda süzülen kalpler */
  private spawnScreenHeart() {
    const cam = this.c.scene.cameras.main;
    const v = cam.worldView;
    const heart = this.c.scene.add
      .text(
        Phaser.Math.Between(v.x + 10, v.x + v.width - 10),
        v.y + v.height + 6,
        Phaser.Math.RND.pick(["❤", "💕", "💗"]),
        { fontSize: "12px", color: "#ff5a8a" }
      )
      .setOrigin(0.5)
      .setDepth(100000);
    this.c.scene.tweens.add({
      targets: heart,
      y: v.y - 10,
      x: heart.x + Phaser.Math.Between(-20, 20),
      alpha: 0,
      duration: Phaser.Math.Between(3200, 5200),
      ease: "Sine.easeInOut",
      onComplete: () => heart.destroy(),
    });
  }

  // ---------- yardımcılar ----------

  private hide() {
    this.feyza.setVisible(false).setActive(false).setVelocity(0);
  }

  private playerVec() {
    return new Phaser.Math.Vector2(this.c.player.x, this.c.player.y);
  }

  private near(s: Phaser.GameObjects.Sprite, p: Phaser.Math.Vector2, d: number) {
    return Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) < d;
  }

  private walkTo(
    s: Phaser.Physics.Arcade.Sprite,
    p: Phaser.Math.Vector2,
    speed: number
  ) {
    if (this.near(s, p, 4)) {
      s.setVelocity(0);
      return;
    }
    this.c.scene.physics.moveTo(s, p.x, p.y, speed);
  }

  private animateWalk(s: Phaser.Physics.Arcade.Sprite) {
    const key = s === this.feyza ? "feyza-walk" : "walk";
    const idle = s === this.feyza ? "feyza" : "player";
    const v = s.body!.velocity;
    if (v.length() > 1) {
      s.anims.play(key, true);
      if (Math.abs(v.x) > 10) s.setFlipX(v.x < 0);
    } else if (s.anims.isPlaying) {
      s.anims.stop();
      s.setTexture(idle);
    }
  }

  private depth(s: Phaser.GameObjects.Sprite) {
    s.setDepth(s.y + 12);
  }

  private chilling() {
    return this.c.scene.registry.get("chilling") === true;
  }

  /** Feyza'nın üstünde konuşma balonu (kısa) */
  private bubble(sprite: Phaser.GameObjects.Sprite, text: string, ms = 2600) {
    const label = this.c.scene.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#333333",
        align: "center",
        wordWrap: { width: 96 },
      })
      .setOrigin(0.5, 1);
    const w = label.width + 8;
    const h = label.height + 6;
    const bg = this.c.scene.add.graphics();
    bg.fillStyle(0xffe8f2, 0.96);
    bg.fillRoundedRect(-w / 2, -h - 3, w, h, 3);
    bg.fillTriangle(-3, -3, 3, -3, 0, 1);
    label.setY(-6);
    const cont = this.c.scene.add
      .container(sprite.x, sprite.y - 14, [bg, label])
      .setDepth(100001);
    // MAP sınırları içine sıkıştır
    cont.setX(Phaser.Math.Clamp(sprite.x, w / 2 + 4, MAP_W * TILE - w / 2 - 4));
    this.c.scene.tweens.add({
      targets: cont,
      alpha: 0,
      delay: ms,
      duration: 300,
      onComplete: () => cont.destroy(),
    });
  }
}
