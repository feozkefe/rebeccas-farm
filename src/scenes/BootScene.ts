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
    this.createWalkAnimation();
    this.createDecorationTextures();
    for (const p of PLANTS) this.createPlantTextures(p);
    this.scene.start("Garden");
  }

  /** Flohmarkt dekorasyonları — deco_<id>, alt-orta origin için tasarlı */
  private createDecorationTextures() {
    let g = this.gfx();
    // Süs havuzu — 40x24: taş kenar + mavi su + nilüfer
    g.fillStyle(0x8a8a80);
    g.fillEllipse(20, 16, 40, 16);
    g.fillStyle(0x4a90d9);
    g.fillEllipse(20, 15, 32, 11);
    g.fillStyle(0x6ab0e8);
    g.fillEllipse(15, 13, 12, 4);
    g.fillStyle(0x3e8e3e);
    g.fillEllipse(26, 16, 8, 4); // nilüfer yaprağı
    g.fillStyle(0xe89ac8);
    g.fillCircle(26, 15, 2); // çiçek
    g.generateTexture("deco_pond", 40, 26);
    g.destroy();

    // Hamak — 44x22: iki direk + file
    g = this.gfx();
    g.fillStyle(0x6b4a2f);
    g.fillRect(1, 2, 3, 18);
    g.fillRect(40, 2, 3, 18);
    g.fillStyle(0xd96a8a);
    g.fillEllipse(22, 12, 38, 10); // hamak kumaşı
    g.lineStyle(1, 0xb84a6a);
    g.lineBetween(4, 8, 40, 8);
    g.lineBetween(4, 12, 40, 14);
    g.generateTexture("deco_hammock", 44, 22);
    g.destroy();

    // Bahçe cücesi — 14x20: kırmızı külah, sakal
    g = this.gfx();
    g.fillStyle(0xd93a3a);
    g.fillTriangle(7, 0, 2, 9, 12, 9); // külah
    g.fillStyle(0xf0c8a0);
    g.fillCircle(7, 11, 4); // yüz
    g.fillStyle(0xf5f5f5);
    g.fillTriangle(3, 11, 11, 11, 7, 18); // sakal
    g.fillStyle(0x4a7ac8);
    g.fillRect(4, 15, 6, 5); // gövde
    g.generateTexture("deco_gnome", 14, 20);
    g.destroy();

    // Peri ışıkları — 40x14: ip + renkli ampuller
    g = this.gfx();
    g.lineStyle(1, 0x5a5a50);
    g.beginPath();
    g.moveTo(0, 3);
    for (let x = 0; x <= 40; x += 8) g.lineTo(x, 3 + (x % 16 === 0 ? 0 : 5));
    g.strokePath();
    const bulbs = [0xf2c53d, 0xe23d2e, 0x5ec850, 0x4a90d9, 0xe89ac8];
    for (let i = 0; i < 5; i++) {
      g.fillStyle(bulbs[i]);
      g.fillCircle(4 + i * 8, 9, 2.4);
    }
    g.generateTexture("deco_fairylights", 40, 14);
    g.destroy();

    // Flamingo — 14x26: pembe, tek ayak
    g = this.gfx();
    g.fillStyle(0xe86a9a);
    g.fillEllipse(7, 14, 10, 8); // gövde
    g.fillRect(6, 4, 2, 10); // boyun
    g.fillCircle(7, 4, 2.5); // kafa
    g.fillStyle(0x2a2a2a);
    g.fillRect(8, 3, 2, 1); // gaga
    g.lineStyle(1, 0xd94a7a);
    g.lineBetween(7, 18, 7, 26); // ayak
    g.generateTexture("deco_flamingo", 14, 26);
    g.destroy();

    // Kuş banyosu — 16x22: ayak + taş kase + su
    g = this.gfx();
    g.fillStyle(0x9a9a90);
    g.fillRect(6, 8, 4, 14); // ayak
    g.fillEllipse(8, 20, 12, 4); // taban
    g.fillStyle(0xb0b0a6);
    g.fillEllipse(8, 8, 15, 7); // kase
    g.fillStyle(0x4a90d9);
    g.fillEllipse(8, 7, 11, 4); // su
    g.generateTexture("deco_birdbath", 16, 22);
    g.destroy();

    // Fener — 10x20: direk + fener kutusu (gece parlar hissi)
    g = this.gfx();
    g.fillStyle(0x3a3a42);
    g.fillRect(4, 6, 2, 14); // direk
    g.fillStyle(0x2a2a30);
    g.fillRect(1, 0, 8, 7); // fener gövdesi
    g.fillStyle(0xf2d84a);
    g.fillRect(3, 2, 4, 4); // ışık
    g.generateTexture("deco_lantern", 10, 20);
    g.destroy();

    // Mantarlar — 16x12: kırmızı-beyaz benekli grup
    g = this.gfx();
    g.fillStyle(0xf5f5e8);
    g.fillRect(3, 7, 2, 4);
    g.fillRect(9, 8, 2, 3);
    g.fillStyle(0xd93a3a);
    g.fillEllipse(4, 7, 7, 5);
    g.fillEllipse(10, 8, 6, 4);
    g.fillStyle(0xffffff);
    g.fillCircle(3, 6, 1);
    g.fillCircle(5, 7, 1);
    g.fillCircle(10, 7, 1);
    g.generateTexture("deco_mushroom", 16, 12);
    g.destroy();

    // Flohmarkt tezgahı — 40x36: çizgili tente + masa + eşyalar
    g = this.gfx();
    g.fillStyle(0x8a5a3b);
    g.fillRect(3, 18, 34, 4); // masa üstü
    g.fillRect(5, 22, 3, 12); // ayak
    g.fillRect(32, 22, 3, 12);
    // Çizgili tente (kırmızı-beyaz)
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 === 0 ? 0xd93a3a : 0xf5f5e8);
      g.fillRect(2 + i * 6, 4, 6, 8);
    }
    g.fillStyle(0x6b4a2f);
    g.fillRect(2, 12, 36, 2); // tente alt kenar
    // Masadaki ıvır zıvır
    g.fillStyle(0x4a90d9);
    g.fillCircle(10, 16, 2);
    g.fillStyle(0xf2c53d);
    g.fillRect(16, 14, 4, 4);
    g.fillStyle(0xe89ac8);
    g.fillCircle(26, 16, 2);
    g.fillStyle(0x5ec850);
    g.fillRect(30, 14, 3, 4);
    g.generateTexture("market", 40, 36);
    g.destroy();
  }

  /** El yapımı sprite'lara 2 karelik bacak animasyonu */
  private createWalkAnimation() {
    this.anims.create({
      key: "walk",
      frames: [
        { key: "player_w1" },
        { key: "player" },
        { key: "player_w2" },
        { key: "player" },
      ],
      frameRate: 7,
      repeat: -1,
    });
    this.anims.create({
      key: "feyza-walk",
      frames: [
        { key: "feyza_w1" },
        { key: "feyza" },
        { key: "feyza_w2" },
        { key: "feyza" },
      ],
      frameRate: 7,
      repeat: -1,
    });
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

    // Ahşap bank (chill köşesi) — 32x18
    g = this.gfx();
    g.fillStyle(0x8a6238); // sırtlık
    g.fillRect(2, 0, 28, 4);
    g.fillStyle(0x9a7448); // oturak
    g.fillRect(0, 7, 32, 5);
    g.fillStyle(0x6b4a2f); // ayaklar
    g.fillRect(2, 12, 3, 6);
    g.fillRect(27, 12, 3, 6);
    g.lineStyle(1, 0x7d5c38); // tahta çizgileri
    g.lineBetween(0, 9, 32, 9);
    g.generateTexture("bench", 32, 18);
    g.destroy();

    // Çamaşır sepeti (kurutucunun dibinde "çamaşır hazır" göstergesi) — 18x14
    g = this.gfx();
    g.fillStyle(0xd96a35); // içindeki çamaşırlar
    g.fillEllipse(6, 4, 8, 5);
    g.fillStyle(0x8fb8dd);
    g.fillEllipse(12, 4, 8, 5);
    g.fillStyle(0xe89ac8);
    g.fillEllipse(9, 3, 7, 4);
    g.fillStyle(0x9a7448); // hasır gövde
    g.fillRect(1, 5, 16, 8);
    g.lineStyle(1, 0x7d5c38);
    g.lineBetween(5, 5, 5, 13);
    g.lineBetween(9, 5, 9, 13);
    g.lineBetween(13, 5, 13, 13);
    g.strokeRect(1, 5, 16, 8);
    g.generateTexture("basketIcon", 18, 14);
    g.destroy();

    // Boş çamaşır sepeti — asma sonrası kurutucunun dibinde bekler
    g = this.gfx();
    g.fillStyle(0x8a683f); // iç boşluk (koyu)
    g.fillRect(2, 3, 14, 3);
    g.fillStyle(0x9a7448); // hasır gövde
    g.fillRect(1, 5, 16, 8);
    g.lineStyle(1, 0x7d5c38);
    g.lineBetween(5, 5, 5, 13);
    g.lineBetween(9, 5, 9, 13);
    g.lineBetween(13, 5, 13, 13);
    g.strokeRect(1, 5, 16, 8);
    g.generateTexture("basketEmptyIcon", 18, 14);
    g.destroy();

    // Sinek — 6x6 (koyu gövde + açık kanatlar)
    g = this.gfx();
    g.fillStyle(0xcfe8f0, 0.9);
    g.fillRect(0, 1, 2, 2); // sol kanat
    g.fillRect(4, 1, 2, 2); // sağ kanat
    g.fillStyle(0x2a2a2a);
    g.fillRect(2, 2, 2, 3); // gövde
    g.fillRect(2, 1, 2, 1); // kafa
    g.generateTexture("fly", 6, 6);
    g.destroy();

    // Böcek — 8x6 (kahverengi kabuk + koyu kafa)
    g = this.gfx();
    g.fillStyle(0x7a4e33);
    g.fillEllipse(4, 3, 7, 5);
    g.fillStyle(0x4a3320);
    g.fillRect(0, 2, 2, 2); // kafa
    g.lineStyle(1, 0x4a3320);
    g.lineBetween(4, 0, 4, 6); // kanat çizgisi
    g.generateTexture("beetle", 8, 6);
    g.destroy();
  }

  private createCharacterTextures() {
    // Rebecca — 3 kare: dururken + 2 yürüme (bacaklar sırayla kalkar)
    this.drawRebecca("player", 0);
    this.drawRebecca("player_w1", 1); // sol bacak havada
    this.drawRebecca("player_w2", 2); // sağ bacak havada

    // Feyza — 3 kare (koyu bob saç, siyah polo, krem pantolon, tote çanta)
    this.drawFeyza("feyza", 0);
    this.drawFeyza("feyza_w1", 1);
    this.drawFeyza("feyza_w2", 2);

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

    // Spicey uyurken — kıvrılmış, gözler kapalı, kuyruk önde
    const s = this.gfx();
    s.fillStyle(0xf5f0e8); // gövde (yumak)
    s.fillEllipse(8, 10, 13, 8);
    s.fillStyle(0xe8963c); // turuncu leke
    s.fillRect(9, 7, 4, 3);
    s.fillStyle(0x2b2b2b); // siyah leke + kuyruk (öne sarılı)
    s.fillRect(3, 9, 3, 2);
    s.fillRect(3, 12, 10, 2);
    s.fillStyle(0xe8963c); // kulaklar
    s.fillRect(5, 5, 2, 2);
    s.fillStyle(0x2b2b2b);
    s.fillRect(8, 5, 2, 2);
    s.lineStyle(1, 0x8a8078); // kapalı gözler
    s.lineBetween(5, 8, 7, 8);
    s.generateTexture("cat_sleep", 16, 16);
    s.destroy();
  }

  /** legPhase: 0 duruş, 1 sol bacak havada, 2 sağ bacak havada */
  private drawRebecca(key: string, legPhase: number) {
    const g = this.gfx();
    g.fillStyle(0xe6c85a); // sarı saç
    g.fillRect(4, 0, 8, 5);
    g.fillRect(3, 1, 1, 4); // yanlar
    g.fillRect(12, 1, 1, 4);
    g.fillStyle(0xd4b048); // topuz (üstte küçük çıkıntı)
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
    // Bacaklar + sandalet — yürürken biri 1px yukarıda
    const leftUp = legPhase === 1 ? 1 : 0;
    const rightUp = legPhase === 2 ? 1 : 0;
    g.fillStyle(0xf0c8a0);
    g.fillRect(4, 20 - leftUp, 3, 3);
    g.fillRect(9, 20 - rightUp, 3, 3);
    g.fillStyle(0x7a6a55);
    g.fillRect(4, 23 - leftUp, 3, 1);
    g.fillRect(9, 23 - rightUp, 3, 1);
    g.generateTexture(key, 16, 24);
    g.destroy();
  }

  /** Feyza: kahverengi çene-hizası bob, kahverengi gözler, siyah polo, krem pantolon */
  private drawFeyza(key: string, legPhase: number) {
    const g = this.gfx();
    // Bob saç — kahverengi, yanları yüz boyunca çeneye iner
    g.fillStyle(0x6b4a2f);
    g.fillRect(3, 0, 10, 4); // tepe
    g.fillRect(2, 2, 2, 8); // sol yan (çeneye kadar)
    g.fillRect(12, 2, 2, 8); // sağ yan
    g.fillStyle(0x5a3a24); // orta ayrım gölgesi
    g.fillRect(7, 0, 2, 2);
    g.fillStyle(0xe0b088); // yüz (orta ten)
    g.fillRect(4, 4, 8, 5);
    g.fillStyle(0x5a3a2a); // kahverengi gözler
    g.fillRect(5, 5, 2, 2);
    g.fillRect(9, 5, 2, 2);
    g.fillStyle(0x111111); // siyah polo (bol)
    g.fillRect(3, 9, 10, 7);
    g.fillStyle(0x2a2a2a); // yaka + düğme detayı
    g.fillRect(6, 9, 4, 1);
    g.fillRect(7, 10, 1, 3);
    g.fillStyle(0xf2efe6); // krem geniş pantolon (bol paça)
    g.fillRect(3, 16, 10, 5);
    // Bacaklar/paçalar — yürürken biri 1px yukarı
    const leftUp = legPhase === 1 ? 1 : 0;
    const rightUp = legPhase === 2 ? 1 : 0;
    g.fillStyle(0xf2efe6);
    g.fillRect(4, 21 - leftUp, 3, 2);
    g.fillRect(9, 21 - rightUp, 3, 2);
    g.fillStyle(0xd8d2c0); // krem sandalet
    g.fillRect(4, 23 - leftUp, 3, 1);
    g.fillRect(9, 23 - rightUp, 3, 1);
    g.generateTexture(key, 16, 24);
    g.destroy();
  }
}
