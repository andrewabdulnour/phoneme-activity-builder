import { generateWordSearchGrid } from "./wordSearchGenerator";
import { ALL_PHONEMES, IPA_TO_GRAPHEME } from "./phonemeData";

// Produces a single, dependency-free HTML document with a pre-baked
// phoneme word search puzzle (grid + solution paths computed at
// generation time) and vanilla-JS pointer-drag AND keyboard (arrow
// keys + Enter) selection for play in any browser.
export function generateWordSearchHtml({ wordList, size, teacherNote, length }) {
  const entries = wordList.map((w) => ({ label: w.display, units: w.phonemes }));
  const { grid, placements } = generateWordSearchGrid(entries, size, ALL_PHONEMES);

  const config = {
    grid,
    placements,
    size,
    length,
    words: wordList.map((w) => ({ display: w.display, phonemes: w.phonemes })),
    ipaToGrapheme: IPA_TO_GRAPHEME,
    teacherNote: teacherNote || "",
  };

  const configJson = JSON.stringify(config).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phoneme Word Search</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f8fafc;
    --fg: #0f172a;
    --card: #ffffff;
    --border: #cbd5e1;
    --accent: #4338ca;
    --found: #22c55e;
    --selecting: #eab308;
    --gray: #64748b;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0f172a; --fg: #f1f5f9; --card: #1e293b; --border: #334155; }
  }
  * { box-sizing: border-box; user-select: none; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--fg);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 1rem 3rem;
  }
  header { text-align: center; margin-bottom: 0.5rem; }
  h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
  .subtitle { color: var(--gray); font-size: 0.9rem; }
  main {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    margin-top: 1.25rem;
    max-width: 60rem;
  }
  #board {
    display: grid;
    gap: 2px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
  }
  .cell {
    min-width: 2.1rem;
    height: 2.1rem;
    padding: 0 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--card);
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    touch-action: none;
    border: none;
    color: var(--fg);
  }
  .cell:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .cell.selecting { background: var(--selecting); color: #fff; }
  .cell.found { background: var(--found); color: #fff; }
  #wordbank {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    min-width: 15rem;
  }
  #wordbank h2 { font-size: 1rem; margin: 0 0 0.6rem; }
  #wordbank ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  #wordbank li {
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 0.3rem 0.5rem;
    border-radius: 0.4rem;
    cursor: help;
  }
  #wordbank li.done { text-decoration: line-through; color: var(--found); }
  #message { min-height: 1.5rem; font-weight: 600; margin-top: 1rem; text-align: center; max-width: 30rem; }
  footer { margin-top: 2rem; font-size: 0.75rem; color: var(--gray); text-align: center; }
</style>
</head>
<body>
<header>
  <h1>Phoneme Word Search</h1>
  <p class="subtitle">Each cell is one phoneme. Find every word in the list.</p>
</header>

<main>
  <div id="board" role="grid" aria-label="Phoneme word search grid. Arrow keys to move, Enter to start and finish a selection."></div>
  <div id="wordbank">
    <h2>Find these words</h2>
    <ul id="word-list"></ul>
    <p style="margin-top:0.75rem;font-size:0.75rem;color:var(--gray);">Hover or focus a word to reveal its English spelling.</p>
  </div>
</main>

<p id="message" role="status" aria-live="polite"></p>
<footer id="teacher-note"></footer>

<script>
const CONFIG = ${configJson};

function tooltipFor(phoneme) {
  const data = CONFIG.ipaToGrapheme[phoneme];
  if (!data) return phoneme;
  return "/" + phoneme + "/  →  " + data.grapheme + '  (as in "' + data.example + '")';
}

const foundWords = new Set();
let dragging = false;
let startCell = null;
let currentPath = [];
let focusPos = [0, 0];
let selectStart = null;

function renderHeader() {
  document.title = "Phoneme Word Search";
  const note = document.getElementById("teacher-note");
  note.textContent = "Andrew Abdulnour — 20719271" + (CONFIG.teacherNote ? " · " + CONFIG.teacherNote : "");
}

function renderBoard() {
  const board = document.getElementById("board");
  board.style.gridTemplateColumns = "repeat(" + CONFIG.size + ", auto)";
  board.innerHTML = "";
  for (let r = 0; r < CONFIG.size; r++) {
    for (let c = 0; c < CONFIG.size; c++) {
      const token = CONFIG.grid[r][c];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.textContent = token;
      cell.title = tooltipFor(token);
      cell.setAttribute("aria-label", "Row " + (r + 1) + ", column " + (c + 1) + ": " + token + ". " + tooltipFor(token));
      cell.tabIndex = r === focusPos[0] && c === focusPos[1] ? 0 : -1;
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener("pointerdown", onPointerDown);
      cell.addEventListener("pointerenter", onPointerEnter);
      cell.addEventListener("focus", () => { focusPos = [r, c]; });
      board.appendChild(cell);
    }
  }
  board.addEventListener("keydown", onGridKeyDown);
  document.addEventListener("pointerup", onPointerUp);
}

