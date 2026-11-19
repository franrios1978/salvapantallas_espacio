export function createUI({ songs, selected, onToggle, onSelect, onNext, onVolume }) {
  const title = document.querySelector("#nowTitle");
  const section = document.querySelector("#nowSection");
  const volume = document.querySelector("#vol");
  const floatingButton = document.querySelector(".play-floating");
  const nextButton = document.querySelector(".next-floating");
  const pendingText = "Pulsa para activar el audio";
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
  nextButton.addEventListener("click", onNext);
  volume.addEventListener("input", (event) => onVolume(Number(event.target.value)));

  function writeSection(text) {
    section.textContent = audioPending ? pendingText : text;
    section.classList.toggle("audio-pending", audioPending);
  }

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
    floatingButton.textContent = audioPending ? "Activar audio" : state ? "Detener" : "Reproducir";
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
      writeSection("Pulsa reproducir para despegar");
    },
    showPlaying(info) {
      lastInfo = info;
      paint(info);
      title.textContent = currentSong.name;
      writeSection(info.name);
    },
    showStopped() {
      lastInfo = null;
      paint(null);
      title.textContent = "En reposo";
      writeSection("Pulsa reproducir para despegar");
    },
    showError(message) {
      section.classList.remove("audio-pending");
      section.textContent = message;
    },
    setAudioPending(value) {
      audioPending = value;
      paint(lastInfo);
      writeSection(lastInfo ? lastInfo.name : "Pulsa reproducir para despegar");
    },
  };
}
