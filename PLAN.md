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
- **KARAR (4 Tem):** Tüm görseller **el yapımı** (kodla üretilen dokular) —
  Sprout Lands denendi, kullanıcı el yapımı karakterleri daha tatlı buldu.
  Paket `reference/sprout-lands/` altında duruyor ama KULLANILMIYOR.
  - **Rebecca:** sarı topuz, mavi göz, turuncu tişört, yırtık kot şort ✅
  - **Spicey:** kaliko desen (beyaz + turuncu + siyah) ✅ — kullanıcı onayladı
  - **Bahçe haritası:** fotoğraflardan kodla kurulu (`src/data/mapLayout.ts`) ✅

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
- [x] Kedi (**Spicey**): haritada dolaşır, dokununca kalp çıkar + Rebecca konuşur
- [x] Bahçe haritası (fotoğraflardan, kod ile — `src/data/mapLayout.ts`)
- [x] Rebecca sprite'ı: sarı topuz, mavi göz, turuncu tişört, yırtık kot şort
- [x] 6 bitki: ek/sula/büyüme (4 stage)/hasat — domates, biber, zambak (gerçek)
      + çilek, marul, ayçiçeği (`src/data/plants.ts`, `src/systems/PlantSystem.ts`)
- [x] Coin sistemi + tohum seçici HUD (`src/ui/HUD.ts`)
- [x] Konuşma balonları: İngilizce + arada B2 Türkçe karışık
- [x] 6 yatak, düzenli 2x3 ızgara (36 ekim karesi)
- [x] Yürüme animasyonu (2 karelik bacak hareketi + yöne göre flip)
- [x] Kedi: dolaşma + kıvrılıp uyuma (Zzz baloncukları)
- [x] Joint mekaniği: banka otur → duman bulutları → chill mode
      (mor dreamy filtre, süzülen notalar, büyüme 2x, 60 sn) — müzik sonra
- [x] Save/load (localStorage, 5 sn'de bir otomatik) + kapalıyken büyüme
- [x] PWA: manifest, domates ikonu (192/512), service worker (offline)
- [ ] Doğum günü sahnesi: ilk açılışta kutlama + kişisel mesaj (EN SON — mesaj bekleniyor)
- [ ] Deploy (Vercel/Netlify — kullanıcı hesabı gerekiyor)

### V2 — Zaman kalırsa (hafta 3)
- [x] Kedi yaramazlıkları: sulanmış yatağı eşeler (sulama bozulur),
      bazen oyuncuya hediye getirir (+5c)
- [x] Gün/gece tonu (cihaz saatine göre: şafak/gündüz/akşamüstü/gece)
- [x] Berlin yağmuru: arada 35-70 sn yağar, tüm ekinleri sular, gri ton + damlalar
- [x] Ses efektleri: Web Audio ile üretilen chiptune sesler (ek/sula/hasat/
      coin/mır/eşeleme/hediye/yağmur) — dosya yok, kodda
- [x] Uzakta TV Kulesi silueti (terasın arkasında, akşam göğüyle)
- [ ] Dekorasyon dükkanı (saksı, cüce, fener)
- [ ] Anı koleksiyonu: hedeflere ulaşınca açılan ortak fotoğraflar/notlar
      (kullanıcıdan fotoğraf bekleniyor)
- [ ] Lofi müzik (chill mode için)

## 6. Zaman planı

| Hafta | Hedef |
|---|---|
| **1 (3-12 Tem)** | Kurulum ✅, asset seçimi/özelleştirme, harita, hareket ✅, ekim/büyüme |
| **2 (13-19 Tem)** | Kedi, chill mode, dükkan, save, HUD — **oynanabilir v1** |
| **3 (20-25 Tem)** | V2, doğum günü sahnesi, ses, mobil test, polish |
| **Buffer (26-27 Tem)** | Son test (kendi Android'inde), deploy, PWA ikonu |

## 7. Kullanıcıdan gerekenler → `reference/` klasörüne at

- [ ] Bahçe fotoğrafları → `reference/garden/`
- [x] Kedinin adı: **Spicey** — fotoğrafı hâlâ bekleniyor → `reference/cat/`
- [ ] Bahçede yetiştirdiği bitkilerin listesi → `reference/plants.md` (veya söyle, ben yazayım)
- [ ] Doğum günü mesajı metni → `reference/birthday-message.md`
- [ ] (Opsiyonel) Anı fotoğrafları → `reference/memories/`
- [x] Oyunun adı: **Rebecca's Farm** (kesinleşti)

> `reference/` klasörü .gitignore'a eklenmedi ama deploy'a dahil edilmiyor
> (sadece `public/` deploy'a girer). Kişisel fotoğraflar oyuna girecekse
> pixel art'a çevrilip `public/assets/` altına konacak.
