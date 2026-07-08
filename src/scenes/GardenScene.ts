import Phaser from "phaser";
import {
  TILE,
  MAP_W,
  MAP_H,
  buildGround,
  buildEdgeObjects,
  buildPlotTiles,
  MAP_OBJECTS,
} from "../data/mapLayout";
import { PlantSystem, type Plot, type InteractResult } from "../systems/PlantSystem";
import { SaveSystem } from "../systems/SaveSystem";
import { Sfx } from "../systems/Sfx";
import { Music } from "../systems/Music";
import { audioEngine } from "../systems/AudioEngine";

const PLAYER_SPEED = 80;
const CAT_NAME = "Spicey";
const BENCH_TILE = { tx: 8, ty: 6 }; // terasta, gazebonun yanı

/** Rebecca'nın boş boş gezerken söyledikleri — İngilizce + arada B2 Türkçe karışık */
const IDLE_LINES = [
  "What a lovely day!",
  "Hava çok güzel bugün, değil mi?",
  `${CAT_NAME}, where are you? Neredesin?`,
  "I love this garden. Bahçem benim canım bahçem.",
  "Berlin summer... the grass is so dry. Çim yine kurumuş maalesef.",
  "Maybe some tea later. Ya da kahve. Kahve daha iyi.",
  "So peaceful here... Çok huzurlu.",
  "The tomatoes smell amazing. Domates kokusu harika bir şey.",
];

const LINES = {
  plant: (name: string) => [
    `Grow well, little ${name}!`,
    `Planting ${name}. Büyü çabuk, tamam mı?`,
    `A new ${name}! Hadi bakalım.`,
  ],
  water: () => [
    "There you go, some water!",
    "Su zamanı! Water time!",
    "Drink up, canım.",
  ],
  harvest: (name: string) => [
    `Fresh ${name}! Look at that!`,
    `${name} hazır! So beautiful.`,
    `Mmm, ${name}. Çok güzel oldu bu.`,
  ],
  growing: () => [
    "Still growing... patience!",
    "Sabır, sabır. It needs time.",
    "Not ready yet. Daha hazır değil.",
  ],
  noCoins: () => [
    "Not enough coins... Param yok maalesef.",
    "I need more coins. Önce hasat, sonra tohum.",
  ],
  cat: () => [
    `${CAT_NAME}! Seni seviyorum kedicik!`,
    `Who's a good cat? ${CAT_NAME}, sen misin?`,
    `${CAT_NAME}, gel buraya! Come here!`,
    "Such a pretty calico. Çok tatlısın sen.",
  ],
  catAsleep: () => [
    `Shhh... ${CAT_NAME} is sleeping. Uyuyor, rahatsız etme.`,
    "Sweet dreams, kedicik.",
  ],
  chillStart: () => [
    "Time to chill... Biraz keyif zamanı.",
    "Rolling one... Şimdi dinlenmek lazım.",
    "Ahh, perfect spot. En sevdiğim köşe.",
  ],
  chillVibe: () => [
    "So relaxing... Çok rahatım şu an.",
    "The plants grow faster when I'm happy. Bilimsel gerçek.",
    "Look at the sky... Gökyüzü ne güzel.",
  ],
  rainStart: () => [
    "Berlin rain! No watering needed. Yağmur her şeyi sular.",
    "Here comes the rain... Yağmur yağıyor, süper.",
    "Free water from the sky! Bedava su!",
  ],
  catDig: () => [
    `${CAT_NAME}! Not the plants! Yaramaz kedi!`,
    `Hey! ${CAT_NAME}, o yatak senin değil!`,
    `${CAT_NAME}iiii! My poor tomatoes... Of ya.`,
  ],
  catGift: () => [
    `${CAT_NAME} brought a gift! Bir hediye mi o? +5c`,
    `A present from ${CAT_NAME}! ...is that a leaf? Neyse, sağol kedicik. +5c`,
    `${CAT_NAME}, canım benim! What did you bring? +5c`,
  ],
  noPapers: () => [
    "No papers left... Kağıt bitti. Kulübede vardır belki?",
    "Hmm, out of papers. Späti'ye gitmek lazım ama... önce kulübeye bakayım.",
  ],
  buyPaper: () => [
    "Found papers in the shed! Kulübede kağıt varmış. -3c",
    "There we go, papers! Şanslıyım bugün. -3c",
  ],
};

