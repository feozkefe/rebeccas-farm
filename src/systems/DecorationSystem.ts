import Phaser from "phaser";
import { TILE, MAP_W, MAP_H } from "../data/mapLayout";
import { decoById, DECORATIONS } from "../data/decorations";
import type { DecoSave } from "./SaveSystem";
import type { Sfx } from "./Sfx";

/**
 * Bahçe dekorasyonları — Flohmarkt'tan alınır, kulübe (shed) envanterine
 * düşer, oradan bahçeye yerleştirilir.
 *
 * Menü/panel yazıları zoom'suz UI sahnesinde çizilir (okunaklı, keskin).
 * Yerleştirme: bahçeyi sürükleyerek istediğin yeri ortala → "Buraya koy".
 * Ghost (hayalet) bahçe dünyasında ekran ortasında durur; kamera kayınca
 * altındaki kare değişir. Yerleştirilmiş öğeye dokun → taşı / kaldır.
 */

interface DecoItem {
  id: string;
  placed: boolean;
  tx: number;
  ty: number;
  img: Phaser.GameObjects.Image | null;
}

export interface DecoCtx {
  scene: Phaser.Scene; // Garden (zoomlu)
  sfx: Sfx;
  save: () => void;
  suppressTap: () => void;
}

export class DecorationSystem {
  private c: DecoCtx;
  private items: DecoItem[] = [];
  private uiLayer: Phaser.GameObjects.Container | null = null; // UI sahnesinde panel/menü
  private ghost: Phaser.GameObjects.Image | null = null; // bahçe dünyasında
  private placingItem: DecoItem | null = null;

  constructor(ctx: DecoCtx, saved?: DecoSave[]) {
    this.c = ctx;
    if (saved) {
      for (const s of saved) {
        if (!decoById(s.id)) continue;
        this.items.push({ id: s.id, placed: s.placed, tx: s.tx, ty: s.ty, img: null });
      }
    }
    this.renderPlaced();
    this.syncOwnedCounts();
  }

  private ui(): Phaser.Scene {
    return this.c.scene.scene.get("UI");
  }

  serialize(): DecoSave[] {
    return this.items.map((i) => ({ id: i.id, placed: i.placed, tx: i.tx, ty: i.ty }));
  }

  private syncOwnedCounts() {
    const counts: Record<string, number> = {};
    for (const d of DECORATIONS) counts[d.id] = 0;
    for (const i of this.items) counts[i.id] = (counts[i.id] ?? 0) + 1;
    for (const [id, n] of Object.entries(counts)) {
      this.c.scene.registry.set(`owned_${id}`, n);
    }
  }

  addOwned(id: string) {
    if (!decoById(id)) return;
    this.items.push({ id, placed: false, tx: 0, ty: 0, img: null });
    this.syncOwnedCounts();
    this.c.save();
  }

  private renderPlaced() {
    for (const item of this.items) {
      if (item.placed && !item.img) this.createImage(item);
    }
  }

  private createImage(item: DecoItem) {
    const img = this.c.scene.add
      .image(item.tx * TILE + TILE / 2, item.ty * TILE + TILE / 2, `deco_${item.id}`)
      .setOrigin(0.5, 0.8)
      .setInteractive({ useHandCursor: true });
    img.setDepth(img.y + img.displayHeight / 2);
    img.on(
      "pointerdown",
      (_p: unknown, _x: unknown, _y: unknown, ev?: { stopPropagation?: () => void }) => {
        ev?.stopPropagation?.();
        this.c.suppressTap();
        if (!this.isPlacing()) this.openItemMenu(item);
      }
    );
    item.img = img;
  }

  // ---------- kulübe envanteri (UI sahnesi) ----------

