import Phaser from "phaser";

/**
 * Asset yükleme sahnesi.
 * Şimdilik gerçek asset yok — placeholder dokuları kodla üretiyoruz.
 * Sprout Lands vb. assetler gelince burada this.load.image / spritesheet ile yüklenecek.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this.createPlaceholderTextures();
    this.scene.start("Garden");
  }

  /** Gerçek sprite'lar gelene kadar basit renkli dokular üretir. */
  private createPlaceholderTextures() {
    // Çimen zemini (iki ton yeşil, damalı)
    const grass = this.add.graphics();
    grass.fillStyle(0x7ec850);
    grass.fillRect(0, 0, 16, 16);
    grass.fillStyle(0x74bd4a);
    grass.fillRect(0, 0, 8, 8);
    grass.fillRect(8, 8, 8, 8);
    grass.generateTexture("grass", 16, 16);
    grass.destroy();

    // Toprak yatağı
    const soil = this.add.graphics();
    soil.fillStyle(0x8a5a3b);
    soil.fillRect(0, 0, 16, 16);
    soil.fillStyle(0x7a4e33);
    soil.fillRect(2, 2, 4, 4);
    soil.fillRect(10, 8, 4, 4);
    soil.generateTexture("soil", 16, 16);
    soil.destroy();

    // Rebecca (placeholder: 16x24 karakter)
    const player = this.add.graphics();
    player.fillStyle(0x3b2f2f); // saç
    player.fillRect(4, 0, 8, 6);
    player.fillStyle(0xf0c8a0); // yüz
    player.fillRect(4, 6, 8, 5);
    player.fillStyle(0x6b8e5a); // üst
    player.fillRect(3, 11, 10, 8);
    player.fillStyle(0x4a4a6a); // pantolon
    player.fillRect(4, 19, 3, 5);
    player.fillRect(9, 19, 3, 5);
    player.generateTexture("player", 16, 24);
    player.destroy();

    // Kaliko kedi (placeholder: beyaz + turuncu + siyah lekeler)
    const cat = this.add.graphics();
    cat.fillStyle(0xf5f0e8); // beyaz gövde
    cat.fillRect(2, 6, 12, 8);
    cat.fillRect(4, 2, 8, 6); // kafa
    cat.fillStyle(0xe8963c); // turuncu lekeler
    cat.fillRect(4, 2, 3, 3); // sol kulak turuncu
    cat.fillRect(10, 8, 4, 4);
    cat.fillStyle(0x2b2b2b); // siyah lekeler
    cat.fillRect(9, 2, 3, 3); // sağ kulak siyah
    cat.fillRect(3, 10, 3, 3);
    cat.fillRect(13, 4, 2, 8); // kuyruk
    cat.generateTexture("cat", 16, 16);
    cat.destroy();
  }
}
