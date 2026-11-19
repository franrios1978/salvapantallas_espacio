const buildBarMap = ({ sections }) =>
  sections.flatMap((section, index) =>
    Array.from({ length: section.bars }, (_, barIn) => ({ section, index, barIn })),
  );

const songData = {
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
    { name: "Nebulosa", bars: 8, layers: ["kick", "hat", "ohat", "bass", "pad", "stab", "arp"] },
    { name: "Silencio", bars: 4, layers: ["pad", "arp"], riser: true },
    { name: "Corriente II", bars: 4, layers: ["kick", "hat", "bass", "pad", "stab"] },
  ],
};

export const song = {
  ...songData,
  barMap: buildBarMap(songData),
  totalBars: songData.sections.reduce((total, { bars }) => total + bars, 0),
};
