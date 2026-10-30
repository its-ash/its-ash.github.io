export class Ambience {
  ctx = null;
  on = false;
  mix = { rain: 0, wind: 0, day: 0, night: 0 };

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
    setInterval(() => this.#critters(), 900);
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
    if (Math.random() < this.mix.day * calm * 0.45) {
      const base = 2200 + Math.random() * 1800;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
        setTimeout(() => this.#chirp(base, base * 1.4, 0.09, 0.05), i * 120);
      }
    }
    if (Math.random() < this.mix.night * calm * 0.7) {
      for (let i = 0; i < 4; i++) setTimeout(() => this.#chirp(4600, 4400, 0.04, 0.025), i * 70);
    }
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
  }
}
