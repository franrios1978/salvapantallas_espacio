export function createUI({ songs, selected, onToggle, onSelect, onNext, onVolume }) {
  const title = document.querySelector("#nowTitle");
  const volume = document.querySelector("#vol");
  const floatingButton = document.querySelector(".play-floating");
  const centerPlay = document.querySelector(".play-center");
  const nextButton = document.querySelector(".next-floating");
  const pendingText = "Activar audio";
  const readyText = "Reproducir";
  let currentSong = selected;
  let lastInfo = null;
  let audioPending = false;

  const cards = songs.map((song) => {
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
    return {
      song,
      card,
      button: card.querySelector(".play"),
      where: card.querySelector(".where"),
      segments: [...card.querySelectorAll(".seg")],
    };
  });

  for (const entry of cards) {
    entry.button.addEventListener("click", () => onSelect(entry.song));
  }
  floatingButton.addEventListener("click", onToggle);
  centerPlay.addEventListener("click", onToggle);
  nextButton.addEventListener("click", onNext);
  volume.addEventListener("input", (event) => onVolume(Number(event.target.value)));

  function paint(state) {
    for (const entry of cards) {
      const playing = entry.song === currentSong && Boolean(state);
      entry.card.classList.toggle("on", playing);
      entry.card.classList.toggle("selected", entry.song === currentSong);
      entry.button.setAttribute("aria-pressed", String(playing));
      entry.button.textContent = playing ? "Detener" : "Reproducir";
      entry.where.textContent = playing
        ? `${state.name} · compás ${state.bar + 1}/${state.total}`
        : "";
      entry.segments.forEach((segment, index) => {
        segment.classList.toggle("now", playing && index === state.index);
        segment.classList.toggle("done", playing && index < state.index);
      });
    }
    floatingButton.setAttribute("aria-pressed", String(Boolean(state)));
    floatingButton.textContent = audioPending ? pendingText : state ? "Detener" : readyText;
    centerPlay.setAttribute("aria-pressed", String(Boolean(state)));
    centerPlay.textContent = audioPending ? pendingText : readyText;
    centerPlay.hidden = Boolean(state) && !audioPending;
    const next = songs[(songs.indexOf(currentSong) + 1) % songs.length];
    nextButton.title = `Siguiente: ${next.name}`;
    nextButton.setAttribute("aria-label", `Siguiente tema: ${next.name}`);
  }

  return {
    showSelected(song) {
      currentSong = song;
      lastInfo = null;
      paint(null);
      title.textContent = song.name;
    },
    showPlaying(info) {
      lastInfo = info;
      paint(info);
      title.textContent = currentSong.name;
    },
    showStopped() {
      lastInfo = null;
      paint(null);
      title.textContent = "En reposo";
    },
    showError(message) {
      centerPlay.textContent = message;
      centerPlay.hidden = false;
    },
    setAudioPending(value) {
      audioPending = value;
      paint(lastInfo);
    },
  };
}