function renderWordBank() {
  const list = document.getElementById("word-list");
  list.innerHTML = "";
  CONFIG.words.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = w.phonemes.map((p) => "/" + p + "/").join(" ");
    li.id = "word-" + w.display;
    li.title = w.display + " — " + w.phonemes.map((p) => "/" + p + "/").join(" ");
    list.appendChild(li);
  });
}

function cellEl(r, c) {
  return document.querySelector('.cell[data-row="' + r + '"][data-col="' + c + '"]');
}

function straightPath(start, end) {
  const [r0, c0] = start;
  const [r1, c1] = end;
  const dr = Math.sign(r1 - r0);
  const dc = Math.sign(c1 - c0);
  const len = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) + 1;
  if (r0 !== r1 && c0 !== c1 && Math.abs(r1 - r0) !== Math.abs(c1 - c0)) return null;
  const path = [];
  for (let i = 0; i < len; i++) path.push([r0 + dr * i, c0 + dc * i]);
  return path;
}

function pathsMatch(a, b) {
  if (a.length !== b.length) return false;
  const forward = a.every(([r, c], i) => b[i][0] === r && b[i][1] === c);
  const backward = a.every(([r, c], i) => b[b.length - 1 - i][0] === r && b[b.length - 1 - i][1] === c);
  return forward || backward;
}

function paintSelection() {
  clearSelectionStyles();
  currentPath.forEach(([r, c]) => {
    const el = cellEl(r, c);
    if (el && !el.classList.contains("found")) el.classList.add("selecting");
  });
}

function clearSelectionStyles() {
  document.querySelectorAll(".cell.selecting").forEach((el) => el.classList.remove("selecting"));
}

function evaluateSelection(path) {
  if (!path || path.length < 2) return;
  const match = CONFIG.placements.find(
    (p) => p.cells && !foundWords.has(p.label) && pathsMatch(p.cells, path)
  );
  if (match) {
    foundWords.add(match.label);
    match.cells.forEach(([r, c]) => cellEl(r, c).classList.add("found"));
    const li = document.getElementById("word-" + match.label);
    if (li) li.classList.add("done");
    setMessage(
      foundWords.size === CONFIG.words.length
        ? "All words found! Puzzle complete."
        : 'Found "' + match.label + '" (' + match.units_display + ')! (' + foundWords.size + "/" + CONFIG.words.length + ")"
    );
  }
}

// --- Pointer (mouse/touch) drag ---
function onPointerDown(e) {
  dragging = true;
  const r = Number(e.currentTarget.dataset.row);
  const c = Number(e.currentTarget.dataset.col);
  startCell = [r, c];
  currentPath = [[r, c]];
  paintSelection();
}
function onPointerEnter(e) {
  if (!dragging) return;
  const r = Number(e.currentTarget.dataset.row);
  const c = Number(e.currentTarget.dataset.col);
  const path = straightPath(startCell, [r, c]);
  if (path) { currentPath = path; paintSelection(); }
}
function onPointerUp() {
  if (!dragging) return;
  dragging = false;
  evaluateSelection(currentPath);
  clearSelectionStyles();
  currentPath = [];
}

// --- Keyboard: arrow keys move a roving focus cell, Enter marks the
// start then (second press) submits the straight-line path to the
// currently focused cell. ---
function focusCell(r, c) {
  document.querySelectorAll(".cell").forEach((el) => (el.tabIndex = -1));
  const el = cellEl(r, c);
  if (el) { el.tabIndex = 0; el.focus(); }
  focusPos = [r, c];
}

function onGridKeyDown(e) {
  const [r, c] = focusPos;
  let next = null;
  if (e.key === "ArrowUp") next = [Math.max(0, r - 1), c];
  else if (e.key === "ArrowDown") next = [Math.min(CONFIG.size - 1, r + 1), c];
  else if (e.key === "ArrowLeft") next = [r, Math.max(0, c - 1)];
  else if (e.key === "ArrowRight") next = [r, Math.min(CONFIG.size - 1, c + 1)];
  else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (!selectStart) {
      selectStart = [r, c];
      currentPath = [[r, c]];
      paintSelection();
    } else {
      evaluateSelection(currentPath);
      clearSelectionStyles();
      selectStart = null;
      currentPath = [];
    }
    return;
  } else if (e.key === "Escape") {
    selectStart = null;
    currentPath = [];
    clearSelectionStyles();
    return;
  } else {
    return;
  }
  e.preventDefault();
  focusCell(next[0], next[1]);
  if (selectStart) {
    const path = straightPath(selectStart, next);
    currentPath = path || [selectStart];
    paintSelection();
  }
}

function setMessage(msg) {
  document.getElementById("message").textContent = msg;
}

// Precompute a display string ("θ ɪ n") per placement for messages.
CONFIG.placements.forEach((p) => { p.units_display = p.units.join(" "); });

renderHeader();
renderBoard();
renderWordBank();
setMessage("Click/tap and drag across phonemes to find each word — or use Tab, arrow keys and Enter.");
</script>
</body>
</html>`;
}
