import Phaser from "phaser";
import { TILE } from "../data/mapLayout";
import { PLANTS, MATURE_STAGE, type PlantDef } from "../data/plants";
import type { CropSave } from "./SaveSystem";

interface PlantedCrop {
  def: PlantDef;
  stage: number;
  watered: boolean;
  /** son sulama zamanı (epoch ms) — büyüme bundan stageMs sonra */
  wateredAt: number;
  sprite: Phaser.GameObjects.Image;
}

export interface Plot {
  tx: number;
  ty: number;
  soilImage: Phaser.GameObjects.Image;
  crop: PlantedCrop | null;
}

export interface InteractResult {
  action: "plant" | "water" | "harvest" | "growing" | "noCoins";
  def: PlantDef;
  earned?: number;
}

const WATERED_TINT = 0x9a86c8; // ıslak toprak: hafif koyu/mor ton

/**
 * Ekim → sulama → büyüme → hasat döngüsü.
 * Her aşama için bir kez sulamak gerekiyor; sulanınca stageMs sonra
 * bir sonraki aşamaya geçer. Zaman epoch ms — oyun kapalıyken de işler.
 * Chill mode aktifken (registry "chillUntil") büyüme 2x hızlı.
 */
export class PlantSystem {
  private plots = new Map<string, Plot>();

  constructor(
    private scene: Phaser.Scene,
    plotTiles: [number, number][],
    soilImages: Map<string, Phaser.GameObjects.Image>
  ) {
    for (const [tx, ty] of plotTiles) {
      const key = `${tx},${ty}`;
      const soilImage = soilImages.get(key);
      if (!soilImage) continue;
      soilImage.setInteractive();
      this.plots.set(key, { tx, ty, soilImage, crop: null });
    }
  }

  getPlotAt(tx: number, ty: number): Plot | undefined {
    return this.plots.get(`${tx},${ty}`);
  }

  /** Oyuncu plota ulaştığında çağrılır; bağlama göre ek/sula/hasat yapar. */
  interact(plot: Plot): InteractResult {
    if (!plot.crop) return this.plantSeed(plot);

    const crop = plot.crop;
    if (crop.stage >= MATURE_STAGE) return this.harvest(plot);
    if (!crop.watered) {
      crop.watered = true;
      crop.wateredAt = Date.now();
      plot.soilImage.setTint(WATERED_TINT);
      return { action: "water", def: crop.def };
    }
    return { action: "growing", def: crop.def };
  }

  private plantSeed(plot: Plot): InteractResult {
    const def = this.selectedSeed();
    const coins = this.scene.registry.get("coins") as number;
    if (coins < def.seedPrice) return { action: "noCoins", def };

    this.scene.registry.set("coins", coins - def.seedPrice);
    plot.crop = this.createCrop(plot, def, 0, false, Date.now());
    return { action: "plant", def };
  }

  private createCrop(
    plot: Plot,
    def: PlantDef,
    stage: number,
    watered: boolean,
    wateredAt: number
  ): PlantedCrop {
    const sprite = this.scene.add
      .image(
        plot.tx * TILE + TILE / 2,
        plot.ty * TILE + TILE / 2,
        `plant_${def.id}_${stage}`
      )
      .setDepth(plot.ty * TILE + TILE);
    if (watered) plot.soilImage.setTint(WATERED_TINT);
    return { def, stage, watered, wateredAt, sprite };
  }

  private harvest(plot: Plot): InteractResult {
    const crop = plot.crop!;
    crop.sprite.destroy();
    plot.crop = null;
    plot.soilImage.clearTint();
    const coins = this.scene.registry.get("coins") as number;
    this.scene.registry.set("coins", coins + crop.def.sellPrice);
    return { action: "harvest", def: crop.def, earned: crop.def.sellPrice };
  }

  private selectedSeed(): PlantDef {
    const idx = (this.scene.registry.get("seedIndex") as number) ?? 0;
    return PLANTS[idx % PLANTS.length];
  }

  /** Büyüme tick'i — sulanmış ekinler süre dolunca aşama atlar. */
  update() {
    const now = Date.now();
    const chill = (this.scene.registry.get("chilling") as boolean) ?? false;
    for (const plot of this.plots.values()) {
      const crop = plot.crop;
      if (!crop || !crop.watered || crop.stage >= MATURE_STAGE) continue;
      const required = chill ? crop.def.stageMs / 2 : crop.def.stageMs;
      if (now - crop.wateredAt >= required) {
        crop.stage++;
        crop.watered = false;
        crop.sprite.setTexture(`plant_${crop.def.id}_${crop.stage}`);
        plot.soilImage.clearTint();
        // Hasat hazır: hafif zıplama ile dikkat çek
        if (crop.stage >= MATURE_STAGE) {
          this.scene.tweens.add({
            targets: crop.sprite,
            y: crop.sprite.y - 2,
            duration: 300,
            yoyo: true,
            repeat: 2,
          });
        }
      }
    }
  }

  /** Yağmur: sulanmamış tüm ekinleri sular. */
  waterAll() {
    const now = Date.now();
    for (const plot of this.plots.values()) {
      const crop = plot.crop;
      if (!crop || crop.watered || crop.stage >= MATURE_STAGE) continue;
      crop.watered = true;
      crop.wateredAt = now;
      plot.soilImage.setTint(WATERED_TINT);
    }
  }

  /** Kedi yaramazlığı hedefi: sulanmış rastgele bir plot (yoksa null). */
  randomWateredPlot(): Plot | null {
    const candidates = [...this.plots.values()].filter(
      (p) => p.crop && p.crop.watered && p.crop.stage < MATURE_STAGE
    );
    return candidates.length > 0 ? Phaser.Math.RND.pick(candidates) : null;
  }

  /** Kedi eşeledi: sulanmışlığı bozar. */
  unwater(plot: Plot) {
    if (!plot.crop) return;
    plot.crop.watered = false;
    plot.soilImage.clearTint();
  }

  /** Kayıt için ekin durumlarını döker. */
  serialize(): CropSave[] {
    const out: CropSave[] = [];
    for (const plot of this.plots.values()) {
      if (!plot.crop) continue;
      const c = plot.crop;
      out.push({
        tx: plot.tx,
        ty: plot.ty,
        id: c.def.id,
        stage: c.stage,
        watered: c.watered,
        wateredAt: c.wateredAt,
      });
    }
    return out;
  }

  /** Kayıttan ekinleri geri yükler; geçen süre update() ile işlenir. */
  restore(crops: CropSave[]) {
    for (const s of crops) {
      const plot = this.getPlotAt(s.tx, s.ty);
      const def = PLANTS.find((p) => p.id === s.id);
      if (!plot || plot.crop || !def) continue;
      const stage = Phaser.Math.Clamp(s.stage, 0, MATURE_STAGE);
      plot.crop = this.createCrop(plot, def, stage, s.watered, s.wateredAt);
    }
  }
}
