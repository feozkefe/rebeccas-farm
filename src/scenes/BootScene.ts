import Phaser from "phaser";
import { PLANTS, type PlantDef } from "../data/plants";

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
    this.createGroundTextures();
    this.createObjectTextures();
    this.createCharacterTextures();
    for (const p of PLANTS) this.createPlantTextures(p);
    this.scene.start("Garden");
  }

  /** Bir bitkinin 4 büyüme aşamasının dokularını üretir: plant_{id}_{0..3} */
  private createPlantTextures(p: PlantDef) {
    // Aşama 0: fide — kısa sap + iki minik yaprak
    let g = this.gfx();
    g.fillStyle(0x5a9e4a);
    g.fillRect(7, 10, 2, 4);
    g.fillStyle(p.leafColor);
    g.fillRect(5, 9, 2, 2);
    g.fillRect(9, 8, 2, 2);
    g.generateTexture(`plant_${p.id}_0`, 16, 16);
    g.destroy();

    // Aşama 1: genç — uzun sap + yaprak çifti
    g = this.gfx();
    g.fillStyle(0x4a8e3e);
    g.fillRect(7, 6, 2, 8);
    g.fillStyle(p.leafColor);
    g.fillCircle(5, 8, 2);
    g.fillCircle(11, 7, 2);
    g.fillCircle(6, 11, 2);
    g.fillCircle(10, 10, 2);
    g.generateTexture(`plant_${p.id}_1`, 16, 16);
    g.destroy();

    // Aşama 2: olgunlaşıyor — yaprak kümesi
    g = this.gfx();
    g.fillStyle(0x4a8e3e);
    g.fillRect(7, 10, 2, 4);
    g.fillStyle(p.leafColor);
    g.fillCircle(8, 8, 5);
    g.fillCircle(4, 10, 3);
    g.fillCircle(12, 10, 3);
    g.generateTexture(`plant_${p.id}_2`, 16, 16);
    g.destroy();

    // Aşama 3: hasat hazır — meyveler ya da tepede çiçek
    g = this.gfx();
    g.fillStyle(0x4a8e3e);
    g.fillRect(7, 10, 2, 4);
    g.fillStyle(p.leafColor);
    g.fillCircle(8, 8, 5);
    g.fillCircle(4, 10, 3);
    g.fillCircle(12, 10, 3);
    if (p.flower) {
      g.fillStyle(p.accentColor); // taç yapraklar
      g.fillCircle(8, 4, 4);
      g.fillCircle(4, 5, 2);
      g.fillCircle(12, 5, 2);
      g.fillCircle(8, 2, 2);
      g.fillStyle(p.accentDark); // çiçek göbeği
      g.fillCircle(8, 4, 2);
    } else {
      g.fillStyle(p.accentColor); // meyveler
      g.fillCircle(5, 7, 2);
      g.fillCircle(11, 9, 2);
      g.fillCircle(8, 11, 2);
      g.fillStyle(p.accentDark);
      g.fillRect(4, 6, 1, 1);
      g.fillRect(10, 8, 1, 1);
    }
    g.generateTexture(`plant_${p.id}_3`, 16, 16);
    g.destroy();
  }

  private gfx() {
    return this.add.graphics();
  }

  private createGroundTextures() {
    // Çimen (iki ton yeşil, damalı)
    let g = this.gfx();
    g.fillStyle(0x7ec850);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x74bd4a);
    g.fillRect(0, 0, 8, 8);
    g.fillRect(8, 8, 8, 8);
    g.generateTexture("grass", 16, 16);
    g.destroy();

    // Kurumuş çim (Berlin yazı — sarımsı kahve)
    g = this.gfx();
    g.fillStyle(0xc2b25f);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0xb5a04e);
    g.fillRect(2, 3, 5, 4);
    g.fillRect(9, 9, 5, 4);
    g.fillStyle(0x8fae53); // arada yeşil tutamlar
    g.fillRect(12, 2, 3, 3);
    g.generateTexture("dryGrass", 16, 16);
    g.destroy();

    // Teras taşı (bej döşeme)
    g = this.gfx();
    g.fillStyle(0xcbb9a0);
    g.fillRect(0, 0, 16, 16);
    g.lineStyle(1, 0xb3a189);
    g.strokeRect(0, 0, 16, 16);
    g.generateTexture("paving", 16, 16);
    g.destroy();

    // Toprak
    g = this.gfx();
    g.fillStyle(0x8a5a3b);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x7a4e33);
    g.fillRect(2, 2, 4, 4);
    g.fillRect(10, 8, 4, 4);
    g.generateTexture("soil", 16, 16);
    g.destroy();

    // Yürüme taşı (çim üstünde gri plaka)
    g = this.gfx();
    g.fillStyle(0x7ec850);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0xa8a8a0);
    g.fillRoundedRect(2, 2, 12, 12, 3);
    g.fillStyle(0x94948c);
    g.fillRect(4, 8, 5, 3);
    g.generateTexture("stone", 16, 16);
    g.destroy();
  }

  private createObjectTextures() {
    // Gazebo — koyu yeşil tente (fotoğraftaki gibi), 96x96
    let g = this.gfx();
    g.fillStyle(0x2f5e3f);
    g.fillTriangle(0, 40, 48, 0, 96, 40);
    g.fillStyle(0x274f35);
    g.fillRect(0, 40, 96, 44);
    g.fillStyle(0x1d3b28); // gölgeli iç
    g.fillRect(8, 48, 80, 30);
    g.generateTexture("gazebo", 96, 96);
    g.destroy();

    // Ahşap kulübe — 80x72
    g = this.gfx();
    g.fillStyle(0x6b4a2f); // çatı
    g.fillRect(0, 0, 80, 20);
    g.fillStyle(0x8a6238); // gövde
    g.fillRect(4, 20, 72, 52);
    g.lineStyle(1, 0x6b4a2f);
    for (let x = 12; x < 76; x += 8) g.lineBetween(x, 20, x, 72); // ahşap çizgileri
    g.fillStyle(0x4a3320); // kapı
    g.fillRect(34, 44, 14, 28);
    g.generateTexture("shed", 80, 72);
    g.destroy();

    // Beyaz masa + banklar — 96x40
    g = this.gfx();
    g.fillStyle(0xeeeeee);
    g.fillRect(16, 8, 64, 16); // masa
    g.fillStyle(0xdddddd);
    g.fillRect(8, 28, 80, 6); // ön bank
    g.fillRect(8, 0, 80, 6); // arka bank
    g.generateTexture("table", 96, 40);
    g.destroy();

    // Mor yapraklı ağaç — 48x56
    g = this.gfx();
    g.fillStyle(0x5a3a4a);
    g.fillCircle(24, 20, 20);
    g.fillStyle(0x6e4759);
    g.fillCircle(14, 14, 10);
    g.fillCircle(34, 16, 9);
    g.fillStyle(0x4a3320);
    g.fillRect(21, 38, 6, 16); // gövde
    g.generateTexture("treePurple", 48, 56);
    g.destroy();

    // Yeşil ağaç — 48x56
    g = this.gfx();
    g.fillStyle(0x3e7a3e);
    g.fillCircle(24, 20, 20);
    g.fillStyle(0x4c914c);
    g.fillCircle(14, 14, 10);
    g.fillCircle(34, 16, 9);
    g.fillStyle(0x4a3320);
    g.fillRect(21, 38, 6, 16);
    g.generateTexture("treeGreen", 48, 56);
    g.destroy();

    // Fidan — 16x28
    g = this.gfx();
    g.fillStyle(0x4c914c);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0x4a3320);
    g.fillRect(6, 14, 3, 12);
    g.generateTexture("treeSmall", 16, 28);
    g.destroy();

    // Çamaşır kurutma şemsiyesi — 48x48
    g = this.gfx();
    g.lineStyle(2, 0x888888);
    g.lineBetween(24, 12, 24, 44); // direk
    g.lineStyle(1, 0x3aa5b8); // mavi-yeşil ipler (fotoğraftaki gibi)
    g.strokeRect(6, 6, 36, 20);
    g.lineBetween(6, 6, 42, 26);
    g.lineBetween(42, 6, 6, 26);
    g.lineBetween(24, 12, 6, 6);
    g.lineBetween(24, 12, 42, 6);
    g.lineBetween(24, 12, 6, 26);
    g.lineBetween(24, 12, 42, 26);
    g.generateTexture("dryer", 48, 48);
    g.destroy();

    // Raised bed ahşap çerçevesi — 5x4 tile = 80x64 (içi boş, toprak zeminden görünür)
    g = this.gfx();
    g.fillStyle(0x9a7448);
    g.fillRect(0, 0, 80, 16);
    g.fillRect(0, 48, 80, 16);
    g.fillRect(0, 0, 16, 64);
    g.fillRect(64, 0, 16, 64);
    g.lineStyle(1, 0x7d5c38);
    g.strokeRect(0, 0, 80, 64);
    g.strokeRect(16, 16, 48, 32);
    g.generateTexture("bedFrame", 80, 64);
    g.destroy();

    // Bahçe kapısı ("140") — 96x24
    g = this.gfx();
    g.lineStyle(2, 0x6a7a6a);
    g.strokeRect(0, 4, 96, 18);
    for (let x = 8; x < 96; x += 8) g.lineBetween(x, 4, x, 22);
    g.fillStyle(0x2e5e3e); // "140" plakası
    g.fillRect(36, 0, 24, 12);
    g.generateTexture("gate", 96, 24);
    g.destroy();

    // Çalı — 16x16
    g = this.gfx();
    g.fillStyle(0x35682d);
    g.fillCircle(8, 9, 7);
    g.fillStyle(0x417e38);
    g.fillCircle(5, 7, 4);
    g.fillCircle(11, 7, 4);
    g.generateTexture("bush", 16, 16);
    g.destroy();

    // Tel çit — 16x16
    g = this.gfx();
    g.lineStyle(1, 0x9aa0a6);
    g.lineBetween(8, 0, 8, 16); // direk
    g.lineBetween(0, 3, 16, 3);
    g.lineBetween(0, 13, 16, 13);
    g.lineBetween(0, 3, 16, 13);
    g.lineBetween(16, 3, 0, 13);
    g.generateTexture("fence", 16, 16);
    g.destroy();
  }

  private createCharacterTextures() {
    // Rebecca — 16x24: sarı toplanmış saç, mavi gözler,
    // turuncu fitilli tişört, yırtık açık mavi kot şort
    const g = this.gfx();
    g.fillStyle(0xe6c85a); // sarı saç
    g.fillRect(4, 0, 8, 5);
    g.fillRect(3, 1, 1, 4); // yanlar
    g.fillRect(12, 1, 1, 4);
    g.fillRect(6, -0, 4, 1);
    g.fillStyle(0xd4b048); // topuz (arkada, üstte küçük çıkıntı)
    g.fillRect(6, 0, 4, 2);
    g.fillStyle(0xf0c8a0); // yüz
    g.fillRect(4, 5, 8, 5);
    g.fillStyle(0x4a90d9); // mavi gözler
    g.fillRect(5, 6, 2, 2);
    g.fillRect(9, 6, 2, 2);
    g.fillStyle(0xd96a35); // turuncu tişört (bol kesim — 1px taşkın)
    g.fillRect(3, 10, 10, 7);
    g.fillStyle(0xc55c2c); // fitil dokusu
    g.fillRect(5, 11, 1, 5);
    g.fillRect(8, 11, 1, 5);
    g.fillRect(11, 11, 1, 5);
    g.fillStyle(0x8fb8dd); // açık mavi kot şort
    g.fillRect(4, 17, 8, 3);
    g.fillStyle(0xf0c8a0); // yırtık: ten görünen pikseller
    g.fillRect(5, 18, 1, 1);
    g.fillRect(10, 19, 1, 1);
    g.fillStyle(0xf0c8a0); // bacaklar (şort kısa)
    g.fillRect(4, 20, 3, 3);
    g.fillRect(9, 20, 3, 3);
    g.fillStyle(0x7a6a55); // sandalet
    g.fillRect(4, 23, 3, 1);
    g.fillRect(9, 23, 3, 1);
    g.generateTexture("player", 16, 24);
    g.destroy();

    // Kaliko kedi (beyaz + turuncu + siyah)
    const c = this.gfx();
    c.fillStyle(0xf5f0e8);
    c.fillRect(2, 6, 12, 8);
    c.fillRect(4, 2, 8, 6);
    c.fillStyle(0xe8963c);
    c.fillRect(4, 2, 3, 3);
    c.fillRect(10, 8, 4, 4);
    c.fillStyle(0x2b2b2b);
    c.fillRect(9, 2, 3, 3);
    c.fillRect(3, 10, 3, 3);
    c.fillRect(13, 4, 2, 8);
    c.generateTexture("cat", 16, 16);
    c.destroy();
  }
}
