import { songs } from "./modules/song.js";
import { Synth } from "./modules/synth.js";
import { Player } from "./modules/player.js";
import { Scene } from "./modules/scene.js";
import { createUI } from "./modules/ui.js";

let volume = 0.8;
let selected = songs[0];
let current = null;
let activation = null;

const scene = new Scene(document.querySelector("#scene"), selected);

const ui = createUI({
  songs,
  selected,
  onToggle: () => (activation ? activateAudio() : current ? stop() : play()),
  onSelect: (song) => (current?.song === song ? stop() : play(song)),
  onNext: () => {
    const next = songs[(songs.indexOf(selected) + 1) % songs.length];
    if (current) play(next);
    else selectSong(next);
  },
  onVolume: (value) => {
    volume = value;
    if (current)
      current.synth.out.gain.setTargetAtTime(volume, current.synth.ctx.currentTime, 0.02);
  },
});

ui.showSelected(selected);

const viewTabs = [...document.querySelectorAll(".view-tab")];

function setView(view) {
  document.body.dataset.view = view;
  viewTabs.forEach((tab) => {
    tab.setAttribute("aria-pressed", String(tab.dataset.viewTarget === view));
  });
  scene.resize();
}

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.viewTarget));
});
setView(document.body.dataset.view || "immersive");

function selectSong(song) {
  selected = song;
  scene.setSong(song);
  ui.showSelected(song);
}

function clearActivation() {
  if (!activation) return;
  activation.detach();
  activation = null;
  ui.setAudioPending(false);
}

function activateAudio() {
  if (!activation) return;
  const { synth, detach } = activation;
  activation = null;
  detach();
  synth.ctx.resume().then(
    () => {
      if (current?.synth === synth) ui.setAudioPending(false);
    },
    () => {
      if (current?.synth === synth) ui.showError("Tu navegador no permite audio aquí");
    },
  );
}

function stop() {
  clearActivation();
  if (!current) return;
  const { synth, player } = current;
  current = null;
  player.stop();
  synth.out.gain.setTargetAtTime(0, synth.ctx.currentTime, 0.06);
  setTimeout(() => synth.ctx.close(), 500);
  scene.setSource(null);
  ui.showStopped();
}

function play(song = selected) {
  stop();
  selectSong(song);
  let synth;
  try {
    synth = new Synth(volume);
  } catch {
    ui.showError("Tu navegador no permite audio aquí");
    return;
  }
  synth.ctx.resume().catch(() => {});

  const player = new Player(song, synth, (info) => {
    if (current?.song === song) ui.showPlaying(info);
  });

  current = { song, synth, player };
  scene.setSource(current);
  ui.showPlaying({ index: 0, bar: 0, total: song.totalBars, name: song.sections[0].name });
}

function autoStart() {
  play();
  if (!current) return;
  const synth = current.synth;
  if (synth.ctx.state === "running") return;
  ui.setAudioPending(true);
  const events = ["pointerdown", "keydown", "touchstart"];
  const onGesture = (event) => {
    if (event.target?.closest?.(".play")) return;
    activateAudio();
  };
  events.forEach((event) => addEventListener(event, onGesture, { capture: true }));
  activation = {
    synth,
    detach: () =>
      events.forEach((event) => removeEventListener(event, onGesture, { capture: true })),
  };
}

addEventListener("pagehide", stop);
scene.start();
autoStart();

if (globalThis.navigator?.serviceWorker) {
  addEventListener("load", () => {
    globalThis.navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
  });
}

