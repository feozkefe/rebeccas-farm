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
import { SaveSystem, type LaundryState } from "../systems/SaveSystem";
import { Sfx } from "../systems/Sfx";
import { Music } from "../systems/Music";
import { FeyzaSystem } from "../systems/FeyzaSystem";
import { DecorationSystem } from "../systems/DecorationSystem";
import { audioEngine } from "../systems/AudioEngine";

const PLAYER_SPEED = 80;
const CAT_NAME = "Spicey";
const BENCH_TILE = { tx: 8, ty: 6 }; // terasta, gazebonun yanı
const LAUNDRY_DRY_MS = 3 * 60_000; // kuruma süresi
const LAUNDRY_BASKET_MS = 5 * 60_000; // yeni sepetin gelme aralığı

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
  catHunt: () => [
    `Shhh... ${CAT_NAME} saw a bug. Avcı modu: açık.`,
    `${CAT_NAME} is hunting! Pür dikkat kesildi.`,
    `Watch out little fly... ${CAT_NAME} geliyor.`,
  ],
  catBugThanks: () => [
    "A fly?! For me? Teşekkürler Spicey... çok naziksin. +1c",
    "Danke, Spicey! ...ew. But thank you, kedicik. +1c",
    `Best hunter in Berlin! Aferin ${CAT_NAME}! +1c`,
    "Ohh bir böcek getirmiş... Thank you? +1c",
  ],
  noSupplies: (missing: string) => [
    `Out of ${missing}... Bitti. Späti'ye gitmem lazım — kapıdan çık.`,
    `Hmm, no ${missing} left. Kapıya dokun, Späti hemen köşede.`,
  ],
  spatiTrip: () => [
    "Off to the Späti! Hemen dönerim.",
    "Quick Späti run... Bir şey ister misin? Şaka, yalnız gidiyorum.",
  ],
  laundryDrying: (min: number) => [
    `Still drying... ${min} dk daha lazım.`,
    `Not dry yet. Sabır — ${min} minutes.`,
  ],
  laundryNone: (min: number) => [
    `Basket's empty. Yeni çamaşır ~${min} dk'ya gelir.`,
    `No laundry right now — new basket in ~${min} min. Keyfe bak.`,
  ],
  laundryReady: () => [
    "Laundry day! Çamaşır günü 🧺",
    "Fresh basket is here! Yeni sepet geldi.",
  ],
  laundryRain: () => [
    "The laundry! Çamaşırlar ıslandı yine... of Berlin.",
    "Nooo, the rain got the laundry! Baştan kuruyacak.",
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
  private pendingGate = false;
  private gateObj: Phaser.GameObjects.Image | null = null;
  private pendingDryer = false;
  private dryerObj: Phaser.GameObjects.Image | null = null;
  private basketIcon: Phaser.GameObjects.Image | null = null;
  private laundry: LaundryState = { basket: 5, hung: 0, hungAt: 0, nextBasketAt: 0 };
  private catTimer = 0;
  private catAsleep = false;
  private catZzz: Phaser.Time.TimerEvent | null = null;
  private idleTimer = 0;
  private chillNoteTimer = 0;
  private plants!: PlantSystem;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleEvent: Phaser.Time.TimerEvent | null = null;
  private sfx = new Sfx();
  private music = new Music(
    () => this.isChilling(),
    () => this.registry.get("romantic") === true
  );
  private feyza!: FeyzaSystem;
  private deco!: DecorationSystem;
  private callFeyzaBtn: Phaser.GameObjects.Text | null = null;
  private suppressTap = false; // buton dokunuşu bahçe tap'ine düşmesin
  // Yağmur
  private raining = false;
  private nextRainAt = 0;
  private rainEndsAt = 0;
  private rainWaterTimer = 0;
  // Kedi yaramazlığı / hediyesi
  private mischiefTimer = 0;
  private mischiefMode: "dig" | null = null;
  private mischiefPlot: Plot | null = null;
  // Böcek avı
  private bugs: Phaser.Physics.Arcade.Sprite[] = [];
  private bugSpawnTimer = 15_000;
  private catHuntTarget: Phaser.Physics.Arcade.Sprite | null = null;
  private catCarrying = false;

  constructor() {
    super("Garden");
  }

  create() {
    const save = SaveSystem.load();
    this.registry.set("coins", save?.coins ?? 20);
    this.registry.set("seedIndex", save?.seedIndex ?? 0);
    this.registry.set("papers", save?.papers ?? 3);
    this.registry.set("tobacco", save?.tobacco ?? 3);
    this.registry.set("weed", save?.weed ?? 3);
    this.registry.set("chilling", false);
    this.registry.set("rolling", false);
    if (save?.laundry) this.laundry = save.laundry;
    this.registry.set("raining", false);
    this.nextRainAt = Date.now() + Phaser.Math.Between(120_000, 300_000);
    this.mischiefTimer = Phaser.Math.Between(180_000, 360_000); // eşeleme nadir

    const soilImages = this.createGround();
    this.createObjects();
    this.createBench();
    this.createPlayer();
    this.createCat();
    this.setupCamera();
    this.plants = new PlantSystem(this, buildPlotTiles(), soilImages);
    if (save) this.plants.restore(save.crops);
    this.registry.set("romantic", false);
    this.registry.set("cutscene", false);
    this.registry.set("placing", false);
    this.feyza = new FeyzaSystem({
      scene: this,
      player: this.player,
      plants: this.plants,
      sfx: this.sfx,
      gateFront: () => this.gateFrontVec(),
      sayRebecca: (t) => this.showBubble(t),
    });
    this.deco = new DecorationSystem(
      {
        scene: this,
        sfx: this.sfx,
        save: () => this.saveNow(),
        suppressTap: () => {
          this.suppressTap = true;
        },
      },
      save?.decorations
    );
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
      // Bahçe kapısı: dokununca Späti'ye gidilir (sokak hemen köşede)
      if (obj.texture === "gate") {
        this.gateObj = img;
        img.setInteractive({ useHandCursor: true });
        img.on("pointerdown", () => this.tryGoSpati());
      }
      // Flohmarkt tezgahı: dekorasyon dükkanı
      if (obj.texture === "market") {
        img.setInteractive({ useHandCursor: true });
        img.on("pointerdown", () => this.openFlohmarkt());
      }
      // Kulübe: dekorasyon envanteri (satın alınanlar burada durur)
      if (obj.texture === "shed") {
        img.setInteractive({ useHandCursor: true });
        img.on("pointerdown", () => {
          if (this.registry.get("rolling") || this.registry.get("cutscene")) return;
          this.suppressTap = true;
          this.deco.openInventory();
        });
      }
      // Kurutma şemsiyesi: çamaşır asma/toplama sahnesi
      if (obj.texture === "dryer") {
        this.dryerObj = img;
        img.setInteractive({ useHandCursor: true });
        img.on("pointerdown", () => this.tryOpenLaundry());
        // "Çamaşır hazır" göstergesi: dibinde bekleyen sepet
        this.basketIcon = this.add
          .image(img.x + img.displayWidth - 6, img.y + img.displayHeight - 4, "basketIcon")
          .setDepth(img.y + img.displayHeight + 1)
          .setVisible(false);
        this.tweens.add({
          targets: this.basketIcon,
          y: this.basketIcon.y - 2,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      }
    }
  }

  /** Kurutucuya dokun: uzaksa yürü, yakınsa çamaşır sahnesini aç. */
  private tryOpenLaundry() {
    if (this.registry.get("rolling") || this.registry.get("cutscene") || !this.dryerObj)
      return;
    const front = new Phaser.Math.Vector2(
      this.dryerObj.x + this.dryerObj.displayWidth / 2,
      this.dryerObj.y + this.dryerObj.displayHeight + 6
    );
    if (!this.playerNear(front, 34)) {
      this.pendingPlot = null;
      this.pendingBench = false;
      this.pendingGate = false;
      this.pendingDryer = true;
      this.moveTarget = front;
      this.physics.moveTo(this.player, front.x, front.y, PLAYER_SPEED);
      return;
    }
    this.openLaundry();
  }

  /** Süresi dolunca yeni sepet gelir (bildirimli); gösterge görünürlüğü. */
  private updateLaundryBasket() {
    const L = this.laundry;
    if (
      L.basket <= 0 &&
      L.hung <= 0 &&
      L.nextBasketAt > 0 &&
      Date.now() >= L.nextBasketAt
    ) {
      L.basket = 5;
      this.showBubble(Phaser.Math.RND.pick(LINES.laundryReady()));
      this.resetIdleTimer();
      this.saveNow();
    }
    // Dolu sepet: ıslak çamaşır bekliyor; boş sepet: asıldı, kurumada
    if (this.basketIcon) {
      if (L.basket > 0) {
        this.basketIcon.setTexture("basketIcon").setVisible(true);
      } else if (L.hung > 0) {
        this.basketIcon.setTexture("basketEmptyIcon").setVisible(true);
      } else {
        this.basketIcon.setVisible(false);
      }
    }
  }

  private openLaundry() {
    const L = this.laundry;
    const now = Date.now();
    // Kayıt yağmur sırasında alındıysa hungAt gelecekte kalmış olabilir — düzelt
    if (!this.raining && L.hungAt > now) L.hungAt = now;
    if (this.raining && L.hung > 0) {
      this.showBubble(Phaser.Math.RND.pick(LINES.laundryRain()));
      this.resetIdleTimer();
      return;
    }
    const launch = (mode: "hang" | "collect") => {
      this.scene.launch("Laundry", {
        mode,
        laundry: L,
        onClose: () => {
          // Hepsi toplandıysa yeni sepet için sayaç başlat
          if (L.hung === 0 && L.basket === 0) {
            L.nextBasketAt = Date.now() + LAUNDRY_BASKET_MS;
          }
          this.saveNow();
        },
      });
    };

    if (L.hung > 0) {
      if (now - L.hungAt >= LAUNDRY_DRY_MS) {
        launch("collect");
      } else {
        const min = Math.max(1, Math.ceil((LAUNDRY_DRY_MS - (now - L.hungAt)) / 60_000));
        this.showBubble(Phaser.Math.RND.pick(LINES.laundryDrying(min)));
        this.resetIdleTimer();
      }
      return;
    }
    if (L.basket <= 0 && now >= L.nextBasketAt) L.basket = 5; // yeni sepet geldi
    if (L.basket > 0) {
      launch("hang");
    } else {
      const min = Math.max(1, Math.ceil((L.nextBasketAt - now) / 60_000));
      this.showBubble(Phaser.Math.RND.pick(LINES.laundryNone(min)));
      this.resetIdleTimer();
    }
  }

  /** Kapının önündeki nokta (Feyza sistemi ve Späti için). */
  private gateFrontVec() {
    if (!this.gateObj) return new Phaser.Math.Vector2(16 * TILE, 41 * TILE);
    return new Phaser.Math.Vector2(
      this.gateObj.x + this.gateObj.displayWidth / 2,
      this.gateObj.y - 6
    );
  }

  /** Kapıya dokun: uzaksa yürü, yakınsa Späti sahnesine geç. */
  private tryGoSpati() {
    if (this.registry.get("rolling") || this.registry.get("cutscene") || !this.gateObj)
      return;
    const front = this.gateFrontVec();
    if (!this.playerNear(front, 30)) {
      this.pendingPlot = null;
      this.pendingBench = false;
      this.pendingGate = true;
      this.moveTarget = front;
      this.physics.moveTo(this.player, front.x, front.y, PLAYER_SPEED);
      return;
    }
    this.showBubble(Phaser.Math.RND.pick(LINES.spatiTrip()));
    this.scene.launch("Spati", { onClose: () => this.saveNow() });
  }

  /** Flohmarkt dükkanını aç (dekorasyon satın alma). */
  private openFlohmarkt() {
    if (this.registry.get("rolling") || this.registry.get("cutscene") || this.registry.get("placing"))
      return;
    this.scene.launch("Flohmarkt", {
      onBuy: (id: string) => this.deco.addOwned(id),
      onClose: () => this.saveNow(),
      ownedCounts: {},
    });
  }

  private createBench() {
    const bench = this.add
      .image(BENCH_TILE.tx * TILE, BENCH_TILE.ty * TILE, "bench")
      .setOrigin(0);
    bench.setDepth(bench.y + bench.displayHeight);
    bench.setInteractive({ useHandCursor: true });
    bench.on("pointerdown", () => {
      if (this.registry.get("rolling") || this.registry.get("cutscene") || this.isChilling())
        return;
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
      // Feyza'yı çağır butonuna basıldıysa bu dokunuşu yut (yürütme)
      if (this.suppressTap) {
        this.suppressTap = false;
        return;
      }
      // Alt-sahne veya cutscene sırasında bahçe dokunuşları kilitli
      if (this.registry.get("rolling") || this.registry.get("cutscene")) return;
      const world = pointer.positionToCamera(
        this.cameras.main
      ) as Phaser.Math.Vector2;
      // Yerleştirme modu: dokunulan yere dekorasyonu koy
      if (this.registry.get("placing")) {
        this.deco.placeAt(world);
        return;
      }
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
      tobacco: (this.registry.get("tobacco") as number) ?? 0,
      weed: (this.registry.get("weed") as number) ?? 0,
      laundry: this.laundry,
      decorations: this.deco ? this.deco.serialize() : [],
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
    // Üç malzeme de lazım: kağıt, tütün, yeşillik — eksikse Späti'ye
    const missing: string[] = [];
    if (((this.registry.get("papers") as number) ?? 0) <= 0) missing.push("papers 📄");
    if (((this.registry.get("tobacco") as number) ?? 0) <= 0) missing.push("tobacco 🚬");
    if (((this.registry.get("weed") as number) ?? 0) <= 0) missing.push("green 🌿");
    if (missing.length > 0) {
      this.showBubble(Phaser.Math.RND.pick(LINES.noSupplies(missing.join(", "))));
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
        // Sarış başına 1 kağıt + 1 tütün + 1 yeşillik
        for (const key of ["papers", "tobacco", "weed"]) {
          this.registry.set(
            key,
            Math.max(0, ((this.registry.get(key) as number) ?? 1) - 1)
          );
        }
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
    this.showCallFeyzaButton();
  }

  /** Chill sırasında "Feyza'yı çağır" butonu — bankın üstünde belirir */
  private showCallFeyzaButton() {
    this.callFeyzaBtn?.destroy();
    if (!this.feyza.canJoinBench() || this.feyza.atBenchNow()) return;
    const seat = this.benchSeat();
    const btn = this.add
      .text(seat.x, seat.y - 26, "💕 Feyza?", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#ffffff",
        backgroundColor: "#c8508acc",
        padding: { x: 4, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(100002)
      .setInteractive({ useHandCursor: true });
    btn.on("pointerdown", (
      _p: unknown,
      _x: unknown,
      _y: unknown,
      ev?: { stopPropagation?: () => void }
    ) => {
      ev?.stopPropagation?.();
      this.suppressTap = true;
      // Feyza Rebecca'nın soluna otursun
      this.feyza.comeToBench(new Phaser.Math.Vector2(seat.x - 14, seat.y - 6));
      this.showBubble("Feyza! Gel, beraber içelim 💕🌿");
      btn.destroy();
      this.callFeyzaBtn = null;
    });
    this.tweens.add({
      targets: btn,
      y: btn.y - 2,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.callFeyzaBtn = btn;
  }

  /** Banktan kalkınca chill biter */
  private endChill() {
    this.registry.set("chilling", false);
    this.callFeyzaBtn?.destroy();
    this.callFeyzaBtn = null;
    this.feyza.leaveBench();
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
    this.feyza.update(delta);
    const cutscene = this.registry.get("cutscene") === true;
    if (!cutscene) {
      this.updatePlayerMovement();
      this.updateMischief(delta);
      this.updateIdleChatter(delta);
      this.updateChillNotes(delta);
      // Banktan kalkınca (uzaklaşınca) chill biter
      if (this.isChilling() && !this.playerNear(this.benchSeat(), 14)) {
        this.endChill();
      }
    }
    this.updateWalkAnimation();
    this.updateCat(delta);
    this.updateBugs(delta);
    this.updateRain();
    this.updateLaundryBasket();
    this.plants.update();
    this.positionBubble();
    if (this.player.visible) {
      this.player.setDepth(this.player.y + this.player.displayHeight / 2);
    }
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
    // Asılı çamaşır varsa yeniden ıslanır — kuruma baştan başlar
    if (this.laundry.hung > 0) {
      this.laundry.hungAt = Date.now() + 999_999_999; // yağmur bitene dek kurumaz
      this.showBubble(Phaser.Math.RND.pick(LINES.laundryRain()));
    } else {
      this.showBubble(Phaser.Math.RND.pick(LINES.rainStart()));
    }
    this.resetIdleTimer();
  }

  private stopRainLaundry() {
    // Yağmur bitti: ıslak çamaşırların kuruması şimdi başlasın
    if (this.laundry.hung > 0 && this.laundry.hungAt > Date.now()) {
      this.laundry.hungAt = Date.now();
    }
  }

  private stopRain() {
    this.raining = false;
    this.registry.set("raining", false);
    this.nextRainAt = Date.now() + Phaser.Math.Between(180_000, 420_000);
    this.stopRainLaundry();
  }

  // ---------- kedi yaramazlığı (nadir eşeleme) ----------

  private updateMischief(delta: number) {
    if (this.catAsleep || this.catHuntTarget || this.catCarrying) return;

    // Hedefe yürüme aşaması
    if (this.mischiefMode) {
      if (!this.mischiefPlot) {
        this.mischiefMode = null;
        return;
      }
      const target = new Phaser.Math.Vector2(
        this.mischiefPlot.tx * TILE + TILE / 2,
        this.mischiefPlot.ty * TILE + TILE / 2
      );
      const dist = Phaser.Math.Distance.Between(
        this.cat.x,
        this.cat.y,
        target.x,
        target.y
      );
      if (dist < 8) {
        this.cat.setVelocity(0);
        this.resolveMischief();
      } else {
        this.physics.moveTo(this.cat, target.x, target.y, 55);
      }
      return;
    }

    this.mischiefTimer -= delta;
    if (this.mischiefTimer > 0) return;

    this.mischiefPlot = this.plants.randomWateredPlot();
    if (this.mischiefPlot) {
      this.mischiefMode = "dig";
    } else {
      this.mischiefTimer = Phaser.Math.Between(60_000, 120_000);
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
    }
    this.mischiefMode = null;
    this.mischiefPlot = null;
    this.mischiefTimer = Phaser.Math.Between(240_000, 420_000); // nadir
    this.catTimer = Phaser.Math.Between(2000, 5000);
    this.resetIdleTimer();
  }

  // ---------- böcek avı ----------

  /** Arada bir bahçede sinek/böcek belirir (en fazla 2) */
  private updateBugs(delta: number) {
    this.bugSpawnTimer -= delta;
    if (this.bugSpawnTimer <= 0) {
      if (this.bugs.length < 2) this.spawnBug();
      this.bugSpawnTimer = Phaser.Math.Between(25_000, 50_000);
    }
    const now = Date.now();
    for (const bug of [...this.bugs]) {
      if (!bug.active) {
        this.bugs = this.bugs.filter((b) => b !== bug);
        continue;
      }
      // Kaçamak hareket: kısa süreli rastgele yön değişimleri
      let moveTimer = (bug.getData("moveTimer") as number) - delta;
      if (moveTimer <= 0) {
        const speed = bug.texture.key === "fly" ? 55 : 22;
        if (Phaser.Math.Between(0, 100) < 25) {
          bug.setVelocity(0); // ara sıra durur
        } else {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          bug.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
        moveTimer = Phaser.Math.Between(350, 900);
      }
      bug.setData("moveTimer", moveTimer);
      // Ömrü dolunca uçup gider (av hedefiyse kalır)
      if (now > (bug.getData("despawnAt") as number) && bug !== this.catHuntTarget) {
        this.despawnBug(bug);
      }
    }
  }

  private spawnBug() {
    const kind = Phaser.Math.RND.pick(["fly", "beetle"]);
    const bug = this.physics.add.sprite(
      Phaser.Math.Between(4, MAP_W - 4) * TILE,
      Phaser.Math.Between(12, MAP_H - 4) * TILE,
      kind
    );
    bug.setCollideWorldBounds(true);
    bug.setDepth(bug.y);
    bug.setData("moveTimer", 0);
    bug.setData("despawnAt", Date.now() + Phaser.Math.Between(40_000, 80_000));
    this.bugs.push(bug);
  }

  private despawnBug(bug: Phaser.Physics.Arcade.Sprite) {
    this.bugs = this.bugs.filter((b) => b !== bug);
    this.tweens.add({
      targets: bug,
      alpha: 0,
      y: bug.y - 8,
      duration: 400,
      onComplete: () => bug.destroy(),
    });
  }

  /** Yakaladı! Minik yıldız + ağzında oyuncuya taşır */
  private catchBug(bug: Phaser.Physics.Arcade.Sprite) {
    this.bugs = this.bugs.filter((b) => b !== bug);
    bug.destroy();
    this.catHuntTarget = null;
    this.catCarrying = true;
    this.sfx.plant();
    // Atlayış + yıldız
    this.tweens.add({
      targets: this.cat,
      y: this.cat.y - 6,
      duration: 120,
      yoyo: true,
      ease: "Quad.out",
    });
    const star = this.add
      .text(this.cat.x, this.cat.y - 10, "✦", {
        fontSize: "10px",
        color: "#f2c53d",
      })
      .setOrigin(0.5)
      .setDepth(10000);
    this.tweens.add({
      targets: star,
      y: star.y - 12,
      alpha: 0,
      duration: 600,
      onComplete: () => star.destroy(),
    });
  }

  /** Avı Rebecca'ya teslim: +1c + teşekkür */
  private deliverBug() {
    this.catCarrying = false;
    const coins = (this.registry.get("coins") as number) ?? 0;
    this.registry.set("coins", coins + 1);
    this.sfx.gift();
    const tag = this.add
      .text(this.cat.x, this.cat.y - 10, "🪰 +1c", { fontSize: "8px" })
      .setOrigin(0.5)
      .setDepth(10000);
    this.tweens.add({
      targets: tag,
      y: tag.y - 14,
      alpha: 0,
      duration: 1200,
      onComplete: () => tag.destroy(),
    });
    this.showBubble(Phaser.Math.RND.pick(LINES.catBugThanks()));
    this.saveNow();
    this.resetIdleTimer();
    this.catTimer = Phaser.Math.Between(3000, 6000);
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
      } else if (this.pendingGate) {
        this.pendingGate = false;
        this.tryGoSpati();
      } else if (this.pendingDryer) {
        this.pendingDryer = false;
        this.openLaundry();
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

  /** Kedi: dolaş → dinlen → uyu; böcek görürse kovala → yakala → getir */
  private updateCat(delta: number) {
    if (this.mischiefMode) return; // yaramazlık sırasında kontrol updateMischief'te

    // Avı ağzında: Rebecca'ya taşıyor
    if (this.catCarrying) {
      const dist = Phaser.Math.Distance.Between(
        this.cat.x,
        this.cat.y,
        this.player.x,
        this.player.y
      );
      if (dist < 20) {
        this.cat.setVelocity(0);
        this.deliverBug();
      } else {
        this.physics.moveTo(this.cat, this.player.x, this.player.y, 60);
      }
      return;
    }

    // Av peşinde: böceği kovalar (böcek kaçtıkça rota güncellenir)
    if (this.catHuntTarget) {
      if (!this.catHuntTarget.active) {
        this.catHuntTarget = null; // av kaçtı, boş ver
        this.cat.setVelocity(0);
        this.catTimer = Phaser.Math.Between(1000, 3000);
        return;
      }
      const bug = this.catHuntTarget;
      const dist = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, bug.x, bug.y);
      if (dist < 10) {
        this.cat.setVelocity(0);
        this.catchBug(bug);
      } else {
        this.physics.moveTo(this.cat, bug.x, bug.y, 72);
      }
      return;
    }

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
      // Ortada böcek varsa çoğu zaman ava çıkar
      const prey = this.bugs.find((b) => b.active);
      if (prey && Phaser.Math.Between(0, 100) < 65) {
        this.catHuntTarget = prey;
        if (Phaser.Math.Between(0, 100) < 40) {
          this.showBubble(Phaser.Math.RND.pick(LINES.catHunt()));
          this.resetIdleTimer();
        }
        return;
      }
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
