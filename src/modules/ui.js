import { song } from "./song.js";

export function createUI({ onToggle, onVolume }) {
  const title = document.querySelector("#nowTitle");
  const section = document.querySelector("#nowSection");
  const clock = document.querySelector("#clock");
  const volume = document.querySelector("#vol");

  const card = document.createElement("article");
  card.className = "card";
  card.style.setProperty("--c", song.color);
  card.innerHTML = `
    <h2>${song.name}</h2>
    <p class="mood">${song.mood}</p>
    <div class="chips"><span>${song.bpm} BPM</span><span>${song.key}</span><span>${song.totalBars} compases</span></div>
    <div class="map" aria-hidden="true">${song.sections
      .map(
        ({ name, bars }) =>
          `<span class="seg" style="flex:${bars}" title="${name}, ${bars} compases"></span>`,
      )
      .join("")}</div>
    <div class="where" aria-live="off"></div>
    <button class="play" type="button" aria-pressed="false">Reproducir</button>`;
  document.querySelector("#tracks").append(card);

  const button = card.querySelector(".play");
  const where = card.querySelector(".where");
  const segments = [...card.querySelectorAll(".seg")];

  button.addEventListener("click", onToggle);
  volume.addEventListener("input", (event) => onVolume(Number(event.target.value)));

  function paint(state) {
    card.classList.toggle("on", Boolean(state));
    button.setAttribute("aria-pressed", String(Boolean(state)));
    button.textContent = state ? "Detener" : "Reproducir";
    where.textContent = state ? `${state.name} · compás ${state.bar + 1}/${state.total}` : "";
    segments.forEach((segment, index) => {
      segment.classList.toggle("now", Boolean(state) && index === state.index);
      segment.classList.toggle("done", Boolean(state) && index < state.index);
    });
  }

  return {
    showPlaying(info) {
      paint(info);
      title.textContent = song.name;
      section.textContent = info.name;
    },
    showStopped() {
      paint(null);
      title.textContent = "En reposo";
      section.textContent = "Pulsa reproducir para despegar";
      clock.textContent = "T+ 00:00";
    },
    showError(message) {
      section.textContent = message;
    },
  };
}
