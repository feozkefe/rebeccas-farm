/**
 * Paylaşılan Web Audio motoru.
 * Tarayıcılar sesi ancak bir kullanıcı dokunuşundan sonra açar —
 * unlock() ilk pointerdown'da çağrılır (GardenScene kurar).
 * Master gain üzerinden tek noktadan sessize alma.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  /** Kullanıcı dokunuşu içinde çağrılmalı (autoplay kuralı). */
  unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      // ses desteklenmiyorsa oyun sessiz devam eder
    }
  }

  /** Ses üretimi için context + çıkış; henüz unlock edilmediyse null. */
  get(): { ctx: AudioContext; out: GainNode } | null {
    if (!this.ctx || !this.master) return null;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return { ctx: this.ctx, out: this.master };
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
    try {
      localStorage.setItem("rebeccas-farm-muted", muted ? "1" : "0");
    } catch {
      /* önemsiz */
    }
  }

  isMuted() {
    return this.muted;
  }

  loadMutePreference() {
    try {
      this.muted = localStorage.getItem("rebeccas-farm-muted") === "1";
    } catch {
      /* önemsiz */
    }
  }
}

export const audioEngine = new AudioEngine();
