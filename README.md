# 🌱 Rebecca's Farm

A cozy top-down gardening game made as a birthday gift — a pixel-art recreation
of Rebecca's real garden in Berlin, starring her and her calico cat **Spicey**.
No competition, no losing: just planting, watering, harvesting, chilling on the
bench, and small everyday moments with a cat.

**▶️ Play it live: [rebeccas-farm-production.up.railway.app](https://rebeccas-farm-production.up.railway.app)**

> Best on a phone — open the link in your mobile browser and use "Add to Home
> Screen" to play it fullscreen like a real app. Works offline after the first load.

---

## ✨ Features

- **Grow a garden** — Plant six crops (tomato, pepper, lily, strawberry, lettuce,
  sunflower) across raised beds. Tap a bed to walk over and plant, water, or
  harvest. Crops grow through four stages and keep growing while the game is
  closed (real-time based).
- **Spicey, the calico cat** — Wanders the garden, curls up for naps with little
  Zzz's, and purrs when you pet her. She hunts flies and beetles that wander in,
  then proudly carries her catch to Rebecca for a coin and a thank-you.
- **Chill mode** — Sit on the terrace bench and roll one in a calm, first-person
  rolling scene (paper → tobacco → green → roll → seal). Once lit, the screen
  turns dreamy purple, the lo-fi music slows down with reverb, and plants grow 2×.
- **Kiosk 44 (the Späti)** — Tap the garden gate to visit the corner shop, modeled
  on the real one. Buy papers, tobacco, and green from the shelves, pet the
  sleeping counter cat, and chat with **Hamudi** behind the counter (in German).
- **Laundry routine** — Hang the wet laundry on the rotary dryer, watch it sway
  in the wind, and collect it once it's dry for a few coins. Berlin rain will
  re-soak it, so keep an eye on the sky.
- **Living world** — A day/night tint follows the real clock, Berlin rain rolls
  through now and then (and waters the crops for free), and Rebecca chats to
  herself in a mix of English and Turkish.
- **Sound** — Chiptune sound effects and a generated lo-fi soundtrack, all
  synthesized in-browser (no audio files). Toggle with the 🔊 button.
- **Saves automatically** — Progress lives in `localStorage`; coins, crops,
  supplies, and laundry all persist, and offline growth is calculated on load.

## 🛠️ Tech

| Area | Choice |
|---|---|
| Engine | [Phaser 3](https://phaser.io/) (TypeScript) |
| Build | [Vite](https://vitejs.dev/) |
| Platform | Web + PWA (installable, offline-capable) |
| Saves | `localStorage` |
| Hosting | [Railway](https://railway.app/) (auto-deploys on push) |

All art is **hand-made programmatic pixel art** — every sprite, tile, and scene
is drawn in code (`BootScene`), no external asset packs.

## 🚀 Running locally

```bash
npm install
npm run dev      # dev server at http://localhost:5173
```

```bash
npm run build    # production build into dist/
npm start        # serve the built dist/ (used by Railway)
```

## 📁 Project structure

```
src/
├── main.ts                 # Phaser game config + scene registry
├── scenes/
│   ├── BootScene.ts        # generates all textures & animations
│   ├── GardenScene.ts      # main garden: movement, cat, plants, rain, bugs
│   ├── RollScene.ts        # first-person rolling mini-scene
│   ├── LaundryScene.ts     # hang & collect laundry
│   └── SpatiScene.ts       # Kiosk 44 shop + Hamudi
├── systems/
│   ├── PlantSystem.ts      # planting / watering / growth / harvest
│   ├── SaveSystem.ts       # localStorage save/load
│   ├── AudioEngine.ts      # shared Web Audio context + mute
│   ├── Sfx.ts              # chiptune sound effects
│   └── Music.ts            # generated lo-fi soundtrack
├── data/
│   ├── plants.ts           # crop definitions
│   └── mapLayout.ts        # garden layout from reference photos
└── ui/
    └── HUD.ts              # coins, supplies, seed picker, overlays
```

## 🎂 Status

An evolving birthday gift, built feature by feature. Roadmap and notes live in
[PLAN.md](PLAN.md). Still to come: a Flohmarkt decoration shop, a memory album,
and a birthday surprise scene.

---

<sub>Made with 🌿 in Berlin.</sub>
