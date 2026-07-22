import Phaser from "phaser";
import { TILE, MAP_W, MAP_H } from "../data/mapLayout";
import { decoById } from "../data/decorations";
import type { DecoSave } from "./SaveSystem";
import type { Sfx } from "./Sfx";

/**
 * Bahçe dekorasyonları — Flohmarkt'tan alınır, kulübe (shed) envanterine
 * düşer, oradan bahçeye yerleştirilir. Yerleştirilen öğeye dokununca
 * taşı / kulübeye kaldır menüsü açılır.
 *
 * Yerleştirme modu: kulübe envanterinden öğe seç → bahçede bir yere dokun.
 * registry "placing" = true iken bahçe dokunuşları buraya yönlenir.
 */

interface DecoItem {
  id: string;
  placed: boolean;
  tx: number;
  ty: number;
  img: Phaser.GameObjects.Image | null;
}

export interface DecoCtx {
  scene: Phaser.Scene;
  sfx: Sfx;
  save: () => void;
  suppressTap: () => void; // sonraki bahçe tap'ini yut
}

export class DecorationSystem {
  private c: DecoCtx;
  private items: DecoItem[] = [];
  private panel: Phaser.GameObjects.Container | null = null;
  private menu: Phaser.GameObjects.Container | null = null;
  private ghost: Phaser.GameObjects.Image | null = null;
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

  /** Flohmarkt'ın "sahip: N" göstergesi için registry'ye toplamları yaz. */
  private syncOwnedCounts() {
    const counts: Record<string, number> = {};
    for (const i of this.items) counts[i.id] = (counts[i.id] ?? 0) + 1;
    for (const [id, n] of Object.entries(counts)) {
      this.c.scene.registry.set(`owned_${id}`, n);
    }
  }

  serialize(): DecoSave[] {
    return this.items.map((i) => ({ id: i.id, placed: i.placed, tx: i.tx, ty: i.ty }));
  }

