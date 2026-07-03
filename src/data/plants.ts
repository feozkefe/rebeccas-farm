/**
 * Bitki tanımları — Rebecca'nın gerçekten yetiştirdikleri (domates, biber, zambak)
 * + oyun için eklenenler (çilek, marul, ayçiçeği).
 * Görseller şimdilik BootScene'de bu renklerden üretiliyor;
 * Sprout Lands / özel sprite'lar gelince texture key'leri aynı kalacak.
 */

export interface PlantDef {
  id: string;
  /** HUD ve konuşma balonlarında görünen ad (oyun dili İngilizce) */
  name: string;
  emoji: string;
  seedPrice: number;
  sellPrice: number;
  /** sulandıktan sonra bir aşama büyümenin süresi (ms) */
  stageMs: number;
  /** çiçek mi (meyve yerine tepede çiçek çizilir) */
  flower?: boolean;
  leafColor: number;
  accentColor: number; // meyve / çiçek rengi
  accentDark: number;
}

/** Aşamalar: 0 fide, 1 genç, 2 olgunlaşıyor, 3 hasat hazır */
export const STAGE_COUNT = 4;
export const MATURE_STAGE = STAGE_COUNT - 1;

export const PLANTS: PlantDef[] = [
  {
    id: "tomato",
    name: "Tomato",
    emoji: "🍅",
    seedPrice: 10,
    sellPrice: 25,
    stageMs: 45_000,
    leafColor: 0x3e8e3e,
    accentColor: 0xe23d2e,
    accentDark: 0xb52c20,
  },
  {
    id: "pepper",
    name: "Pepper",
    emoji: "🫑",
    seedPrice: 12,
    sellPrice: 30,
    stageMs: 55_000,
    leafColor: 0x2f7a3e,
    accentColor: 0x4caf50,
    accentDark: 0x2e7d32,
  },
  {
    id: "strawberry",
    name: "Strawberry",
    emoji: "🍓",
    seedPrice: 8,
    sellPrice: 20,
    stageMs: 35_000,
    leafColor: 0x4a9e4a,
    accentColor: 0xe0455a,
    accentDark: 0xb8324a,
  },
  {
    id: "lettuce",
    name: "Lettuce",
    emoji: "🥬",
    seedPrice: 5,
    sellPrice: 12,
    stageMs: 25_000,
    leafColor: 0x7ec850,
    accentColor: 0xa5d96a,
    accentDark: 0x6aa844,
  },
  {
    id: "sunflower",
    name: "Sunflower",
    emoji: "🌻",
    seedPrice: 6,
    sellPrice: 15,
    stageMs: 40_000,
    flower: true,
    leafColor: 0x4a8e3a,
    accentColor: 0xf2c53d,
    accentDark: 0x8a5a2b,
  },
  {
    id: "lily",
    name: "Lily",
    emoji: "🌸",
    seedPrice: 15,
    sellPrice: 40,
    stageMs: 60_000,
    flower: true,
    leafColor: 0x3e7a4e,
    accentColor: 0xf5e8f0,
    accentDark: 0xd97ba8,
  },
];