/**
 * Ana bahçe sahnesi — yerleşim reference/garden/ fotoğraflarından.
 * Tap-to-move + bağlamsal aksiyon: plota dokun → Rebecca oraya yürür,
 * varınca eker/sular/hasat eder. Bankta chill mode (büyüme 2x).
 * Durum localStorage'a kaydedilir; kapalıyken büyüme devam eder.
 */
export class GardenScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cat!: Phaser.Physics.Arcade.Sprite;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private pendingPlot: Plot | null = null;
  private pendingBench = false;
  private pendingShed = false;
  private shed: Phaser.GameObjects.Image | null = null;
  private catTimer = 0;
  private catAsleep = false;
  private catZzz: Phaser.Time.TimerEvent | null = null;
  private idleTimer = 0;
  private chillNoteTimer = 0;
  private plants!: PlantSystem;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleEvent: Phaser.Time.TimerEvent | null = null;
  private sfx = new Sfx();
  private music = new Music(() => this.isChilling());
  // Yağmur
  private raining = false;
  private nextRainAt = 0;
  private rainEndsAt = 0;
  private rainWaterTimer = 0;
  // Kedi yaramazlığı / hediyesi
  private mischiefTimer = 0;
  private mischiefMode: "dig" | "gift" | null = null;
  private mischiefPlot: Plot | null = null;

  constructor() {
    super("Garden");
  }

  create() {
    const save = SaveSystem.load();
    this.registry.set("coins", save?.coins ?? 20);
    this.registry.set("seedIndex", save?.seedIndex ?? 0);
    this.registry.set("papers", save?.papers ?? 3);
    this.registry.set("chilling", false);
    this.registry.set("rolling", false);
    this.registry.set("raining", false);
    this.nextRainAt = Date.now() + Phaser.Math.Between(120_000, 300_000);
    this.mischiefTimer = Phaser.Math.Between(60_000, 120_000);

    const soilImages = this.createGround();
    this.createObjects();
    this.createBench();
    this.createPlayer();
    this.createCat();
    this.setupCamera();
    this.plants = new PlantSystem(this, buildPlotTiles(), soilImages);
    if (save) this.plants.restore(save.crops);
    this.setupInput();
    this.setupAutosave();
    this.setupAudio();
    this.scene.launch("UI");
    this.resetIdleTimer();
  }

  /** Tarayıcı sesi ilk dokunuşta açar; müzik de o anda başlar. */
  private setupAudio() {
    audioEngine.loadMutePreference();
    this.input.on("pointerdown", () => audioEngine.unlock());
    this.music.start();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music.stop());
  }

  // ---------- kurulum ----------

  /** Zemini çizer; plot olabilecek toprak tile'larının image'larını döndürür. */
  private createGround(): Map<string, Phaser.GameObjects.Image> {
    const grid = buildGround();
    const soilImages = new Map<string, Phaser.GameObjects.Image>();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const img = this.add
          .image(x * TILE, y * TILE, grid[y][x])
          .setOrigin(0)
          .setDepth(0);
        if (grid[y][x] === "soil") soilImages.set(`${x},${y}`, img);
      }
    }
    return soilImages;
  }

  private createObjects() {
    for (const obj of [...MAP_OBJECTS, ...buildEdgeObjects()]) {
      const img = this.add
        .image(obj.tx * TILE, obj.ty * TILE, obj.texture)
        .setOrigin(obj.originX ?? 0, obj.originY ?? 0);
      img.setDepth(img.y + img.displayHeight);
      // Kulübe: dokununca kağıt satın al (ileride gerçek Späti sahnesi olacak)
      if (obj.texture === "shed") {
        this.shed = img;
        img.setInteractive({ useHandCursor: true });
        img.on("pointerdown", () => this.buyPaperFromShed(img));
      }
    }
  }

  /** Kulübeden sarma kağıdı: 3c. Uzaksa önce oraya yürür. */
  private buyPaperFromShed(shed: Phaser.GameObjects.Image) {
    if (this.registry.get("rolling")) return;
    const front = new Phaser.Math.Vector2(
      shed.x + shed.displayWidth / 2,
      shed.y + shed.displayHeight + 6
    );
    if (!this.playerNear(front, 30)) {
      this.pendingPlot = null;
      this.pendingBench = false;
      this.pendingShed = true;
      this.moveTarget = front;
      this.physics.moveTo(this.player, front.x, front.y, PLAYER_SPEED);
      return;
    }
    const coins = (this.registry.get("coins") as number) ?? 0;
    if (coins < 3) {
      this.sfx.denied();
      this.showBubble(Phaser.Math.RND.pick(LINES.noCoins()));
      return;
    }
    this.registry.set("coins", coins - 3);
    this.registry.set("papers", ((this.registry.get("papers") as number) ?? 0) + 1);
    this.sfx.coin();
    this.showBubble(Phaser.Math.RND.pick(LINES.buyPaper()));
    this.saveNow();
    this.resetIdleTimer();
  }

  private createBench() {
    const bench = this.add
      .image(BENCH_TILE.tx * TILE, BENCH_TILE.ty * TILE, "bench")
      .setOrigin(0);
    bench.setDepth(bench.y + bench.displayHeight);
    bench.setInteractive({ useHandCursor: true });
    bench.on("pointerdown", () => {
      if (this.registry.get("rolling") || this.isChilling()) return;
      this.pendingBench = true;
      this.pendingPlot = null;
      const target = this.benchSeat();
      if (this.playerNear(target, 20)) {
        this.moveTarget = null;
        this.player.setVelocity(0);
        this.beginRolling();
      } else {
        this.moveTarget = target;
        this.physics.moveTo(this.player, target.x, target.y, PLAYER_SPEED);
      }
    });
  }

  /** Bankın oturma noktası (dünya koordinatı) */
  private benchSeat() {
    return new Phaser.Math.Vector2(
      BENCH_TILE.tx * TILE + 16,
      BENCH_TILE.ty * TILE + 6
    );
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(16 * TILE, 40 * TILE, "player");
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(TILE, TILE, (MAP_W - 2) * TILE, (MAP_H - 2) * TILE);
  }

  private createCat() {
    this.cat = this.physics.add.sprite(22 * TILE, 20 * TILE, "cat");
    this.cat.setCollideWorldBounds(true);
    this.cat.setInteractive();
    this.cat.on("pointerdown", () => this.petCat());
  }

  /**
   * Ekran boyutuna göre zoom: kısa kenarda ~20 tile görünsün.
   * Telefonda (390px) ~1.5x, masaüstünde ~3x. Boyut değişince yeniden hesaplanır.
   */
  private computeZoom() {
    const short = Math.min(this.scale.width, this.scale.height);
    const ideal = short / (TILE * 20);
    return Phaser.Math.Clamp(Math.round(ideal * 4) / 4, 1.5, 3);
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setBounds(0, -TILE * 3, MAP_W * TILE, (MAP_H + 3) * TILE);
    cam.setZoom(this.computeZoom());
    this.scale.on("resize", () => cam.setZoom(this.computeZoom()));
  }

  private setupInput() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Sarma mini oyunu açıkken dokunuşlar oyun paneline gider
      if (this.registry.get("rolling")) return;
      const world = pointer.positionToCamera(
        this.cameras.main
      ) as Phaser.Math.Vector2;
      const tx = Math.floor(world.x / TILE);
      const ty = Math.floor(world.y / TILE);

      const plot = this.plants.getPlotAt(tx, ty);
      this.pendingPlot = plot ?? null;
      if (plot) this.pendingBench = false;
      // Plota dokunulduysa hedef plotun hemen altı (toprağı ezmesin)
      const target = plot
        ? new Phaser.Math.Vector2(tx * TILE + TILE / 2, (ty + 1) * TILE + 6)
        : new Phaser.Math.Vector2(world.x, world.y);

      if (plot && this.playerNear(target, 24)) {
        this.moveTarget = null;
        this.player.setVelocity(0);
        this.resolvePlotAction(plot);
        return;
      }
      this.moveTarget = target;
      this.physics.moveTo(this.player, target.x, target.y, PLAYER_SPEED);
    });
  }

  private setupAutosave() {
    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => this.saveNow(),
    });
    // Sekme kapanırken / arka plana düşerken son durumu yaz
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.saveNow();
    });
  }

  private saveNow() {
    SaveSystem.save({
      coins: (this.registry.get("coins") as number) ?? 0,
      seedIndex: (this.registry.get("seedIndex") as number) ?? 0,
      papers: (this.registry.get("papers") as number) ?? 0,
      crops: this.plants.serialize(),
      savedAt: Date.now(),
    });
  }

  // ---------- aksiyonlar ----------

  private playerNear(point: Phaser.Math.Vector2, dist: number) {
    return (
      Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y) <
      dist
    );
  }

  private resolvePlotAction(plot: Plot) {
    const result: InteractResult = this.plants.interact(plot);
    const name = result.def.name;
    const pick = (arr: string[]) => Phaser.Math.RND.pick(arr);
    switch (result.action) {
      case "plant":
        this.sfx.plant();
        this.showBubble(pick(LINES.plant(name)));
        break;
      case "water":
        this.sfx.water();
        this.showBubble(pick(LINES.water()));
        break;
      case "harvest":
        this.sfx.harvest();
        this.sfx.coin();
        this.showBubble(`${pick(LINES.harvest(name))} +${result.earned}c`);
        break;
      case "growing":
        this.showBubble(pick(LINES.growing()));
        break;
      case "noCoins":
        this.sfx.denied();
        this.showBubble(pick(LINES.noCoins()));
        break;
    }
    this.saveNow();
    this.resetIdleTimer();
  }

  private petCat() {
    this.sfx.purr();
    const heart = this.add
      .text(this.cat.x, this.cat.y - 10, "❤", { fontSize: "10px" })
      .setOrigin(0.5)
      .setDepth(10000);
    this.tweens.add({
      targets: heart,
      y: heart.y - 15,
      alpha: 0,
      duration: 800,
      onComplete: () => heart.destroy(),
    });
    if (this.playerNear(new Phaser.Math.Vector2(this.cat.x, this.cat.y), 48)) {
      this.showBubble(
        Phaser.Math.RND.pick(this.catAsleep ? LINES.catAsleep() : LINES.cat())
      );
      this.resetIdleTimer();
    }
  }

  /** Banka otur → oyuncu gözünden sarma sahnesi; sarınca chill başlar. */
  private beginRolling() {
    if (this.isChilling() || this.registry.get("rolling")) return;
    const papers = (this.registry.get("papers") as number) ?? 0;
    if (papers <= 0) {
      this.showBubble(Phaser.Math.RND.pick(LINES.noPapers()));
      this.resetIdleTimer();
      return;
    }
    const seat = this.benchSeat();
    this.player.setPosition(seat.x, seat.y - 6); // banka otur
    this.player.setVelocity(0);
    this.moveTarget = null;
    this.showBubble(Phaser.Math.RND.pick(LINES.chillStart()));
    this.resetIdleTimer();
    this.scene.launch("Roll", {
      onDone: () => {
        this.registry.set(
          "papers",
          Math.max(0, ((this.registry.get("papers") as number) ?? 1) - 1)
        );
        this.startChill();
        this.saveNow();
      },
    });
  }

  /** Joint sarıldı → duman → chill mode (oturduğu sürece büyüme 2x) */
  private startChill() {
    if (this.isChilling()) return;
    this.resetIdleTimer();

    // Sarma + minik duman bulutları
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(600 + i * 700, () => {
        if (!this.isChilling()) return;
        const puff = this.add
          .circle(this.player.x + 5, this.player.y - 6, 1.5, 0xcccccc, 0.8)
          .setDepth(10000);
        this.tweens.add({
          targets: puff,
          y: puff.y - 10,
          alpha: 0,
          scale: 2.5,
          duration: 1200,
          onComplete: () => puff.destroy(),
        });
      });
    }

    this.registry.set("chilling", true);
  }

  /** Banktan kalkınca chill biter */
  private endChill() {
    this.registry.set("chilling", false);
    this.showBubble(
      Phaser.Math.RND.pick([
        "Okay, back to the garden! Hadi işe.",
        "That was nice. Çok iyi geldi.",
      ])
    );
    this.resetIdleTimer();
  }

  private isChilling() {
    return (this.registry.get("chilling") as boolean) ?? false;
  }

  // ---------- konuşma balonu ----------

  private showBubble(text: string) {
    this.bubble?.destroy();
    this.bubbleEvent?.remove();

    const label = this.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#333333",
        align: "center",
        wordWrap: { width: 90 },
      })
      .setOrigin(0.5, 1);

    const w = label.width + 8;
    const h = label.height + 6;
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-w / 2, -h - 3, w, h, 3);
    bg.fillTriangle(-3, -3, 3, -3, 0, 1); // konuşma oku
    label.setY(-6);

    this.bubble = this.add.container(0, 0, [bg, label]).setDepth(100000);
    this.positionBubble();

    this.bubbleEvent = this.time.delayedCall(3000, () => {
      if (!this.bubble) return;
      this.tweens.add({
        targets: this.bubble,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.bubble?.destroy();
          this.bubble = null;
        },
      });
    });
  }

  private positionBubble() {
    this.bubble?.setPosition(this.player.x, this.player.y - 12);
  }

  private resetIdleTimer() {
    this.idleTimer = Phaser.Math.Between(18_000, 40_000);
  }

  // ---------- update döngüsü ----------

  update(_time: number, delta: number) {
    this.updatePlayerMovement();
    this.updateWalkAnimation();
    this.updateCat(delta);
    this.updateMischief(delta);
    this.updateIdleChatter(delta);
    this.updateChillNotes(delta);
    this.updateRain();
    // Banktan kalkınca (uzaklaşınca) chill biter
    if (this.isChilling() && !this.playerNear(this.benchSeat(), 14)) {
      this.endChill();
    }
    this.plants.update();
    this.positionBubble();
    this.player.setDepth(this.player.y + this.player.displayHeight / 2);
    this.cat.setDepth(this.cat.y + this.cat.displayHeight / 2);
  }

  // ---------- Berlin yağmuru ----------

  private updateRain() {
    const now = Date.now();
    if (!this.raining) {
      if (now >= this.nextRainAt) this.startRain();
      return;
    }
    if (now >= this.rainEndsAt) {
      this.stopRain();
      return;
    }
    // Damlalar: kamera görüş alanına her karede birkaç tane
    const view = this.cameras.main.worldView;
    for (let i = 0; i < 3; i++) {
      const drop = this.add
        .rectangle(
          Phaser.Math.Between(view.x, view.x + view.width),
          Phaser.Math.Between(view.y - 10, view.y + view.height - 20),
          1,
          5,
          0xa8c8e8,
          0.7
        )
        .setDepth(50000);
      this.tweens.add({
        targets: drop,
        y: drop.y + 40,
        alpha: 0.15,
        duration: 350,
        onComplete: () => drop.destroy(),
      });
    }
    // Yağmur sürerken yeni ekilenler de sulansın
    this.rainWaterTimer -= this.game.loop.delta;
    if (this.rainWaterTimer <= 0) {
      this.plants.waterAll();
      this.rainWaterTimer = 4000;
    }
  }

  private startRain() {
    this.raining = true;
    this.registry.set("raining", true);
    this.rainEndsAt = Date.now() + Phaser.Math.Between(35_000, 70_000);
    this.rainWaterTimer = 0;
    this.sfx.rain();
    this.showBubble(Phaser.Math.RND.pick(LINES.rainStart()));
    this.resetIdleTimer();
  }

  private stopRain() {
    this.raining = false;
    this.registry.set("raining", false);
    this.nextRainAt = Date.now() + Phaser.Math.Between(180_000, 420_000);
  }

  // ---------- kedi yaramazlığı / hediyesi ----------

  private updateMischief(delta: number) {
    if (this.catAsleep) return;

    // Hedefe yürüme aşaması
    if (this.mischiefMode) {
      const target =
        this.mischiefMode === "dig" && this.mischiefPlot
          ? new Phaser.Math.Vector2(
              this.mischiefPlot.tx * TILE + TILE / 2,
              this.mischiefPlot.ty * TILE + TILE / 2
            )
          : new Phaser.Math.Vector2(this.player.x, this.player.y);
      const dist = Phaser.Math.Distance.Between(
        this.cat.x,
        this.cat.y,
        target.x,
        target.y
      );
      if (dist < (this.mischiefMode === "dig" ? 8 : 20)) {
        this.cat.setVelocity(0);
        this.resolveMischief();
      } else {
        this.physics.moveTo(this.cat, target.x, target.y, 55);
      }
      return;
    }

    this.mischiefTimer -= delta;
    if (this.mischiefTimer > 0) return;

    if (Phaser.Math.Between(0, 100) < 35) {
      this.mischiefMode = "gift";
    } else {
      this.mischiefPlot = this.plants.randomWateredPlot();
      if (this.mischiefPlot) {
        this.mischiefMode = "dig";
      } else {
        this.mischiefTimer = Phaser.Math.Between(30_000, 60_000);
      }
    }
  }

  private resolveMischief() {
    if (this.mischiefMode === "dig" && this.mischiefPlot) {
      this.plants.unwater(this.mischiefPlot);
      this.sfx.dig();
      // Toprak parçacıkları saçılır
      for (let i = 0; i < 6; i++) {
        const dirt = this.add
          .circle(
            this.cat.x + Phaser.Math.Between(-4, 4),
            this.cat.y + Phaser.Math.Between(-2, 2),
            1.2,
            0x7a4e33
          )
          .setDepth(10000);
        this.tweens.add({
          targets: dirt,
          x: dirt.x + Phaser.Math.Between(-10, 10),
          y: dirt.y - Phaser.Math.Between(4, 10),
          alpha: 0,
          duration: 500,
          onComplete: () => dirt.destroy(),
        });
      }
      this.showBubble(Phaser.Math.RND.pick(LINES.catDig()));
    } else if (this.mischiefMode === "gift") {
      const coins = (this.registry.get("coins") as number) ?? 0;
      this.registry.set("coins", coins + 5);
      this.sfx.gift();
      const heart = this.add
        .text(this.cat.x, this.cat.y - 10, "🎁", { fontSize: "8px" })
        .setOrigin(0.5)
        .setDepth(10000);
      this.tweens.add({
        targets: heart,
        y: heart.y - 14,
        alpha: 0,
        duration: 1200,
        onComplete: () => heart.destroy(),
      });
      this.showBubble(Phaser.Math.RND.pick(LINES.catGift()));
      this.saveNow();
    }
    this.mischiefMode = null;
    this.mischiefPlot = null;
    this.mischiefTimer = Phaser.Math.Between(60_000, 150_000);
    this.catTimer = Phaser.Math.Between(2000, 5000);
    this.resetIdleTimer();
  }

  private updatePlayerMovement() {
    if (!this.moveTarget) return;
    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.moveTarget.x,
      this.moveTarget.y
    );
    if (dist < 4) {
      this.player.setVelocity(0);
      this.moveTarget = null;
      if (this.pendingPlot) {
        this.resolvePlotAction(this.pendingPlot);
        this.pendingPlot = null;
      } else if (this.pendingBench) {
        this.pendingBench = false;
        this.beginRolling();
      } else if (this.pendingShed) {
        this.pendingShed = false;
        if (this.shed) this.buyPaperFromShed(this.shed);
      }
    }
  }

  private updateWalkAnimation() {
    const v = this.player.body!.velocity;
    if (v.length() > 1) {
      this.player.anims.play("walk", true);
      if (Math.abs(v.x) > 10) this.player.setFlipX(v.x < 0);
    } else if (this.player.anims.isPlaying) {
      this.player.anims.stop();
      this.player.setTexture("player");
    }
  }

  /** Kedi: dolaş → dinlen → arada kıvrılıp uyu (Zzz) */
  private updateCat(delta: number) {
    if (this.mischiefMode) return; // yaramazlık sırasında kontrol updateMischief'te
    this.catTimer -= delta;
    if (this.catTimer > 0) return;

    if (this.catAsleep) {
      // Uyandı
      this.catAsleep = false;
      this.cat.setTexture("cat");
      this.catZzz?.remove();
      this.catZzz = null;
      this.catTimer = Phaser.Math.Between(1000, 3000);
      return;
    }

    if (this.cat.body!.velocity.length() > 0) {
      // Yürüyüş bitti → dinlen ya da uyu
      this.cat.setVelocity(0);
      if (Phaser.Math.Between(0, 100) < 35) {
        this.fallAsleep();
      } else {
        this.catTimer = Phaser.Math.Between(2000, 6000);
      }
    } else {
      const tx = Phaser.Math.Between(3, MAP_W - 3) * TILE;
      const ty = Phaser.Math.Between(10, MAP_H - 3) * TILE;
      this.physics.moveTo(this.cat, tx, ty, 40);
      this.catTimer = Phaser.Math.Between(1000, 3000);
    }
  }

  private fallAsleep() {
    this.catAsleep = true;
    this.cat.setTexture("cat_sleep");
    this.catTimer = Phaser.Math.Between(10_000, 20_000);
    // Süzülen Zzz'ler
    this.catZzz = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        const z = this.add
          .text(this.cat.x + 6, this.cat.y - 8, "z", {
            fontFamily: "monospace",
            fontSize: "8px",
            color: "#7a8ac8",
          })
          .setOrigin(0.5)
          .setDepth(10000);
        this.tweens.add({
          targets: z,
          y: z.y - 10,
          x: z.x + 3,
          alpha: 0,
          duration: 1400,
          onComplete: () => z.destroy(),
        });
      },
    });
  }

  private updateIdleChatter(delta: number) {
    this.idleTimer -= delta;
    if (this.idleTimer <= 0) {
      this.showBubble(
        Phaser.Math.RND.pick(this.isChilling() ? LINES.chillVibe() : IDLE_LINES)
      );
      this.resetIdleTimer();
    }
  }

  /** Chill sırasında oyuncunun etrafında süzülen notalar/pırıltılar */
  private updateChillNotes(delta: number) {
    if (!this.isChilling()) return;
    this.chillNoteTimer -= delta;
    if (this.chillNoteTimer > 0) return;
    this.chillNoteTimer = Phaser.Math.Between(800, 1600);
    const note = this.add
      .text(
        this.player.x + Phaser.Math.Between(-12, 12),
        this.player.y - 4,
        Phaser.Math.RND.pick(["♪", "♫", "✿", "~"]),
        { fontFamily: "monospace", fontSize: "8px", color: "#c8a0e8" }
      )
      .setOrigin(0.5)
      .setDepth(10000);
    this.tweens.add({
      targets: note,
      y: note.y - 14,
      alpha: 0,
      duration: 1800,
      onComplete: () => note.destroy(),
    });
  }
}
