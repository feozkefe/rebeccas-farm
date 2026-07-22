/**
 * localStorage kayıt sistemi.
 * Zamanlar Date.now() (epoch ms) ile tutulur — oyun kapalıyken de
 * büyüme devam eder (yüklemede geçen süre hesaba katılır).
 */

export interface CropSave {
  tx: number;
  ty: number;
  id: string; // bitki id (plants.ts)
  stage: number;
  watered: boolean;
  wateredAt: number; // epoch ms
}

export interface LaundryState {
  /** sepette bekleyen ıslak çamaşır */
  basket: number;
  /** ipte asılı çamaşır */
  hung: number;
  /** son asma zamanı (epoch ms) — kuruma bundan itibaren sayılır */
  hungAt: number;
  /** yeni sepetin geleceği zaman (epoch ms) */
  nextBasketAt: number;
}

export interface DecoSave {
  id: string; // decorations.ts id
  placed: boolean; // false = kulübe envanterinde
  tx: number;
  ty: number;
}

export interface SaveData {
  coins: number;
  seedIndex: number;
  /** sarma malzemeleri (eski kayıtlarda olmayabilir) */
  papers?: number;
  tobacco?: number;
  weed?: number;
  laundry?: LaundryState;
  decorations?: DecoSave[];
  crops: CropSave[];
  savedAt: number;
}

const KEY = "rebeccas-farm-save-v1";

export const SaveSystem = {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SaveData;
    } catch {
      return null;
    }
  },

  save(data: SaveData) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // depolama dolu/kapalıysa sessizce geç — oyun kayıtsız da oynanabilir
    }
  },
};
