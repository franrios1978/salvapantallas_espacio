import { song } from "./song.js";

export class Scene {
  constructor(canvas, clock) {
    this.canvas = canvas;
    this.clock = clock;
    this.g = canvas.getContext("2d");
    this.bins = new Uint8Array(512);
    this.level = { bass: 0, mid: 0, high: 0 };
    this.stars = Array.from({ length: 320 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
    }));
    this.width = 0;
    this.height = 0;
    this.last = performance.now();
    this.source = null;
    this.motion = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.3 : 1;

    this.resize = this.resize.bind(this);
    new ResizeObserver(this.resize).observe(canvas);
    this.resize();
  }

  setSource(source) {
    this.source = source;
  }

  start() {
    requestAnimationFrame((now) => this.frame(now));
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  average(from, to) {
    let total = 0;
    for (let i = from; i < to; i++) total += this.bins[i];
    return total / (to - from) / 255;
  }

  readAudio() {
    let bass = 0;
    let mid = 0;
    let high = 0;
    if (this.source) {
      this.source.synth.analyser.getByteFrequencyData(this.bins);
      bass = this.average(1, 5);
      mid = this.average(5, 30);
      high = this.average(30, 150);
    }
    for (const [key, value] of [
      ["bass", bass],
      ["mid", mid],
      ["high", high],
    ]) {
      this.level[key] += (value - this.level[key]) * (value > this.level[key] ? 0.5 : 0.1);
    }
  }

  frame(now) {
    const delta = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.readAudio();

    const { g, width: W, height: H, level, motion, source } = this;
    const colorA = song.rgb.join(",");
    const colorB = song.rgb2.join(",");

    g.fillStyle = "#05060d";
    g.fillRect(0, 0, W, H);

    for (let k = 0; k < 3; k++) {
      const x = W * (0.5 + 0.28 * Math.sin(now * 0.00021 * (k + 1) + k * 2));
      const y = H * (0.5 + 0.22 * Math.cos(now * 0.00017 * (k + 2) + k));
      const radius = Math.max(W, H) * (0.28 + k * 0.05 + level.bass * 0.25 * motion);
      const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
      const color = k === 1 ? colorB : colorA;
      gradient.addColorStop(0, `rgba(${color},${0.2 + level.mid * 0.35 * motion})`);
      gradient.addColorStop(1, `rgba(${color},0)`);
      g.fillStyle = gradient;
      g.fillRect(0, 0, W, H);
    }

    const speed = (0.1 + level.bass * 1.1) * motion;
    const cx = W / 2;
    const cy = H / 2;
    const scale = Math.max(W, H) * 0.6;
    g.lineCap = "round";
    for (const star of this.stars) {
      const previous = star.z + speed * delta * 2.5;
      star.z -= speed * delta;
      if (star.z < 0.02) {
        star.x = Math.random() * 2 - 1;
        star.y = Math.random() * 2 - 1;
        star.z = 1;
        continue;
      }
      g.strokeStyle = `rgba(230,235,255,${(1 - star.z) * (0.5 + level.high * 0.5)})`;
      g.lineWidth = 0.5 + (1 - star.z) * 1.8;
      g.beginPath();
      g.moveTo(cx + (star.x / previous) * scale * 0.2, cy + (star.y / previous) * scale * 0.2);
      g.lineTo(cx + (star.x / star.z) * scale * 0.2, cy + (star.y / star.z) * scale * 0.2);
      g.stroke();
    }

    if (source) {
      const bars = 40;
      const barWidth = W / bars;
      g.fillStyle = `rgba(${colorA},0.65)`;
      for (let bar = 0; bar < bars; bar++) {
        const value = this.bins[Math.floor(1 + (bar / bars) ** 2 * 180)] / 255;
        const height = 3 + value * 30;
        g.fillRect(bar * barWidth + 1, H - height, barWidth - 2, height);
      }
      const elapsed = source.synth.ctx.currentTime - source.player.t0;
      const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const seconds = String(Math.floor(elapsed % 60)).padStart(2, "0");
      this.clock.textContent = `T+ ${minutes}:${seconds}`;
    }

    requestAnimationFrame((next) => this.frame(next));
  }
}
