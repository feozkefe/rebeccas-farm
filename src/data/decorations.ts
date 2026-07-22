/**
 * Bahçe dekorasyonları — Flohmarkt'tan coin ile alınır, kulübe envanterine
 * düşer, oradan bahçeye yerleştirilir. Görseller BootScene'de "deco_<id>"
 * dokusu olarak çizilir; buradaki w/h sadece katalog kartı ölçeği içindir.
 */

export interface DecorationDef {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

export const DECORATIONS: DecorationDef[] = [
  { id: "pond", name: "Little Pond", emoji: "⛲", price: 140 },
  { id: "hammock", name: "Hammock", emoji: "🛏️", price: 110 },
  { id: "gnome", name: "Garden Gnome", emoji: "🧙", price: 60 },
  { id: "fairylights", name: "Fairy Lights", emoji: "✨", price: 75 },
  { id: "flamingo", name: "Flamingo", emoji: "🦩", price: 50 },
  { id: "birdbath", name: "Bird Bath", emoji: "🐦", price: 85 },
  { id: "lantern", name: "Lantern", emoji: "🏮", price: 45 },
  { id: "mushroom", name: "Toadstools", emoji: "🍄", price: 35 },
];

export function decoById(id: string): DecorationDef | undefined {
  return DECORATIONS.find((d) => d.id === id);
}