  /** Flohmarkt satın aldı: envantere ekle (yerleştirilmemiş). */
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
    img.on("pointerdown", (
      _p: unknown,
      _x: unknown,
      _y: unknown,
      ev?: { stopPropagation?: () => void }
    ) => {
      ev?.stopPropagation?.();
      this.c.suppressTap();
      if (!this.c.scene.registry.get("placing")) this.openItemMenu(item);
    });
    item.img = img;
  }

  // ---------- kulübe envanteri ----------

  /** Kulübeye dokununca: sahip olunan (yerleştirilmemiş) öğeler paneli. */
  openInventory() {
    if (this.c.scene.registry.get("placing")) return;
    this.panel?.destroy();
    this.menu?.destroy();
    const scene = this.c.scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const cam = scene.cameras.main;
    // Ekran ortasına sabit panel (kameradan bağımsız)
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;

    const unplaced = this.items.filter((i) => !i.placed);
    const panel = scene.add.container(cx, cy).setDepth(90000);

    const pw = Math.min(w * 0.86, 300) / cam.zoom;
    const ph = Math.min(h * 0.6, 240) / cam.zoom;
    const bg = scene.add.graphics();
    bg.fillStyle(0x2a2038, 0.96);
    bg.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 8 / cam.zoom);
    bg.lineStyle(2 / cam.zoom, 0x9a7448, 0.9);
    bg.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 8 / cam.zoom);
    panel.add(bg);

    const title = scene.add
      .text(0, -ph / 2 + 8 / cam.zoom, "🏚️ Shed — Kulübe", {
        fontFamily: "monospace",
        fontSize: `${Math.round(11 / cam.zoom)}px`,
        color: "#f0e0d0",
      })
      .setOrigin(0.5, 0);
    panel.add(title);

    if (unplaced.length === 0) {
      const empty = scene.add
        .text(0, 0, "Boş. Flohmarkt'tan\nalışveriş yap 🛒", {
          fontFamily: "monospace",
          fontSize: `${Math.round(9 / cam.zoom)}px`,
          color: "#b8a890",
          align: "center",
        })
        .setOrigin(0.5);
      panel.add(empty);
    } else {
      // Öğe ızgarası (3 sütun)
      const cols = 3;
      const cell = pw / (cols + 0.5);
      unplaced.forEach((item, i) => {
        const def = decoById(item.id)!;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ix = -pw / 2 + cell * (col + 0.75);
        const iy = -ph / 2 + 30 / cam.zoom + row * cell;
        const card = scene.add
          .text(ix, iy, def.emoji, { fontSize: `${Math.round(20 / cam.zoom)}px` })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        card.on("pointerdown", (
          _p: unknown,
          _x: unknown,
          _y: unknown,
          ev?: { stopPropagation?: () => void }
        ) => {
          ev?.stopPropagation?.();
          this.c.suppressTap();
          this.closeInventory();
          this.beginPlacement(item);
        });
        panel.add(card);
      });
    }

    const close = scene.add
      .text(pw / 2 - 12 / cam.zoom, -ph / 2 + 8 / cam.zoom, "✕", {
        fontFamily: "monospace",
        fontSize: `${Math.round(12 / cam.zoom)}px`,
        color: "#f0e0d0",
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", (
      _p: unknown,
      _x: unknown,
      _y: unknown,
      ev?: { stopPropagation?: () => void }
    ) => {
      ev?.stopPropagation?.();
      this.c.suppressTap();
      this.closeInventory();
    });
    panel.add(close);

    this.panel = panel;
  }

  private closeInventory() {
    this.panel?.destroy();
    this.panel = null;
  }

  // ---------- yerleştirme modu ----------

  private beginPlacement(item: DecoItem) {
    this.placingItem = item;
    this.c.scene.registry.set("placing", true);
    const cam = this.c.scene.cameras.main;
    this.ghost?.destroy();
    this.ghost = this.c.scene.add
      .image(cam.midPoint.x, cam.midPoint.y, `deco_${item.id}`)
      .setOrigin(0.5, 0.8)
      .setAlpha(0.6)
      .setDepth(95000);
    this.c.scene.tweens.add({
      targets: this.ghost,
      alpha: 0.35,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    this.showPlaceHint();
  }

  private showPlaceHint() {
    const scene = this.c.scene;
    const cam = scene.cameras.main;
    this.menu?.destroy();
    const hint = scene.add
      .text(cam.midPoint.x, cam.worldView.y + 14 / cam.zoom, "Tap to place — dokun 📍", {
        fontFamily: "monospace",
        fontSize: `${Math.round(10 / cam.zoom)}px`,
        color: "#ffffff",
        backgroundColor: "#3a7a4acc",
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(95001);
    const cancel = scene.add
      .text(cam.midPoint.x, cam.worldView.y + 34 / cam.zoom, "✕ vazgeç", {
        fontFamily: "monospace",
        fontSize: `${Math.round(9 / cam.zoom)}px`,
        color: "#ffffff",
        backgroundColor: "#7a3a3acc",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setDepth(95001)
      .setInteractive({ useHandCursor: true });
    cancel.on("pointerdown", (
      _p: unknown,
      _x: unknown,
      _y: unknown,
      ev?: { stopPropagation?: () => void }
    ) => {
      ev?.stopPropagation?.();
      this.c.suppressTap();
      this.cancelPlacement();
    });
    this.menu = scene.add.container(0, 0, [hint, cancel]).setDepth(95001);
  }

  /** GardenScene, placing modunda tap'i buraya yönlendirir (dünya koordinatı). */
  placeAt(world: Phaser.Math.Vector2) {
    const item = this.placingItem;
    if (!item) return;
    const tx = Phaser.Math.Clamp(Math.floor(world.x / TILE), 1, MAP_W - 2);
    const ty = Phaser.Math.Clamp(Math.floor(world.y / TILE), 1, MAP_H - 2);
    item.tx = tx;
    item.ty = ty;
    item.placed = true;
    if (item.img) {
      item.img.setPosition(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
      item.img.setDepth(item.img.y + item.img.displayHeight / 2);
    } else {
      this.createImage(item);
    }
    this.c.sfx.plant();
    this.endPlacement();
    this.c.save();
  }

  private cancelPlacement() {
    // Yeni öğe henüz yerleşmediyse envanterde kalır (placed false)
    this.endPlacement();
  }

  private endPlacement() {
    this.c.scene.registry.set("placing", false);
    this.placingItem = null;
    this.ghost?.destroy();
    this.ghost = null;
    this.menu?.destroy();
    this.menu = null;
  }

  // ---------- yerleştirilmiş öğe menüsü ----------

  private openItemMenu(item: DecoItem) {
    if (!item.img) return;
    this.menu?.destroy();
    const scene = this.c.scene;
    const cam = scene.cameras.main;
    const s = 1 / cam.zoom;
    const menu = scene.add.container(item.img.x, item.img.y - 22).setDepth(96000);
    const bg = scene.add.graphics();
    bg.fillStyle(0x2a2038, 0.96);
    bg.fillRoundedRect(-46 * s, -14 * s, 92 * s, 28 * s, 5 * s);
    menu.add(bg);

    const move = scene.add
      .text(-24 * s, 0, "↔ taşı", {
        fontFamily: "monospace",
        fontSize: `${Math.round(9 * s)}px`,
        color: "#c8e8c8",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    move.on("pointerdown", (
      _p: unknown,
      _x: unknown,
      _y: unknown,
      ev?: { stopPropagation?: () => void }
    ) => {
      ev?.stopPropagation?.();
      this.c.suppressTap();
      this.menu?.destroy();
      this.menu = null;
      this.beginPlacement(item);
    });
    menu.add(move);

    const store = scene.add
      .text(22 * s, 0, "🏚️ kaldır", {
        fontFamily: "monospace",
        fontSize: `${Math.round(9 * s)}px`,
        color: "#e8c8a8",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    store.on("pointerdown", (
      _p: unknown,
      _x: unknown,
      _y: unknown,
      ev?: { stopPropagation?: () => void }
    ) => {
      ev?.stopPropagation?.();
      this.c.suppressTap();
      this.storeItem(item);
    });
    menu.add(store);

    this.menu = menu;
    // Kısa süre sonra kapan
    scene.time.delayedCall(2600, () => {
      if (this.menu === menu) {
        menu.destroy();
        this.menu = null;
      }
    });
  }

  /** Öğeyi kulübeye geri koy (bahçeden kaldır). */
  private storeItem(item: DecoItem) {
    item.placed = false;
    item.img?.destroy();
    item.img = null;
    this.menu?.destroy();
    this.menu = null;
    this.c.sfx.harvest();
    this.c.save();
  }

  /** Placement modunda mı? (GardenScene tap yönlendirmesi için) */
  isPlacing() {
    return this.c.scene.registry.get("placing") === true;
  }
}
