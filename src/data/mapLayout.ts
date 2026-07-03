/**
 * Bahçe haritası — reference/garden/ fotoğraflarından yerleşim.
 * Kuş bakışı, kapı altta ("140" numaralı kapı), teras üstte.
 *
 * Fotoğraftaki öğeler:
 * - Üstte taş döşeli teras + beyaz masa
 * - Sol üst köşede yeşil tenteli gazebo
 * - Sağ üstte ahşap kulübe (shed)
 * - Sağ kenar boyunca tel çit + çit boyunca yürüme taşları
 * - Ortada sağda ahşap yükseltilmiş yatak (raised bed) + yanında fidan
 * - Solda çamaşır kurutma şemsiyesi + mor yapraklı ağaç
 * - Sol kenar boyunca çalılar, ortada kurumuş çim lekeleri
 */

export const MAP_W = 32;
export const MAP_H = 44;
export const TILE = 16;

export type Ground = "grass" | "dryGrass" | "paving" | "soil" | "stone";

export interface MapObject {
  texture: string;
  /** tile koordinatı */
  tx: number;
  ty: number;
  originX?: number;
  originY?: number;
}

/** Zemin katmanını üretir: grid[y][x] */
export function buildGround(): Ground[][] {
  const grid: Ground[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    grid.push(new Array<Ground>(MAP_W).fill("grass"));
  }

  // Teras (üst şerit, taş döşeme)
  for (let y = 1; y <= 8; y++) {
    for (let x = 1; x < MAP_W - 1; x++) grid[y][x] = "paving";
  }

  // Kurumuş çim lekeleri (fotoğraftaki gibi orta alanda, deterministik pseudo-random)
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let y = 14; y < 40; y++) {
    for (let x = 4; x < 26; x++) {
      // ortaya doğru daha yoğun kuruma
      const centerBias = 1 - Math.abs(x - 14) / 14;
      if (rand() < 0.25 * centerBias + 0.05) grid[y][x] = "dryGrass";
    }
  }

  // Yükseltilmiş yatak içi toprak (çevresi wood-frame objesi olarak çizilir)
  for (let y = RAISED_BED.ty + 1; y < RAISED_BED.ty + RAISED_BED.h - 1; y++) {
    for (let x = RAISED_BED.tx + 1; x < RAISED_BED.tx + RAISED_BED.w - 1; x++) {
      grid[y][x] = "soil";
    }
  }

  // Yürüme taşları: kapıdan sağ kenar boyunca terasa
  for (const [x, y] of STEPPING_STONES) grid[y][x] = "stone";

  return grid;
}

/** Yükseltilmiş yatak (tile cinsinden konum/boyut) — ekim alanı burası olacak */
export const RAISED_BED = { tx: 20, ty: 15, w: 5, h: 4 };

export const STEPPING_STONES: [number, number][] = [
  [17, 41],
  [19, 39],
  [21, 37],
  [23, 35],
  [25, 33],
  [26, 30],
  [27, 27],
  [27, 24],
  [27, 21],
  [27, 18],
  [27, 15],
  [27, 12],
  [26, 10],
];

/** Sprite olarak çizilen objeler (y'ye göre depth-sort edilir) */
export const MAP_OBJECTS: MapObject[] = [
  // Gazebo — sol üst köşe, yeşil tente
  { texture: "gazebo", tx: 1, ty: 1 },
  // Kulübe — sağ üst
  { texture: "shed", tx: 26, ty: 2 },
  // Beyaz masa + banklar — teras ortası
  { texture: "table", tx: 13, ty: 4 },
  // Mor yapraklı ağaç — sol taraf
  { texture: "treePurple", tx: 4, ty: 10 },
  // Çamaşır kurutma şemsiyesi — sol orta
  { texture: "dryer", tx: 4, ty: 17 },
  // Fidan (raised bed'in yanında)
  { texture: "treeSmall", tx: 18, ty: 14 },
  // Raised bed ahşap çerçevesi
  { texture: "bedFrame", tx: RAISED_BED.tx, ty: RAISED_BED.ty },
  // Kapı — alt orta ("140")
  { texture: "gate", tx: 13, ty: 42 },
];

/** Sol kenar çalıları + sağ kenar çiti (tekrar eden tile objeleri) */
export function buildEdgeObjects(): MapObject[] {
  const objs: MapObject[] = [];
  // Sol kenar: çalılar
  for (let y = 9; y < MAP_H - 1; y += 2) {
    objs.push({ texture: "bush", tx: 0, ty: y });
    if (y % 6 === 1) objs.push({ texture: "bush", tx: 1, ty: y + 1 });
  }
  // Sağ kenar: tel çit
  for (let y = 9; y < MAP_H - 1; y++) {
    objs.push({ texture: "fence", tx: MAP_W - 1, ty: y });
  }
  // Çit boyunca bitkiler (fotoğrafta sağ kenarda yeşillik var)
  for (let y = 11; y < MAP_H - 4; y += 4) {
    objs.push({ texture: "bush", tx: MAP_W - 2, ty: y });
  }
  // Alt kenar: kapının iki yanı çalı/çiçek
  for (let x = 1; x < MAP_W - 1; x++) {
    if (x < 13 || x > 18) objs.push({ texture: "bush", tx: x, ty: MAP_H - 1 });
  }
  // Üst kenar: ağaç sırası (terasın arkası fotoğrafta yoğun ağaçlık)
  for (let x = 2; x < MAP_W - 2; x += 4) {
    objs.push({ texture: "treeGreen", tx: x, ty: -1 });
  }
  return objs;
}
