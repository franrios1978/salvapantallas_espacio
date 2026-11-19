import { song } from "./modules/song.js";
import { Synth } from "./modules/synth.js";
import { Player } from "./modules/player.js";
import { Scene } from "./modules/scene.js";
import { createUI } from "./modules/ui.js";

let volume = 0.8;
let current = null;

const scene = new Scene(document.querySelector("#scene"), document.querySelector("#clock"));

const ui = createUI({
  onToggle: () => (current ? stop() : play()),
  onVolume: (value) => {
    volume = value;
    if (current)
      current.synth.out.gain.setTargetAtTime(volume, current.synth.ctx.currentTime, 0.02);
  },
});

function stop() {
  if (!current) return;
  const { synth, player } = current;
  current = null;
  player.stop();
  synth.out.gain.setTargetAtTime(0, synth.ctx.currentTime, 0.06);
  setTimeout(() => synth.ctx.close(), 500);
  scene.setSource(null);
  ui.showStopped();
}

function play() {
  stop();
  let synth;
  try {
    synth = new Synth(volume);
  } catch {
    ui.showError("Tu navegador no permite audio aquí");
    return;
  }
  synth.ctx.resume();

  const player = new Player(song, synth, (info) => {
    if (current?.song === song) ui.showPlaying(info);
  });

  current = { song, synth, player };
  scene.setSource(current);
  ui.showPlaying({ index: 0, bar: 0, total: song.totalBars, name: song.sections[0].name });
}

addEventListener("pagehide", stop);
scene.start();
