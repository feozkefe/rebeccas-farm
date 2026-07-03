# 🌱 Rebecca's Farm — Doğum Günü Projesi

Kız arkadaşım **Rebecca** için doğum günü hediyesi: Berlin'deki bahçesinin pixel art
kopyasında geçen, kendisinin ve **kaliko kedisinin** olduğu küçük bir farm/gardening oyunu.

**Deadline:** 28 Temmuz 2026 (doğum günü)

---

## 1. Konsept

Kuş bakışı (top-down, Stardew Valley tarzı) rahatlatıcı bir bahçe oyunu. Oyuncu,
Rebecca'nın pixel art versiyonunu yönetiyor; bahçesinde tohum ekiyor, suluyor,
hasat ediyor, kedisiyle vakit geçiriyor ve bitkiler büyürken bankta oturup joint sarıp
chill yapıyor. Rekabet yok, kaybetme yok — sadece huzurlu bir döngü ve içine saklanmış
doğum günü sürprizleri.

## 2. Teknoloji

| Alan | Seçim |
|---|---|
| Engine | **Phaser 3** (TypeScript) |
| Build | **Vite** |
| Platform | **Web + PWA** (Android'de "ana ekrana ekle") |
| Kayıt | **localStorage** |
| Deploy | **Vercel / Netlify** (statik) |

Karar: Native APK YOK. PWA yeterli.

## 3. Görsel stil

- **Pixel art**, 16x16 tile bazlı (karakter 16x24).
- Temel: **Sprout Lands** asset paketi (ücretsiz, itch.io — Cup Nooble).
- Özelleştirme (Piskel veya Aseprite):
  - **Karakter:** Rebecca'ya benzetilecek (saç, kıyafet).
  - **Kedi:** kaliko desenli (beyaz + turuncu + siyah lekeler), gerçek kedinin
    fotoğrafından desen birebir aktarılacak.
  - **Bahçe haritası:** Berlin'deki gerçek bahçenin fotoğraflarından yerleşim
    birebir kurulacak.
- Harita: **Tiled** → Phaser JSON export.

## 4. Çekirdek döngü

```
Tohum seç → Ek → Sula → Bekle (veya chill → 2x hız) → Hasat → Coin → Yeni tohum/dekor
```

- Tap-to-move, bağlamsal aksiyon (yakındaki objeye dokun → ek/sula/hasat/pet).
- Gerçek zamanlı ama hızlı; oyun kapalıyken de büyüme devam eder (timestamp farkı).

## 5. Feature listesi

### V1 — Olmazsa olmaz (hafta 1-2)
- [x] Proje kurulumu (Vite + Phaser + TS)
- [x] Karakter hareketi (tap-to-move) — placeholder sprite ile
- [x] Kedi: haritada dolaşır, dokununca kalp çıkar — placeholder sprite ile
- [ ] Bahçe haritası (fotoğraflardan, Tiled ile)
- [ ] Asset paketi entegrasyonu + karakter/kedi özelleştirme
- [ ] Yürüme animasyonu
- [ ] 3-5 bitki: ek/sula/büyüme (3-4 stage)/hasat — Rebecca'nın gerçek bitkileri
- [ ] Coin sistemi + tohum dükkanı
- [ ] Kedi: güneşlenme/uyuma davranışları
- [ ] Joint mekaniği: banka otur → sarma animasyonu → chill mode
      (dreamy filter, lofi müzik, büyüme 2x)
- [ ] Doğum günü sahnesi: ilk açılışta kutlama + kişisel mesaj
- [ ] Save/load (localStorage) + PWA (manifest ✅, ikon, fullscreen)
- [ ] Deploy

### V2 — Zaman kalırsa (hafta 3)
- [ ] Kedi yaramazlıkları: yatağı eşeler, bazen "hediye" getirir
- [ ] Gün/gece döngüsü + Berlin yağmuru (yağmurda sulama gerekmez)
- [ ] Dekorasyon dükkanı (saksı, cüce, fener)
- [ ] Anı koleksiyonu: hedeflere ulaşınca açılan ortak fotoğraflar/notlar
- [ ] Ses efektleri
- [ ] Uzakta TV Kulesi silueti / Berlin dokunuşları

## 6. Zaman planı

| Hafta | Hedef |
|---|---|
| **1 (3-12 Tem)** | Kurulum ✅, asset seçimi/özelleştirme, harita, hareket ✅, ekim/büyüme |
| **2 (13-19 Tem)** | Kedi, chill mode, dükkan, save, HUD — **oynanabilir v1** |
| **3 (20-25 Tem)** | V2, doğum günü sahnesi, ses, mobil test, polish |
| **Buffer (26-27 Tem)** | Son test (kendi Android'inde), deploy, PWA ikonu |

## 7. Kullanıcıdan gerekenler → `reference/` klasörüne at

- [ ] Bahçe fotoğrafları → `reference/garden/`
- [ ] Kedinin fotoğrafı + **adı** → `reference/cat/`
- [ ] Bahçede yetiştirdiği bitkilerin listesi → `reference/plants.md` (veya söyle, ben yazayım)
- [ ] Doğum günü mesajı metni → `reference/birthday-message.md`
- [ ] (Opsiyonel) Anı fotoğrafları → `reference/memories/`
- [ ] Oyunun adı — şimdilik çalışma adı: **Rebecca's Farm**

> `reference/` klasörü .gitignore'a eklenmedi ama deploy'a dahil edilmiyor
> (sadece `public/` deploy'a girer). Kişisel fotoğraflar oyuna girecekse
> pixel art'a çevrilip `public/assets/` altına konacak.