if (globalThis.__ORIGINAL_BANDA_SONORA_ESPACIAL__ === true) {
  /* ---------- Utilidades ---------- */
  const $ = (sel) => document.querySelector(sel);
  const midi = (n) => 440 * 2 ** ((n - 69) / 12);
  const lv = (ch) => (ch === "X" ? 1 : ch === "x" ? 0.55 : 0);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let volume = 0.8;

  /* ---------- Los tres temas (datos) ----------
   Patrones de 16 pasos: X = golpe fuerte, x = golpe suave.
   bass: semitonos sobre la fundamental del acorde; arp: índice dentro del acorde (se extiende por octavas). */
  const SONGS = [
    {
      id: "orbita",
      name: "Órbita baja",
      mood: "Techno profundo y oscuro. Bajo en contratiempo, un pad que se abre poco a poco y un arpegio escaso sobre el vacío.",
      bpm: 124,
      key: "La menor",
      root: 45,
      barsPerChord: 2,
      color: "var(--violet)",
      rgb: [161, 147, 255],
      rgb2: [255, 134, 182],
      chords: [
        { r: 0, t: [0, 3, 7, 10] },
        { r: 8, t: [0, 4, 7, 11] },
        { r: 3, t: [0, 4, 7, 11] },
        { r: 10, t: [0, 4, 7, 9] },
      ],
      kick: "X...X...X...X...",
      clap: "....X.......X...",
      hat: ".x.x.x.x.x.x.x.x",
      ohat: "..X...X...X...X.",
      bass: [null, null, 0, 0, null, null, 0, null, null, null, 0, 0, null, null, 7, null],
      arp: [4, null, null, 2, null, null, 5, null, 3, null, null, 6, null, null, 2, null],
      sound: {
        kick: { vol: 0.9, decay: 0.42 },
        clap: 0.32,
        hat: 0.14,
        ohat: 0.16,
        duck: 0.35,
        bass: { type: "sawtooth", cutoff: 260, peak: 1100, q: 6, decay: 0.16, vol: 0.34 },
        pad: { cutoff: 900, vol: 0.03, attack: 1.2 },
        arp: { type: "triangle", cutoff: 2200, decay: 0.22, vol: 0.2 },
      },
      fx: { delay: 0.45, feedback: 0.5, verb: 0.55 },
      sections: [
        { name: "Cuenta atrás", bars: 4, layers: ["kick", "pad"] },
        { name: "Ignición", bars: 4, layers: ["kick", "hat", "bass", "pad"] },
        { name: "Crucero", bars: 8, layers: ["kick", "hat", "ohat", "clap", "bass", "pad", "arp"] },
        { name: "Deriva", bars: 4, layers: ["pad", "arp"], riser: true },
        { name: "Salto", bars: 8, layers: ["kick", "hat", "ohat", "clap", "bass", "pad", "arp"] },
        { name: "Reentrada", bars: 4, layers: ["kick", "hat", "pad"] },
      ],
    },
    {
      id: "salto",
      name: "Salto cuántico",
      mood: "Techno de pulso rápido. Bajo ácido que se abre y se cierra, arpegio de semicorcheas y un hiperespacio a media canción.",
      bpm: 132,
      key: "Re menor",
      root: 38,
      barsPerChord: 1,
      color: "var(--teal)",
      rgb: [82, 217, 210],
      rgb2: [90, 140, 255],
      chords: [
        { r: 0, t: [0, 3, 7] },
        { r: 8, t: [0, 4, 7] },
        { r: 3, t: [0, 4, 7] },
        { r: 10, t: [0, 4, 7] },
      ],
      kick: "X...X...X...X...",
      clap: "....X.......X...",
      hat: ".x.xx.xx.x.xx.xx",
      ohat: "..X...X...X...X.",
      bass: [null, 0, 12, 0, null, 0, 7, 0, null, 0, 12, 0, null, 0, 10, 12],
      arp: [0, 2, 4, 2, 1, 3, 5, 3, 0, 2, 4, 6, 5, 3, 2, 1],
      sound: {
        kick: { vol: 0.95, decay: 0.34 },
        clap: 0.34,
        hat: 0.12,
        ohat: 0.15,
        duck: 0.28,
        bass: { type: "sawtooth", cutoff: 220, peak: 2200, q: 10, decay: 0.12, vol: 0.3 },
        pad: { cutoff: 1400, vol: 0.026, attack: 0.5 },
        arp: { type: "sawtooth", cutoff: 2000, decay: 0.13, vol: 0.1 },
      },
      fx: { delay: 0.35, feedback: 0.42, verb: 0.35 },
      sections: [
        { name: "Alineación", bars: 4, layers: ["kick", "hat"] },
        { name: "Aceleración", bars: 4, layers: ["kick", "hat", "clap", "bass"] },
        { name: "Salto", bars: 8, layers: ["kick", "hat", "ohat", "clap", "bass", "pad", "arp"] },
        { name: "Hiperespacio", bars: 4, layers: ["pad", "arp"], riser: true },
        {
          name: "Salto II",
          bars: 8,
          layers: ["kick", "hat", "ohat", "clap", "bass", "pad", "arp"],
        },
        { name: "Frenada", bars: 4, layers: ["kick", "hat", "pad"] },
      ],
    },
    {
      id: "nebulosa",
      name: "Nebulosa profunda",
      mood: "Dub techno flotante. Acordes con eco largo, un bombo suave y notas sueltas que se pierden en la reverberación.",
      bpm: 112,
      key: "Fa♯ menor",
      root: 42,
      barsPerChord: 2,
      color: "var(--rose)",
      rgb: [255, 134, 182],
      rgb2: [161, 147, 255],
      chords: [
        { r: 0, t: [0, 3, 7, 10] },
        { r: 8, t: [0, 4, 7, 11] },
        { r: 5, t: [0, 3, 7, 10] },
        { r: 7, t: [0, 3, 7, 10] },
      ],
      kick: "X...X...X...X...",
      hat: "..x...x...x...x.",
      ohat: "..X...X...X...X.",
      stab: "..X.......X..X..",
      bass: [0, null, null, null, null, null, null, 0, null, null, null, null, 0, null, null, null],
      arp: [7, null, null, null, null, null, 5, null, null, null, null, null, null, 3, null, null],
      sound: {
        kick: { vol: 0.8, decay: 0.5 },
        hat: 0.1,
        ohat: 0.1,
        duck: 0.55,
        bass: { type: "triangle", cutoff: 300, peak: 600, q: 1, decay: 0.3, vol: 0.5 },
        pad: { cutoff: 1100, vol: 0.034, attack: 1.8 },
        arp: { type: "sine", cutoff: 3000, decay: 0.5, vol: 0.2 },
        stab: { type: "sawtooth", cutoff: 1300, decay: 0.35, vol: 0.05 },
      },
      fx: { delay: 0.8, feedback: 0.62, verb: 0.7 },
      sections: [
        { name: "Deriva", bars: 8, layers: ["pad", "arp"] },
        { name: "Corriente", bars: 8, layers: ["kick", "hat", "bass", "pad", "stab"] },
        {
          name: "Nebulosa",
          bars: 8,
          layers: ["kick", "hat", "ohat", "bass", "pad", "stab", "arp"],
        },
        { name: "Silencio", bars: 4, layers: ["pad", "arp"], riser: true },
        { name: "Corriente II", bars: 4, layers: ["kick", "hat", "bass", "pad", "stab"] },
      ],
    },
  ];

  for (const song of SONGS) {
    song.barMap = song.sections.flatMap((sec, index) =>
      Array.from({ length: sec.bars }, (_, barIn) => ({ sec, index, barIn })),
    );
    song.totalBars = song.barMap.length;
  }

  /* ---------- Sintetizador ---------- */
  class Synth {
    constructor() {
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

      this.drums = ctx.createGain(); // percusión: no se agacha con el sidechain
      this.drums.connect(this.out);
      this.duck = ctx.createGain(); // melodía: el bombo la hace "respirar"
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
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
      }
      return buf;
    }

    setSong(song) {
      this.delay.delayTime.value = (60 / song.bpm) * 0.75; // corchea con puntillo
      this.feedback.gain.value = song.fx.feedback;
      this.delaySend.gain.value = song.fx.delay;
      this.verbSend.gain.value = song.fx.verb;
    }

    env(param, t, peak, attack, decay) {
      param.setValueAtTime(0.0001, t);
      param.linearRampToValueAtTime(peak, t + attack);
      param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }

    pump(t, depth) {
      this.duck.gain.setValueAtTime(depth, t);
      this.duck.gain.linearRampToValueAtTime(1, t + 0.22);
    }

    kick(t, vol, decay) {
      const o = this.ctx.createOscillator(),
        g = this.ctx.createGain();
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      this.env(g.gain, t, vol, 0.002, decay);
      o.connect(g).connect(this.drums);
      o.start(t);
      o.stop(t + decay + 0.05);
    }

    hat(t, vol, open) {
      const s = this.ctx.createBufferSource(),
        hp = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      s.buffer = this.noise;
      hp.type = "highpass";
      hp.frequency.value = 7500;
      this.env(g.gain, t, vol, 0.001, open ? 0.22 : 0.045);
      s.connect(hp).connect(g).connect(this.drums);
      s.start(t, Math.random());
      s.stop(t + 0.3);
    }

    clap(t, vol) {
      const s = this.ctx.createBufferSource(),
        bp = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      s.buffer = this.noise;
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      bp.Q.value = 0.8;
      g.gain.value = 0.0001;
      for (const o of [0, 0.011, 0.022]) {
        g.gain.setValueAtTime(vol, t + o);
        g.gain.exponentialRampToValueAtTime(0.0001, t + o + 0.009);
      }
      g.gain.setValueAtTime(vol, t + 0.033);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      s.connect(bp).connect(g);
      g.connect(this.drums);
      g.connect(this.verbSend);
      s.start(t, Math.random());
      s.stop(t + 0.25);
    }

    bass(t, note, dur, p) {
      const o = this.ctx.createOscillator(),
        f = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      o.type = p.type;
      o.frequency.value = midi(note);
      f.type = "lowpass";
      f.Q.value = p.q;
      f.frequency.setValueAtTime(p.peak, t);
      f.frequency.exponentialRampToValueAtTime(p.cutoff, t + p.decay);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(p.vol, t + 0.006);
      g.gain.setValueAtTime(p.vol, t + Math.max(0.01, dur - 0.04));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(this.dry);
      o.start(t);
      o.stop(t + dur + 0.05);
    }

    pad(t, notes, dur, p) {
      const release = 1.2;
      const f = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      f.type = "lowpass";
      f.frequency.value = p.cutoff;
      f.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(p.vol, t + p.attack);
      g.gain.setValueAtTime(p.vol, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + release);
      for (const n of notes) {
        for (const detune of [-8, 8]) {
          const o = this.ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = midi(n);
          o.detune.value = detune;
          o.connect(f);
          o.start(t);
          o.stop(t + dur + release + 0.1);
        }
      }
      f.connect(g);
      g.connect(this.dry);
      g.connect(this.verbSend);
    }

    pluck(t, note, p) {
      const o = this.ctx.createOscillator(),
        f = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      o.type = p.type;
      o.frequency.value = midi(note);
      f.type = "lowpass";
      f.frequency.setValueAtTime(p.cutoff * 2.5, t);
      f.frequency.exponentialRampToValueAtTime(p.cutoff, t + 0.15);
      this.env(g.gain, t, p.vol, 0.003, p.decay);
      o.connect(f).connect(g);
      g.connect(this.dry);
      g.connect(this.delaySend);
      g.connect(this.verbSend);
      o.start(t);
      o.stop(t + p.decay + 0.1);
    }

    stab(t, notes, p) {
      const f = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      f.type = "lowpass";
      f.frequency.setValueAtTime(p.cutoff * 2, t);
      f.frequency.exponentialRampToValueAtTime(p.cutoff * 0.6, t + p.decay);
      this.env(g.gain, t, p.vol, 0.004, p.decay);
      for (const n of notes) {
        const o = this.ctx.createOscillator();
        o.type = p.type;
        o.frequency.value = midi(n);
        o.connect(f);
        o.start(t);
        o.stop(t + p.decay + 0.1);
      }
      f.connect(g);
      g.connect(this.dry);
      g.connect(this.delaySend);
      g.connect(this.verbSend);
    }

    riser(t, dur) {
      const s = this.ctx.createBufferSource(),
        bp = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      s.buffer = this.noise;
      s.loop = true;
      bp.type = "bandpass";
      bp.Q.value = 2;
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(8000, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.3, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
      s.connect(bp).connect(g);
      g.connect(this.out);
      g.connect(this.verbSend);
      s.start(t);
      s.stop(t + dur + 0.1);
    }
  }

  /* ---------- Secuenciador ---------- */
  class Ticker {
    constructor(fn) {
      this.fn = fn;
    }
    start() {
      const fallback = () => {
        this.id ??= setInterval(this.fn, 25);
      };
      try {
        // Un worker no se frena en pestañas en segundo plano, a diferencia de setInterval.
        this.url = URL.createObjectURL(
          new Blob(["setInterval(() => postMessage(0), 25)"], { type: "text/javascript" }),
        );
        this.worker = new Worker(this.url);
        this.worker.onmessage = this.fn;
        this.worker.onerror = () => {
          this.worker.terminate();
          fallback();
        };
      } catch {
        fallback();
      }
    }
    stop() {
      this.worker?.terminate();
      if (this.url) URL.revokeObjectURL(this.url);
      clearInterval(this.id);
    }
  }

  class Player {
    constructor(song, synth, onBar) {
      this.song = song;
      this.synth = synth;
      this.onBar = onBar;
      this.step = 0;
      this.t0 = synth.ctx.currentTime + 0.1;
      this.next = this.t0;
      synth.setSong(song);
      this.ticker = new Ticker(() => this.tick());
      this.ticker.start();
    }

    stop() {
      this.ticker.stop();
    }

    tick() {
      const { ctx } = this.synth;
      const stepDur = 60 / this.song.bpm / 4;
      while (this.next < ctx.currentTime + 0.3) {
        this.schedule(this.step, this.next);
        this.next += stepDur;
        this.step++;
      }
    }

    schedule(step, t) {
      const { song: s, synth: sy } = this;
      const bar = Math.floor(step / 16) % s.totalBars;
      const i = step % 16;
      const { sec, index, barIn } = s.barMap[bar];
      const has = (layer) => sec.layers.includes(layer);
      const chord = s.chords[Math.floor(bar / s.barsPerChord) % s.chords.length];
      const stepDur = 60 / s.bpm / 4;
      const barDur = stepDur * 16;

      if (i === 0) {
        const wait = Math.max(0, (t - sy.ctx.currentTime) * 1000);
        setTimeout(() => this.onBar?.({ bar, index, total: s.totalBars, name: sec.name }), wait);
        if (sec.riser && barIn === sec.bars - 1) sy.riser(t, barDur);
        if (has("pad") && bar % s.barsPerChord === 0) {
          const progress = barIn / sec.bars;
          const notes = chord.t.map((x) => s.root + 12 + chord.r + x);
          sy.pad(t, notes, barDur * s.barsPerChord, {
            ...s.sound.pad,
            cutoff: s.sound.pad.cutoff * (0.7 + 0.6 * progress),
          });
        }
      }

      const kick = has("kick") ? lv(s.kick?.[i]) : 0;
      if (kick) {
        sy.kick(t, s.sound.kick.vol * kick, s.sound.kick.decay);
        sy.pump(t, s.sound.duck);
      }
      const clap = has("clap") ? lv(s.clap?.[i]) : 0;
      if (clap) sy.clap(t, s.sound.clap * clap);
      const hat = has("hat") ? lv(s.hat?.[i]) : 0;
      if (hat) sy.hat(t, s.sound.hat * hat, false);
      const ohat = has("ohat") ? lv(s.ohat?.[i]) : 0;
      if (ohat) sy.hat(t, s.sound.ohat * ohat, true);

      const off = s.bass?.[i];
      if (has("bass") && off != null)
        sy.bass(t, s.root + chord.r + off, stepDur * 0.9, s.sound.bass);

      const k = s.arp?.[i];
      if (has("arp") && k != null) {
        const n = chord.t.length;
        sy.pluck(t, s.root + 24 + chord.r + chord.t[k % n] + 12 * Math.floor(k / n), s.sound.arp);
      }

      if (has("stab") && lv(s.stab?.[i])) {
        sy.stab(
          t,
          chord.t.map((x) => s.root + 12 + chord.r + x),
          s.sound.stab,
        );
      }
    }
  }

  /* ---------- Interfaz ---------- */
  const tracksEl = $("#tracks");
  const nowTitle = $("#nowTitle"),
    nowSection = $("#nowSection"),
    clockEl = $("#clock");
  let current = null;

  for (const song of SONGS) {
    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--c", song.color);
    card.innerHTML = `
    <h2>${song.name}</h2>
    <p class="mood">${song.mood}</p>
    <div class="chips"><span>${song.bpm} BPM</span><span>${song.key}</span><span>${song.totalBars} compases</span></div>
    <div class="map" aria-hidden="true">${song.sections.map((s) => `<span class="seg" style="flex:${s.bars}" title="${s.name}, ${s.bars} compases"></span>`).join("")}</div>
    <div class="where" aria-live="off"></div>
    <button class="play" type="button" aria-pressed="false">Reproducir</button>`;
    song.card = card;
    card
      .querySelector(".play")
      .addEventListener("click", () => (current?.song === song ? stopCurrent() : play(song)));
    tracksEl.append(card);
  }

  function paintCard(song, state) {
    const { card } = song;
    const btn = card.querySelector(".play");
    card.classList.toggle("on", !!state);
    btn.setAttribute("aria-pressed", String(!!state));
    btn.textContent = state ? "Detener" : "Reproducir";
    const segs = card.querySelectorAll(".seg");
    segs.forEach((seg, i) => {
      seg.classList.toggle("now", !!state && i === state.index);
      seg.classList.toggle("done", !!state && i < state.index);
    });
    card.querySelector(".where").textContent = state
      ? `${state.name} · compás ${state.bar + 1}/${state.total}`
      : "";
  }

  function stopCurrent() {
    if (!current) return;
    const { song, synth, player } = current;
    current = null;
    player.stop();
    synth.out.gain.setTargetAtTime(0, synth.ctx.currentTime, 0.06);
    setTimeout(() => synth.ctx.close(), 500);
    paintCard(song, null);
    nowTitle.textContent = "En reposo";
    nowSection.textContent = "Elige un tema para despegar";
    clockEl.textContent = "T+ 00:00";
  }

  function play(song) {
    stopCurrent();
    let synth;
    try {
      synth = new Synth();
    } catch {
      nowSection.textContent = "Tu navegador no permite audio aquí";
      return;
    }
    synth.ctx.resume();
    const player = new Player(song, synth, (info) => {
      if (current?.song !== song) return;
      paintCard(song, info);
      nowSection.textContent = info.name;
    });
    current = { song, synth, player };
    paintCard(song, { index: 0, bar: 0, total: song.totalBars, name: song.sections[0].name });
    nowTitle.textContent = song.name;
    nowSection.textContent = song.sections[0].name;
  }

  $("#vol").addEventListener("input", (e) => {
    volume = Number(e.target.value);
    current?.synth.out.gain.setTargetAtTime(volume, current.synth.ctx.currentTime, 0.02);
  });
  addEventListener("pagehide", stopCurrent);

  /* ---------- Escena: túnel de estrellas y nebulosa que siguen al audio ---------- */
  const canvas = $("#scene");
  const g = canvas.getContext("2d");
  const bins = new Uint8Array(512);
  const level = { bass: 0, mid: 0, high: 0 };
  const stars = Array.from({ length: 320 }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: Math.random(),
  }));
  let W = 0,
    H = 0,
    last = performance.now();

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(canvas);

  function avg(from, to) {
    let sum = 0;
    for (let i = from; i < to; i++) sum += bins[i];
    return sum / (to - from) / 255;
  }

  function readAudio() {
    let bass = 0,
      mid = 0,
      high = 0;
    if (current) {
      current.synth.analyser.getByteFrequencyData(bins);
      bass = avg(1, 5);
      mid = avg(5, 30);
      high = avg(30, 150);
    }
    for (const [key, v] of [
      ["bass", bass],
      ["mid", mid],
      ["high", high],
    ]) {
      level[key] += (v - level[key]) * (v > level[key] ? 0.5 : 0.1);
    }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    readAudio();
    const song = current?.song ?? SONGS[0];
    const motion = calm ? 0.3 : 1;
    const colA = song.rgb.join(","),
      colB = song.rgb2.join(",");

    g.fillStyle = "#05060d";
    g.fillRect(0, 0, W, H);

    for (let k = 0; k < 3; k++) {
      const x = W * (0.5 + 0.28 * Math.sin(now * 0.00021 * (k + 1) + k * 2));
      const y = H * (0.5 + 0.22 * Math.cos(now * 0.00017 * (k + 2) + k));
      const rad = Math.max(W, H) * (0.28 + k * 0.05 + level.bass * 0.25 * motion);
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${k === 1 ? colB : colA},${0.2 + level.mid * 0.35 * motion})`);
      grad.addColorStop(1, `rgba(${k === 1 ? colB : colA},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    }

    const speed = (0.1 + level.bass * 1.1) * motion;
    const cx = W / 2,
      cy = H / 2,
      scale = Math.max(W, H) * 0.6;
    g.lineCap = "round";
    for (const s of stars) {
      const prev = s.z + speed * dt * 2.5;
      s.z -= speed * dt;
      if (s.z < 0.02) {
        s.x = Math.random() * 2 - 1;
        s.y = Math.random() * 2 - 1;
        s.z = 1;
        continue;
      }
      g.strokeStyle = `rgba(230,235,255,${(1 - s.z) * (0.5 + level.high * 0.5)})`;
      g.lineWidth = 0.5 + (1 - s.z) * 1.8;
      g.beginPath();
      g.moveTo(cx + (s.x / prev) * scale * 0.2, cy + (s.y / prev) * scale * 0.2);
      g.lineTo(cx + (s.x / s.z) * scale * 0.2, cy + (s.y / s.z) * scale * 0.2);
      g.stroke();
    }

    if (current) {
      const bars = 40,
        bw = W / bars;
      g.fillStyle = `rgba(${colA},0.65)`;
      for (let b = 0; b < bars; b++) {
        const v = bins[Math.floor(1 + (b / bars) ** 2 * 180)] / 255;
        const h = 3 + v * 30;
        g.fillRect(b * bw + 1, H - h, bw - 2, h);
      }
      const t = Math.max(0, current.synth.ctx.currentTime - current.player.t0);
      clockEl.textContent = `T+ ${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
