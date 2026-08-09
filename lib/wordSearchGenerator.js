// Pure word-search grid generator. Cells hold phoneme tokens (which can
// be multi-character, e.g. "tʃ", "əʉ") rather than single English
// letters — each entry supplies a `units` array (one phoneme per grid
// cell) instead of a plain string. Used both by the live React preview
// and to bake a fixed puzzle into the exported standalone HTML file.

const DIRECTIONS = [
  [0, 1], // E
  [0, -1], // W
  [1, 0], // S
  [-1, 0], // N
  [1, 1], // SE
  [-1, -1], // NW
  [1, -1], // SW
  [-1, 1], // NE
];

function randomToken(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function canPlace(grid, size, units, row, col, dr, dc) {
  for (let i = 0; i < units.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const existing = grid[r][c];
    if (existing !== null && existing !== units[i]) return false;
  }
  return true;
}

// entries: [{ label, units }] where `units` is an array of phoneme
// tokens (one per cell) and `label` is a human-readable identifier
// (e.g. the English spelling) used only to report back which entry a
// placement belongs to.
export function generateWordSearchGrid(entries, size = 10, fillerPool, attemptsPerWord = 200) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placements = [];

  const sorted = [...entries].sort((a, b) => b.units.length - a.units.length);

  for (const entry of sorted) {
    const units = entry.units;
    let placed = false;
    for (let attempt = 0; attempt < attemptsPerWord && !placed; attempt++) {
      const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      if (canPlace(grid, size, units, row, col, dr, dc)) {
        const cells = [];
        for (let i = 0; i < units.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          grid[r][c] = units[i];
          cells.push([r, c]);
        }
        placements.push({ label: entry.label, units, cells });
        placed = true;
      }
    }
    if (!placed) {
      placements.push({ label: entry.label, units, cells: null });
    }
  }

  const pool = fillerPool && fillerPool.length ? fillerPool : ["p", "t", "k", "s", "n", "m", "æ", "ɪ"];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) grid[r][c] = randomToken(pool);
    }
  }

  return { grid, placements };
}
