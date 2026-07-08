import { audioEngine } from "./AudioEngine";

/**
 * Minik chiptune ses efektleri — Web Audio ile kodda üretilir, dosya gerekmez.
 * Ses, ilk dokunuşta audioEngine.unlock() ile açılır (GardenScene kurar).
 */
export class Sfx {
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
    const a = audioEngine.get();
    if (!a) return;
    const { ctx, out } = a;
    const t0 = ctx.currentTime + (opts.delayMs ?? 0) / 1000;
    const dur = durMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur);
    gain.gain.setValueAtTime(opts.vol ?? 0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  /** Filtrelenmiş gürültü (su/yağmur/eşeleme için) */
  private noise(durMs: number, cutoff: number, vol = 0.25, delayMs = 0) {
    const a = audioEngine.get();
    if (!a) return;
    const { ctx, out } = a;
    const t0 = ctx.currentTime + delayMs / 1000;
    const dur = durMs / 1000;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
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
    src.connect(filter).connect(gain).connect(out);
    src.start(t0);
  }

  plant() {
    this.tone(330, 90, { type: "triangle", sweepTo: 220 });
    this.tone(180, 70, { type: "sine", delayMs: 60, vol: 0.14 });
  }

  water() {
    this.noise(220, 900);
    this.tone(520, 120, { type: "sine", sweepTo: 320, vol: 0.08, delayMs: 30 });
  }

  harvest() {
    this.tone(340, 110, { type: "square", sweepTo: 720, vol: 0.16 }); // pop!
  }

  coin() {
    this.tone(880, 80, { type: "square", vol: 0.12 });
    this.tone(1320, 140, { type: "square", vol: 0.12, delayMs: 70 });
  }

  /** Yumuşacık mırlama: alçak ton + 22Hz titreşim (LFO) + lowpass, kısacık */
  purr() {
    const a = audioEngine.get();
    if (!a) return;
    const { ctx, out } = a;
    const t0 = ctx.currentTime;
    const dur = 0.55;

    const carrier = ctx.createOscillator();
    carrier.type = "triangle";
    carrier.frequency.value = 72;

    // Mırlama dokusu: ses şiddeti saniyede ~22 kez dalgalanır
    const amp = ctx.createGain();
    amp.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 22;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.45;
    lfo.connect(lfoDepth).connect(amp.gain);

    // Yumuşak giriş-çıkış zarfı + boğuk ton
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(0.16, t0 + 0.09);
    env.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;

    carrier.connect(amp).connect(env).connect(filter).connect(out);
    carrier.start(t0);
    lfo.start(t0);
    carrier.stop(t0 + dur);
    lfo.stop(t0 + dur);
  }

  dig() {
    this.noise(120, 500, 0.22);
    this.noise(120, 450, 0.2, 150);
  }

  gift() {
    this.tone(660, 90, { type: "triangle", vol: 0.14 });
    this.tone(880, 90, { type: "triangle", vol: 0.14, delayMs: 90 });
    this.tone(1100, 150, { type: "triangle", vol: 0.14, delayMs: 180 });
  }

  rain() {
    this.noise(1200, 700, 0.12);
  }

  /** Kumaş hışırtısı + mandal kliki (çamaşır asma) */
  cloth() {
    this.noise(160, 1400, 0.14);
    this.tone(640, 45, { type: "square", vol: 0.07, delayMs: 140 });
  }

  denied() {
    this.tone(220, 140, { type: "square", sweepTo: 160, vol: 0.12 });
  }
}
