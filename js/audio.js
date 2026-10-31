export class Ambience {
  ctx = null;
  on = false;
  mix = { rain: 0, wind: 0, day: 0, night: 0, sunAlt: null };
  #lastAlt = null;

  #noise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  #layer(type, freq, q = 0.7) {
    const src = this.#noise();
    const filter = new BiquadFilterNode(this.ctx, { type, frequency: freq, Q: q });
    const gain = new GainNode(this.ctx, { gain: 0 });
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    return gain;
  }

  #init() {
    this.ctx = new AudioContext();
    this.master = new GainNode(this.ctx, { gain: 0.6 });
    this.master.connect(this.ctx.destination);
    this.rain = this.#layer('lowpass', 2400);
    this.wind = this.#layer('bandpass', 320, 0.4);
    this.sea = this.#layer('lowpass', 520, 0.5);
    const swell = new OscillatorNode(this.ctx, { type: 'sine', frequency: 0.09 });
    const depth = new GainNode(this.ctx, { gain: 0.05 });
    swell.connect(depth).connect(this.sea.gain);
    swell.start();
    setInterval(() => this.#critters(), 900);
  }

  #tone(type, f0, f1, at, dur, vol) {
    const t = this.ctx.currentTime + at;
    const osc = new OscillatorNode(this.ctx, { type, frequency: f0 });
    const gain = new GainNode(this.ctx, { gain: 0 });
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 3));
    gain.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  #bird() {
    const kind = Math.random();
    const base = 2000 + Math.random() * 2200;
    if (kind < 0.4) {
      const n = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) this.#tone('sine', base, base * 1.35, i * 0.09, 0.07, 0.045);
    } else if (kind < 0.75) {
      this.#tone('sine', base * 0.8, base * 1.2, 0, 0.25, 0.05);
      this.#tone('sine', base * 1.2, base * 0.7, 0.3, 0.3, 0.045);
    } else {
      for (let i = 0; i < 6; i++) this.#tone('triangle', base * (1 + (i % 2) * 0.25), base * (1.1 + (i % 2) * 0.2), i * 0.05, 0.05, 0.03);
    }
  }

  #owl() {
    this.#tone('sine', 410, 360, 0, 0.45, 0.07);
    this.#tone('sine', 400, 350, 0.65, 0.7, 0.06);
  }

  #chirp(f0, f1, dur, vol) {
    const t = this.ctx.currentTime;
    const osc = new OscillatorNode(this.ctx, { type: 'sine', frequency: f0 });
    const gain = new GainNode(this.ctx, { gain: 0 });
    gain.gain.setValueAtTime(0, t);
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  #critters() {
    if (!this.on || this.ctx.state !== 'running') return;
    const calm = 1 - Math.min(1, this.mix.rain * 1.5);
    const alt = this.mix.sunAlt ?? 30;
    const dawn = alt > -4 && alt < 18 ? 1 - Math.abs(alt - 7) / 11 : 0;
    if (Math.random() < (this.mix.day * 0.35 + dawn * 0.6) * calm) this.#bird();
    if (Math.random() < this.mix.night * calm * 0.75) {
      const f = 4300 + Math.random() * 500;
      for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) setTimeout(() => this.#chirp(f, f * 0.96, 0.035, 0.022), i * 65);
    }
    if (Math.random() < this.mix.night * calm * 0.04) this.#owl();
  }

  #sunrise() {
    [0, 2.6, 5.2].forEach((d) => setTimeout(() => this.bell(), d * 1000));
  }

  thunder() {
    if (!this.on) return;
    const src = this.#noise();
    const t = this.ctx.currentTime;
    const filter = new BiquadFilterNode(this.ctx, { type: 'lowpass', frequency: 180 });
    const gain = new GainNode(this.ctx, { gain: 0 });
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.9, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(1e-3, t + 2.6);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 2.8);
  }

  bell() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [[1, 0.22, 3.2], [2.01, 0.1, 2.2], [2.76, 0.08, 1.6], [5.4, 0.04, 0.9]].forEach(([mult, vol, dur]) => {
      const osc = new OscillatorNode(this.ctx, { type: 'sine', frequency: 740 * mult });
      const gain = new GainNode(this.ctx, { gain: 0 });
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  async toggle() {
    if (!this.ctx) this.#init();
    this.on = !this.on;
    await (this.on ? this.ctx.resume() : this.ctx.suspend());
    return this.on;
  }

  update(mix) {
    Object.assign(this.mix, mix);
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    this.rain.gain.setTargetAtTime(this.mix.rain * 0.35, t, 0.6);
    this.wind.gain.setTargetAtTime(Math.min(1, this.mix.wind / 40) * 0.5, t, 0.8);
    this.sea.gain.setTargetAtTime(0.1, t, 2);
    const alt = this.mix.sunAlt;
    if (alt != null && this.#lastAlt != null && this.#lastAlt < 0 && alt >= 0) this.#sunrise();
    this.#lastAlt = alt;
  }
}
