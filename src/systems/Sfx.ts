/**
 * Minik chiptune ses efektleri — Web Audio ile kodda üretilir, dosya gerekmez.
 * Mobil tarayıcılar AudioContext'i ilk dokunuşta açar; her çağrıda resume denenir.
 */
export class Sfx {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null; // ses yoksa oyun sessiz devam eder
    }
  }

  /** Tek nota: freq → (varsa) sweepTo'ya kayar */
  private tone(
    freq: number,
    durMs: number,
    opts: {
      type?: OscillatorType;
      vol?: number;
      sweepTo?: number;
      delayMs?: number;
    } = {}
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delayMs ?? 0) / 1000;
    const dur = durMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur);
    gain.gain.setValueAtTime(opts.vol ?? 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  /** Filtrelenmiş gürültü (su/yağmur/eşeleme için) */
  private noise(durMs: number, cutoff: number, vol = 0.12, delayMs = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delayMs / 1000;
    const dur = durMs / 1000;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  plant() {
    this.tone(330, 90, { type: "triangle", sweepTo: 220 });
    this.tone(180, 70, { type: "sine", delayMs: 60, vol: 0.06 });
  }

  water() {
    this.noise(220, 900, 0.1);
    this.tone(520, 120, { type: "sine", sweepTo: 320, vol: 0.03, delayMs: 30 });
  }

  harvest() {
    this.tone(340, 110, { type: "square", sweepTo: 720, vol: 0.07 }); // pop!
  }

  coin() {
    this.tone(880, 80, { type: "square", vol: 0.05 });
    this.tone(1320, 140, { type: "square", vol: 0.05, delayMs: 70 });
  }

  purr() {
    for (let i = 0; i < 3; i++) {
      this.tone(85, 130, { type: "sawtooth", vol: 0.05, delayMs: i * 160 });
    }
  }

  dig() {
    this.noise(120, 500, 0.1);
    this.noise(120, 450, 0.09, 150);
  }

  gift() {
    this.tone(660, 90, { type: "triangle", vol: 0.06 });
    this.tone(880, 90, { type: "triangle", vol: 0.06, delayMs: 90 });
    this.tone(1100, 150, { type: "triangle", vol: 0.06, delayMs: 180 });
  }

  rain() {
    this.noise(1200, 700, 0.05);
  }

  denied() {
    this.tone(220, 140, { type: "square", sweepTo: 160, vol: 0.05 });
  }
}