  openInventory() {
    if (this.isPlacing()) return;
    this.clearUi();
    const ui = this.ui();
    const w = ui.scale.width;
    const h = ui.scale.height;
    const unplaced = this.items.filter((i) => !i.placed);

    const layer = ui.add.container(0, 0).setDepth(90000);
    // Yarı saydam arka fon (dokununca kapat)
    const shade = ui.add
      .rectangle(0, 0, w, h, 0x000000, 0.45)
      .setOrigin(0)
      .setInteractive();
    shade.on("pointerdown", () => this.clearUi());
    layer.add(shade);

    const pw = Math.min(w * 0.9, 420);
    const ph = Math.min(h * 0.7, 460);
    const cx = w / 2;
    const cy = h / 2;
    const panel = ui.add.graphics();
    panel.fillStyle(0x2a2038, 0.98);
    panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 14);
    panel.lineStyle(3, 0x9a7448, 0.95);
    panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 14);
    layer.add(panel);

    layer.add(
      ui.add
        .text(cx, cy - ph / 2 + 16, "🏚️  Kulübe — Shed", {
          fontFamily: "monospace",
          fontSize: "20px",
          color: "#f0e0d0",
        })
        .setOrigin(0.5, 0)
    );

    if (unplaced.length === 0) {
      layer.add(
        ui.add
          .text(cx, cy, "Envanter boş.\nKapıdan çık → Flohmarkt 🛒", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#c8b8a0",
            align: "center",
            lineSpacing: 6,
          })
          .setOrigin(0.5)
      );
    } else {
      const cols = 3;
      const cellW = pw / cols;
      const cellH = 100;
      unplaced.forEach((item, i) => {
        const def = decoById(item.id)!;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ix = cx - pw / 2 + cellW * (col + 0.5);
        const iy = cy - ph / 2 + 70 + row * cellH;

        const card = ui.add
          .rectangle(ix, iy, cellW - 12, cellH - 12, 0x3a3048, 0.9)
          .setStrokeStyle(2, 0x9a7448, 0.6)
          .setInteractive({ useHandCursor: true });
        layer.add(card);
        layer.add(
          ui.add.text(ix, iy - 16, def.emoji, { fontSize: "34px" }).setOrigin(0.5)
        );
        layer.add(
          ui.add
            .text(ix, iy + 26, def.name, {
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#e8d8c0",
              align: "center",
              wordWrap: { width: cellW - 16 },
            })
            .setOrigin(0.5)
        );
        card.on("pointerdown", () => {
          this.clearUi();
          this.beginPlacement(item);
        });
      });
    }

    const close = ui.add
      .text(cx + pw / 2 - 18, cy - ph / 2 + 14, "✕", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#f0e0d0",
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.clearUi());
    layer.add(close);

    this.uiLayer = layer;
  }

  private clearUi() {
    this.uiLayer?.destroy();
    this.uiLayer = null;
  }

  // ---------- yerleştirme (kaydır + onayla) ----------

  private beginPlacement(item: DecoItem) {
    this.placingItem = item;
    this.c.scene.registry.set("placing", true);
    const cam = this.c.scene.cameras.main;
    cam.stopFollow();
    // Taşımada mevcut konumunu ortala, yeni öğede mevcut görünümü koru
    if (item.placed) cam.centerOn(item.tx * TILE + TILE / 2, item.ty * TILE + TILE / 2);

    this.ghost?.destroy();
    this.ghost = this.c.scene.add
      .image(cam.midPoint.x, cam.midPoint.y, `deco_${item.id}`)
      .setOrigin(0.5, 0.8)
      .setAlpha(0.65)
      .setDepth(999999);
    this.c.scene.tweens.add({
      targets: this.ghost,
      alpha: 0.35,
      duration: 550,
      yoyo: true,
      repeat: -1,
    });

    this.buildPlacementBar();
  }

  private buildPlacementBar() {
    this.clearUi();
    const ui = this.ui();
    const w = ui.scale.width;
    const h = ui.scale.height;
    const layer = ui.add.container(0, 0).setDepth(95000);

    // Ekran ortasında bırakma göstergesi (nişangah)
    const cross = ui.add.graphics();
    cross.lineStyle(2, 0xffffff, 0.7);
    cross.strokeCircle(w / 2, h / 2, 10);
    cross.lineBetween(w / 2 - 14, h / 2, w / 2 + 14, h / 2);
    cross.lineBetween(w / 2, h / 2 - 14, w / 2, h / 2 + 14);
    layer.add(cross);

    layer.add(
      ui.add
        .text(w / 2, 18, "Sürükle → yerini seç, sonra Buraya koy", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#ffffff",
          backgroundColor: "#2a4a3acc",
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5, 0)
    );

    const place = ui.add
      .text(w / 2 - 8, h - 20, "✓ Buraya koy", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#3a8a4a",
        padding: { x: 16, y: 10 },
      })
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true });
    place.on("pointerdown", () => this.confirmPlacement());
    layer.add(place);

    const cancel = ui.add
      .text(w / 2 + 8, h - 20, "✕ Vazgeç", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#8a3a3a",
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true });
    cancel.on("pointerdown", () => this.cancelPlacement());
    layer.add(cancel);

    this.uiLayer = layer;
  }

  /** Her karede ghost'u ekran ortasına (kamera midPoint) sabitle. */
  update() {
    if (this.ghost && this.isPlacing()) {
      const m = this.c.scene.cameras.main.midPoint;
      this.ghost.setPosition(m.x, m.y).setDepth(999999);
    }
  }

  private confirmPlacement() {
    const item = this.placingItem;
    if (!item) return;
    const m = this.c.scene.cameras.main.midPoint;
    const tx = Phaser.Math.Clamp(Math.floor(m.x / TILE), 1, MAP_W - 2);
    const ty = Phaser.Math.Clamp(Math.floor(m.y / TILE), 1, MAP_H - 2);
    item.tx = tx;
    item.ty = ty;
    item.placed = true;
    if (item.img) {
      item.img
        .setPosition(tx * TILE + TILE / 2, ty * TILE + TILE / 2)
        .setDepth(ty * TILE + TILE);
    } else {
      this.createImage(item);
    }
    this.c.sfx.plant();
    this.endPlacement();
    this.c.save();
  }

  private cancelPlacement() {
    this.endPlacement();
  }

  private endPlacement() {
    this.c.scene.registry.set("placing", false);
    this.placingItem = null;
    this.ghost?.destroy();
    this.ghost = null;
    this.clearUi();
    // Kamera Rebecca'yı takibe geri dönsün
    const player = (this.c.scene as unknown as { player: Phaser.GameObjects.Sprite }).player;
    if (player) this.c.scene.cameras.main.startFollow(player, true, 0.12, 0.12);
  }

  // ---------- yerleştirilmiş öğe menüsü (UI sahnesi, alt bar) ----------

  private openItemMenu(item: DecoItem) {
    if (!item.img) return;
    this.clearUi();
    const ui = this.ui();
    const w = ui.scale.width;
    const h = ui.scale.height;
    const def = decoById(item.id)!;
    const layer = ui.add.container(0, 0).setDepth(96000);

    const barY = h - 64;
    const bar = ui.add.graphics();
    bar.fillStyle(0x2a2038, 0.96);
    bar.fillRoundedRect(w / 2 - 170, barY, 340, 52, 10);
    bar.lineStyle(2, 0x9a7448, 0.8);
    bar.strokeRoundedRect(w / 2 - 170, barY, 340, 52, 10);
    layer.add(bar);

    layer.add(
      ui.add
        .text(w / 2 - 150, barY + 26, `${def.emoji}`, { fontSize: "24px" })
        .setOrigin(0.5)
    );

    const move = ui.add
      .text(w / 2 - 40, barY + 26, "↔ Taşı", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#3a7a5a",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    move.on("pointerdown", () => {
      this.clearUi();
      this.beginPlacement(item);
    });
    layer.add(move);

    const store = ui.add
      .text(w / 2 + 80, barY + 26, "🏚️ Kaldır", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#8a5a3a",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    store.on("pointerdown", () => this.storeItem(item));
    layer.add(store);

    const close = ui.add
      .text(w / 2 + 158, barY + 6, "✕", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#e0d0c0",
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.clearUi());
    layer.add(close);

    this.uiLayer = layer;
    ui.time.delayedCall(4000, () => {
      if (this.uiLayer === layer) this.clearUi();
    });
  }

  private storeItem(item: DecoItem) {
    item.placed = false;
    item.img?.destroy();
    item.img = null;
    this.clearUi();
    this.c.sfx.harvest();
    this.c.save();
  }

  isPlacing() {
    return this.c.scene.registry.get("placing") === true;
  }
}
