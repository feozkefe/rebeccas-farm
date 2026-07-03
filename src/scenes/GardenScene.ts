import Phaser from "phaser";

const TILE = 16;
const MAP_W = 40; // tile cinsinden — gerçek bahçe fotoğrafları gelince Tiled haritasıyla değişecek
const MAP_H = 30;
const PLAYER_SPEED = 80;

/**
 * Ana bahçe sahnesi.
 * Şu an: placeholder çimen zemini, tap-to-move Rebecca, dolaşan kaliko kedi.
 * Sırada: gerçek harita (Tiled), ekim/sulama/hasat, HUD.
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
    this.createPlayer();
    this.createCat();
    this.setupCamera();
    this.setupInput();
  }

  private createGround() {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.add.image(x * TILE, y * TILE, "grass").setOrigin(0);
      }
    }
    // Örnek toprak yatakları — gerçek yerleşim fotoğraflardan gelecek
    for (const [bx, by] of [
      [8, 8],
      [8, 14],
      [24, 10],
    ]) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 6; x++) {
          this.add.image((bx + x) * TILE, (by + y) * TILE, "soil").setOrigin(0);
        }
      }
    }
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(
      (MAP_W / 2) * TILE,
      (MAP_H / 2) * TILE,
      "player"
    );
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  }

  private createCat() {
    this.cat = this.physics.add.sprite(10 * TILE, 10 * TILE, "cat");
    this.cat.setCollideWorldBounds(true);
    // Kediye dokununca kalp çıkar
    this.cat.setInteractive();
    this.cat.on("pointerdown", () => this.petCat());
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.1, 0.1);
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
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
      .setOrigin(0.5);
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
      // Bir süre dur, sonra rastgele bir yöne yürü
      if (this.cat.body!.velocity.length() > 0) {
        this.cat.setVelocity(0);
        this.catTimer = Phaser.Math.Between(2000, 6000); // dinlenme
      } else {
        const tx = Phaser.Math.Between(2, MAP_W - 2) * TILE;
        const ty = Phaser.Math.Between(2, MAP_H - 2) * TILE;
        this.physics.moveTo(this.cat, tx, ty, 40);
        this.catTimer = Phaser.Math.Between(1000, 3000); // yürüme süresi
      }
    }
  }
}
