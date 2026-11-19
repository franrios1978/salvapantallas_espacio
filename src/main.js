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
