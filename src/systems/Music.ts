import { audioEngine } from "./AudioEngine";

/**
 * Lofi arka plan müziği — Web Audio ile üretilir, dosya gerekmez.
 * Yumuşak sine akor pedleri + triangle arpej, lowpass ile "eski kaset" hissi.
 * Chill mode'da tempo yavaşlar, filtre kısılır (daha dreamy).
 *
 * Zamanlama setInterval ile: bir sonraki ölçünün notaları AudioContext
 * saatine göre önceden programlanır.
 */

// Akor yürüyüşü: Cmaj7 → Am7 → Fmaj7 → G7 (Hz, 3. oktav civarı)
const CHORDS: number[][] = [
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
  [110.0, 130.81, 164.81, 196.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 349.23], // G7
];

export class Music {
  private interval: ReturnType<typeof setInterval> | null = null;
  private chordIndex = 0;
  private nextBarAt = 0; // ctx saatine göre
  private isChill: () => boolean;

  constructor(isChill: () => boolean) {
    this.isChill = isChill;
  }

  start() {
    if (this.interval) return;
    // 400ms'de bir bak: sıradaki ölçünün zamanı geldiyse programla
    this.interval = setInterval(() => this.tick(), 400);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  private tick() {
    const a = audioEngine.get();
    if (!a) return; // ses henüz açılmadı
    const { ctx } = a;
    if (ctx.currentTime + 0.5 < this.nextBarAt) return;

    const chill = this.isChill();
    const barSec = chill ? 3.6 : 2.8;
    const t0 = Math.max(this.nextBarAt, ctx.currentTime + 0.1);
    this.scheduleBar(t0, barSec, chill);
    this.nextBarAt = t0 + barSec;
    this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
  }

  private scheduleBar(t0: number, barSec: number, chill: boolean) {
    const a = audioEngine.get();
    if (!a) return;
    const { ctx, out } = a;
    const chord = CHORDS[this.chordIndex];

    // Müzik yolu: lowpass → hafif gain (efektlerin altında kalsın)
    const bus = ctx.createGain();
    bus.gain.value = chill ? 0.5 : 0.42;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = chill ? 650 : 1100;
    bus.connect(filter).connect(out);

    // Akor pedi: yumuşak atak, ölçü boyu sönüş
    for (const freq of chord) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.055, t0 + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t0 + barSec);
      osc.connect(g).connect(bus);
      osc.start(t0);
      osc.stop(t0 + barSec);
    }

    // Arpej: akorun oktav üstünden 3-4 kısa nota, ölçüye serpilir
    const steps = chill ? 3 : 4;
    for (let i = 0; i < steps; i++) {
      const freq = chord[(i * 2 + this.chordIndex) % chord.length] * 2;
      const t = t0 + (barSec / steps) * i + 0.15;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(bus);
      osc.start(t);
      osc.stop(t + 0.5);
    }
  }
}
