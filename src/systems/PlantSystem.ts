import Phaser from "phaser";
import { TILE } from "../data/mapLayout";
import { PLANTS, MATURE_STAGE, type PlantDef } from "../data/plants";

interface PlantedCrop {
  def: PlantDef;
  stage: number;
  watered: boolean;
  /** son sulamanın zamanı — büyüme bundan stageMs sonra */
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
 * bir sonraki aşamaya geçer. Coin, kayıt defterinde (registry) tutulur.
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
    const now = this.scene.time.now;
    if (!plot.crop) return this.plantSeed(plot, now);

    const crop = plot.crop;
    if (crop.stage >= MATURE_STAGE) return this.harvest(plot);
    if (!crop.watered) {
      crop.watered = true;
      crop.wateredAt = now;
      plot.soilImage.setTint(WATERED_TINT);
      return { action: "water", def: crop.def };
    }
    return { action: "growing", def: crop.def };
  }

  private plantSeed(plot: Plot, now: number): InteractResult {
    const def = this.selectedSeed();
    const coins = this.scene.registry.get("coins") as number;
    if (coins < def.seedPrice) return { action: "noCoins", def };

    this.scene.registry.set("coins", coins - def.seedPrice);
    const sprite = this.scene.add
      .image(plot.tx * TILE + TILE / 2, plot.ty * TILE + TILE / 2, `plant_${def.id}_0`)
      .setDepth(plot.ty * TILE + TILE);
    plot.crop = { def, stage: 0, watered: false, wateredAt: now, sprite };
    return { action: "plant", def };
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
    const now = this.scene.time.now;
    for (const plot of this.plots.values()) {
      const crop = plot.crop;
      if (!crop || !crop.watered || crop.stage >= MATURE_STAGE) continue;
      if (now - crop.wateredAt >= crop.def.stageMs) {
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
}
