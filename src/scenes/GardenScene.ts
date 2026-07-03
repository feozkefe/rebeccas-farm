import Phaser from "phaser";
import {
  TILE,
  MAP_W,
  MAP_H,
  buildGround,
  buildEdgeObjects,
  MAP_OBJECTS,
} from "../data/mapLayout";

const PLAYER_SPEED = 80;

/**
 * Ana bahçe sahnesi — yerleşim reference/garden/ fotoğraflarından.
 * Şu an: harita, tap-to-move Rebecca, dolaşan kaliko kedi.
 * Sırada: ekim/sulama/hasat (raised bed), HUD, gerçek assetler.
 */
export class GardenScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cat!: Phaser.Physics.Arcade.Sprite;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private catTimer = 0;

  constructor() {
    super("Garden");
  }

  create() {
    this.createGround();
    this.createObjects();
    this.createPlayer();
    this.createCat();
    this.setupCamera();
    this.setupInput();
  }

  private createGround() {
    const grid = buildGround();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.add.image(x * TILE, y * TILE, grid[y][x]).setOrigin(0).setDepth(0);
      }
    }
  }

  private createObjects() {
    for (const obj of [...MAP_OBJECTS, ...buildEdgeObjects()]) {
      const img = this.add
        .image(obj.tx * TILE, obj.ty * TILE, obj.texture)
        .setOrigin(obj.originX ?? 0, obj.originY ?? 0);
      // Alt kenarına göre depth: oyuncu objenin önünden/arkasından doğru geçsin
      img.setDepth(img.y + img.displayHeight);
    }
  }

  private createPlayer() {
    // Kapının hemen önünde başla (bahçeye yeni girmiş gibi)
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
      this.moveTarget = new Phaser.Math.Vector2(world.x, world.y);
      this.physics.moveTo(this.player, world.x, world.y, PLAYER_SPEED);
    });
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
  }

  update(_time: number, delta: number) {
    this.updatePlayerMovement();
    this.updateCatWander(delta);
    // y'ye göre depth: haritadaki objelerin önünden/arkasından doğru geçiş
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
}
