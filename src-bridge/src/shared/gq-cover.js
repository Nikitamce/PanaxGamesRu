var PALETTES = [
  ["#ff2fb3", "#12062b", "#22d3ee"],
  ["#c8a24a", "#14100a", "#ff7a3d"],
  ["#6ea8ff", "#060a24", "#b388ff"],
  ["#7ee787", "#14202b", "#ffd166"],
  ["#ff8a3d", "#171a22", "#66d9ff"],
  ["#ff8fb1", "#1b0f24", "#7cf3d4"],
  ["#7fd4ff", "#07131f", "#a7ff9c"],
  ["#ffd23f", "#1a1207", "#ff4d6d"]
];
function paletteFor(seed) {
  let s = 0;
  for (const ch of String(seed)) s = s * 31 + ch.charCodeAt(0) >>> 0;
  return PALETTES[s % PALETTES.length];
}
