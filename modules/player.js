const lv = (step) => (step === "X" ? 1 : step === "x" ? 0.55 : 0);

class Ticker {
  constructor(callback) {
    this.callback = callback;
  }

  start() {
    const fallback = () => {
      this.interval ??= setInterval(this.callback, 25);
    };
    try {
      const source = ["setInterval(() => postMessage(0), 25)"];
      this.url = URL.createObjectURL(new Blob(source, { type: "text/javascript" }));
      this.worker = new Worker(this.url);
      this.worker.onmessage = this.callback;
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
    clearInterval(this.interval);
  }
}

export class Player {
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
    const stepDuration = 60 / this.song.bpm / 4;
    while (this.next < this.synth.ctx.currentTime + 0.3) {
      this.schedule(this.step, this.next);
      this.next += stepDuration;
      this.step += 1;
    }
  }

  schedule(step, time) {
    const { song, synth } = this;
    const bar = Math.floor(step / 16) % song.totalBars;
    const i = step % 16;
    const { section, index, barIn } = song.barMap[bar];
    const has = (layer) => section.layers.includes(layer);
    const chord = song.chords[Math.floor(bar / song.barsPerChord) % song.chords.length];
    const stepDuration = 60 / song.bpm / 4;
    const barDuration = stepDuration * 16;

    if (i === 0) {
      const delay = Math.max(0, (time - synth.ctx.currentTime) * 1000);
      setTimeout(
        () => this.onBar?.({ bar, index, total: song.totalBars, name: section.name }),
        delay,
      );
      if (section.riser && barIn === section.bars - 1) synth.riser(time, barDuration);
      if (has("pad") && bar % song.barsPerChord === 0) {
        const progress = barIn / section.bars;
        const notes = chord.t.map((offset) => song.root + 12 + chord.r + offset);
        synth.pad(time, notes, barDuration * song.barsPerChord, {
          ...song.sound.pad,
          cutoff: song.sound.pad.cutoff * (0.7 + 0.6 * progress),
        });
      }
    }

    const kick = has("kick") ? lv(song.kick[i]) : 0;
    if (kick) {
      synth.kick(time, song.sound.kick.vol * kick, song.sound.kick.decay);
      synth.pump(time, song.sound.duck);
    }

    const hat = has("hat") ? lv(song.hat[i]) : 0;
    if (hat) synth.hat(time, song.sound.hat * hat, false);

    const openHat = has("ohat") ? lv(song.ohat[i]) : 0;
    if (openHat) synth.hat(time, song.sound.ohat * openHat, true);

    const bassOffset = song.bass[i];
    if (has("bass") && bassOffset != null) {
      synth.bass(time, song.root + chord.r + bassOffset, stepDuration * 0.9, song.sound.bass);
    }

    const arpIndex = song.arp[i];
    if (has("arp") && arpIndex != null) {
      const notes = chord.t.length;
      const note =
        song.root + 24 + chord.r + chord.t[arpIndex % notes] + 12 * Math.floor(arpIndex / notes);
      synth.pluck(time, note, song.sound.arp);
    }

    if (has("stab") && lv(song.stab[i])) {
      synth.stab(
        time,
        chord.t.map((offset) => song.root + 12 + chord.r + offset),
        song.sound.stab,
      );
    }
  }
}
