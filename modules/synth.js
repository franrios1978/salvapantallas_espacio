const midi = (note) => 440 * 2 ** ((note - 69) / 12);

export class Synth {
  constructor(volume) {
    const ctx = (this.ctx = new AudioContext());

    this.out = ctx.createGain();
    this.out.gain.value = volume;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.75;

    this.out.connect(comp).connect(this.analyser).connect(ctx.destination);

    this.drums = ctx.createGain();
    this.drums.connect(this.out);

    this.duck = ctx.createGain();
    this.duck.connect(this.out);

    this.dry = ctx.createGain();
    this.dry.connect(this.duck);

    this.verbSend = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(2.8);
    this.verbSend.connect(verb).connect(this.duck);

    this.delay = ctx.createDelay(2);
    this.feedback = ctx.createGain();
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2600;
    this.delaySend = ctx.createGain();

    this.delaySend.connect(this.delay);
    this.delay.connect(tone);
    tone.connect(this.feedback).connect(this.delay);
    tone.connect(this.duck);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  impulse(seconds) {
    const { ctx } = this;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
      }
    }
    return buffer;
  }

  setSong(song) {
    this.delay.delayTime.value = (60 / song.bpm) * 0.75;
    this.feedback.gain.value = song.fx.feedback;
    this.delaySend.gain.value = song.fx.delay;
    this.verbSend.gain.value = song.fx.verb;
  }

  env(param, time, peak, attack, decay) {
    param.setValueAtTime(0.0001, time);
    param.linearRampToValueAtTime(peak, time + attack);
    param.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  }

  pump(time, depth) {
    this.duck.gain.setValueAtTime(depth, time);
    this.duck.gain.linearRampToValueAtTime(1, time + 0.22);
  }

  kick(time, vol, decay) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
    this.env(gain.gain, time, vol, 0.002, decay);
    osc.connect(gain).connect(this.drums);
    osc.start(time);
    osc.stop(time + decay + 0.05);
  }

  hat(time, vol, open) {
    const source = this.ctx.createBufferSource();
    const highpass = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noise;
    highpass.type = "highpass";
    highpass.frequency.value = 7500;
    this.env(gain.gain, time, vol, 0.001, open ? 0.22 : 0.045);
    source.connect(highpass).connect(gain).connect(this.drums);
    source.start(time, Math.random());
    source.stop(time + 0.3);
  }

  bass(time, note, duration, params) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = params.type;
    osc.frequency.value = midi(note);
    filter.type = "lowpass";
    filter.Q.value = params.q;
    filter.frequency.setValueAtTime(params.peak, time);
    filter.frequency.exponentialRampToValueAtTime(params.cutoff, time + params.decay);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(params.vol, time + 0.006);
    gain.gain.setValueAtTime(params.vol, time + Math.max(0.01, duration - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter).connect(gain).connect(this.dry);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  pad(time, notes, duration, params) {
    const release = 1.2;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = params.cutoff;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(params.vol, time + params.attack);
    gain.gain.setValueAtTime(params.vol, time + duration);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration + release);
    for (const note of notes) {
      for (const detune of [-8, 8]) {
        const osc = this.ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = midi(note);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(time);
        osc.stop(time + duration + release + 0.1);
      }
    }
    filter.connect(gain);
    gain.connect(this.dry);
    gain.connect(this.verbSend);
  }

  pluck(time, note, params) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = params.type;
    osc.frequency.value = midi(note);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(params.cutoff * 2.5, time);
    filter.frequency.exponentialRampToValueAtTime(params.cutoff, time + 0.15);
    this.env(gain.gain, time, params.vol, 0.003, params.decay);
    osc.connect(filter).connect(gain);
    gain.connect(this.dry);
    gain.connect(this.delaySend);
    gain.connect(this.verbSend);
    osc.start(time);
    osc.stop(time + params.decay + 0.1);
  }

  stab(time, notes, params) {
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(params.cutoff * 2, time);
    filter.frequency.exponentialRampToValueAtTime(params.cutoff * 0.6, time + params.decay);
    this.env(gain.gain, time, params.vol, 0.004, params.decay);
    for (const note of notes) {
      const osc = this.ctx.createOscillator();
      osc.type = params.type;
      osc.frequency.value = midi(note);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + params.decay + 0.1);
    }
    filter.connect(gain);
    gain.connect(this.dry);
    gain.connect(this.delaySend);
    gain.connect(this.verbSend);
  }

  riser(time, duration) {
    const source = this.ctx.createBufferSource();
    const bandpass = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noise;
    source.loop = true;
    bandpass.type = "bandpass";
    bandpass.Q.value = 2;
    bandpass.frequency.setValueAtTime(300, time);
    bandpass.frequency.exponentialRampToValueAtTime(8000, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.3, time + duration);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration + 0.05);
    source.connect(bandpass).connect(gain);
    gain.connect(this.out);
    gain.connect(this.verbSend);
    source.start(time);
    source.stop(time + duration + 0.1);
  }
}
