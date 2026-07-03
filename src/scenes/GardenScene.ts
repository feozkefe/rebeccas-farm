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

const PLAYER_SPEED = 80;
const CAT_NAME = "Spicey";

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
};

/**
 * Ana bahçe sahnesi — yerleşim reference/garden/ fotoğraflarından.
 * Tap-to-move + bağlamsal aksiyon: plota dokun → Rebecca oraya yürür,
 * varınca eker/sular/hasat eder. HUD ayrı sahnede (UI).
 */
export class GardenScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cat!: Phaser.Physics.Arcade.Sprite;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private pendingPlot: Plot | null = null;
  private catTimer = 0;
  private idleTimer = 0;
  private plants!: PlantSystem;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleEvent: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("Garden");
  }

  create() {
    if (this.registry.get("coins") === undefined) {
      this.registry.set("coins", 20);
      this.registry.set("seedIndex", 0);
    }

    const soilImages = this.createGround();
    this.createObjects();
    this.createPlayer();
    this.createCat();
    this.setupCamera();
    this.plants = new PlantSystem(this, buildPlotTiles(), soilImages);
    this.setupInput();
    this.scene.launch("UI");
    this.resetIdleTimer();
  }

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
    }
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

  private setupCamera() {
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.1, 0.1);
    cam.setBounds(0, -TILE * 3, MAP_W * TILE, (MAP_H + 3) * TILE);
    cam.setZoom(3);
  }

  private setupInput() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const world = pointer.positionToCamera(
        this.cameras.main
      ) as Phaser.Math.Vector2;
      const tx = Math.floor(world.x / TILE);
      const ty = Math.floor(world.y / TILE);

      const plot = this.plants.getPlotAt(tx, ty);
      this.pendingPlot = plot ?? null;
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
        this.showBubble(pick(LINES.plant(name)));
        break;
      case "water":
        this.showBubble(pick(LINES.water()));
        break;
      case "harvest":
        this.showBubble(`${pick(LINES.harvest(name))} +${result.earned}c`);
        break;
      case "growing":
        this.showBubble(pick(LINES.growing()));
        break;
      case "noCoins":
        this.showBubble(pick(LINES.noCoins()));
        break;
    }
    this.resetIdleTimer();
  }

  private petCat() {
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
      this.showBubble(Phaser.Math.RND.pick(LINES.cat()));
      this.resetIdleTimer();
    }
  }

  /** Rebecca'nın üstünde konuşma balonu gösterir; öncekini iptal eder. */
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

  update(_time: number, delta: number) {
    this.updatePlayerMovement();
    this.updateCatWander(delta);
    this.updateIdleChatter(delta);
    this.plants.update();
    this.positionBubble();
    this.player.setDepth(this.player.y + this.player.displayHeight / 2);
    this.cat.setDepth(this.cat.y + this.cat.displayHeight / 2);
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
      }
    }
  }

  private updateCatWander(delta: number) {
    this.catTimer -= delta;
    if (this.catTimer <= 0) {
      if (this.cat.body!.velocity.length() > 0) {
        this.cat.setVelocity(0);
        this.catTimer = Phaser.Math.Between(2000, 6000); // dinlenme
      } else {
        const tx = Phaser.Math.Between(3, MAP_W - 3) * TILE;
        const ty = Phaser.Math.Between(10, MAP_H - 3) * TILE;
        this.physics.moveTo(this.cat, tx, ty, 40);
        this.catTimer = Phaser.Math.Between(1000, 3000); // yürüme süresi
      }
    }
  }

  private updateIdleChatter(delta: number) {
    this.idleTimer -= delta;
    if (this.idleTimer <= 0) {
      this.showBubble(Phaser.Math.RND.pick(IDLE_LINES));
      this.resetIdleTimer();
    }
  }
}
