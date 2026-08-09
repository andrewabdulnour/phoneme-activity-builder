import { IPA_KEYBOARD_GROUPS, IPA_TO_GRAPHEME, PHONEME_LENGTHS } from "./phonemeData";

// Produces a single, dependency-free HTML document that plays the
// phoneme Wordle activity in any browser, with no build step and no
// network requests.
export function generateWordleHtml({ word, length, teacherNote }) {
  const settings = PHONEME_LENGTHS[length] || PHONEME_LENGTHS[3];
  const config = {
    target: word.phonemes,
    display: word.display,
    maxGuesses: settings.maxGuesses,
    prefillFirst: settings.prefillFirst,
    difficultyLabel: settings.label,
    keyboardGroups: IPA_KEYBOARD_GROUPS,
    ipaToGrapheme: IPA_TO_GRAPHEME,
    teacherNote: teacherNote || "",
  };

  const configJson = JSON.stringify(config).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phoneme Wordle — ${escapeHtml(word.display)}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f8fafc;
    --fg: #0f172a;
    --card: #ffffff;
    --border: #cbd5e1;
    --green: #22c55e;
    --yellow: #eab308;
    --gray: #94a3b8;
    --accent: #4338ca;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0f172a; --fg: #f1f5f9; --card: #1e293b; --border: #334155; }
  }
  * { box-sizing: border-box; }
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
  .phoneme-banner {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 0.75rem 1.25rem;
    margin: 1rem 0;
    text-align: center;
    font-size: 1.1rem;
    letter-spacing: 0.15em;
  }
  .phoneme-banner strong { color: var(--accent); }
  #message {
    min-height: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-align: center;
  }
  #grid {
    display: grid;
    gap: 0.4rem;
    margin-bottom: 1.25rem;
  }
  .row { display: grid; gap: 0.4rem; grid-auto-flow: column; justify-content: center; }
  .tile {
    width: 3.4rem;
    height: 3.4rem;
    border: 2px solid var(--border);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.1rem;
    background: var(--card);
  }
  .tile.green { background: var(--green); border-color: var(--green); color: white; }
  .tile.yellow { background: var(--yellow); border-color: var(--yellow); color: white; }
  .tile.gray { background: var(--gray); border-color: var(--gray); color: white; }
  #keyboard { display: flex; flex-direction: column; gap: 0.6rem; align-items: center; max-width: 40rem; }
  .kbd-group-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--gray);
    margin: 0 0 0.15rem;
    text-align: center;
  }
  .kbd-row { display: flex; gap: 0.35rem; flex-wrap: wrap; justify-content: center; margin-bottom: 0.25rem; }
  button.key {
    position: relative;
    border-radius: 0.4rem;
    padding: 0.55rem 0.7rem;
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--fg);
    font-weight: 600;
    cursor: pointer;
    min-width: 2.2rem;
    font-size: 0.9rem;
  }
  button.key:hover, button.key:focus-visible { outline: 2px solid var(--accent); }
  button.key.status-green { background: var(--green); color: #fff; border-color: var(--green); }
  button.key.status-yellow { background: var(--yellow); color: #fff; border-color: var(--yellow); }
  button.key.status-gray { background: var(--gray); color: #fff; border-color: var(--gray); }
  button.control {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
    font-size: 0.8rem;
  }
  #hint-panel {
    min-height: 1.4rem;
    font-size: 0.85rem;
    color: var(--accent);
    margin-bottom: 0.4rem;
    text-align: center;
  }
  #result-panel {
    display: none;
    margin-top: 1.25rem;
    text-align: center;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 1rem 1.5rem;
  }
  #result-panel.show { display: block; }
  #result-panel .english-word { font-size: 2rem; font-weight: 800; color: var(--accent); }
  footer { margin-top: 2rem; font-size: 0.75rem; color: var(--gray); text-align: center; }
</style>
</head>
<body>
<header>
  <h1>Phoneme Wordle</h1>
  <p class="subtitle" id="difficulty-label"></p>
</header>

<div class="phoneme-banner">
  Target phoneme sequence: <strong id="phoneme-display"></strong>
</div>

<p id="hint-panel" aria-live="polite"></p>
<p id="message" role="status" aria-live="polite"></p>
<div id="grid"></div>

<div id="keyboard" role="group" aria-label="Phoneme tile keyboard"></div>

<div id="result-panel" role="status" aria-live="polite">
  <p>The word was:</p>
  <div class="english-word" id="result-word"></div>
  <p id="result-phoneme"></p>
</div>

<footer id="teacher-note"></footer>

<script>
const CONFIG = ${configJson};

const state = {
  guesses: [],
  current: CONFIG.prefillFirst ? [CONFIG.target[0]] : [],
  finished: false,
  keyStatus: {},
};

function tooltipFor(phoneme) {
  const data = CONFIG.ipaToGrapheme[phoneme];
  if (!data) return phoneme;
  return "/" + phoneme + "/  →  " + data.grapheme + '  (as in "' + data.example + '")';
}

function el(tag, props, ...children) {
  const node = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (k === "className") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  });
  children.flat().forEach((c) => {
    if (c === null || c === undefined) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function renderHeader() {
  document.getElementById("difficulty-label").textContent = CONFIG.difficultyLabel;
  document.getElementById("phoneme-display").textContent = CONFIG.target.map((p) => "/" + p + "/").join("  ");
  document.title = "Phoneme Wordle — " + CONFIG.display;
  const note = document.getElementById("teacher-note");
  note.textContent = "Andrew Abdulnour — 20719271" + (CONFIG.teacherNote ? " · " + CONFIG.teacherNote : "");
}

function renderGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = "repeat(" + CONFIG.target.length + ", auto)";
  for (let r = 0; r < CONFIG.maxGuesses; r++) {
    const row = el("div", { className: "row" });
    for (let c = 0; c < CONFIG.target.length; c++) {
      let text = "";
      let status = "";
      if (r < state.guesses.length) {
        text = state.guesses[r].tiles[c];
        status = state.guesses[r].statuses[c];
      } else if (r === state.guesses.length && c < state.current.length) {
        text = state.current[c];
      }
      row.appendChild(el("div", { className: "tile " + status }, text));
    }
    grid.appendChild(row);
  }
}

function renderKeyboard() {
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";
  CONFIG.keyboardGroups.forEach((group) => {
    kb.appendChild(el("p", { className: "kbd-group-label" }, group.label));
    group.rows.forEach((rowTiles) => {
      const row = el("div", { className: "kbd-row" });
      rowTiles.forEach((tile) => {
        const status = state.keyStatus[tile];
        const classes = ["key", status ? "status-" + status : ""].filter(Boolean).join(" ");
        const btn = el(
          "button",
          {
            className: classes,
            type: "button",
            title: tooltipFor(tile),
            "aria-label": tile + ". " + tooltipFor(tile),
            onClick: () => handleKey(tile),
            onMouseenter: () => showHint(tile),
            onFocus: () => showHint(tile),
          },
          tile
        );
        row.appendChild(btn);
      });
      kb.appendChild(row);
    });
  });
  const controls = el("div", { className: "kbd-row" });
  controls.appendChild(el("button", { className: "key control", type: "button", onClick: () => handleKey("DEL") }, "DEL"));
  controls.appendChild(el("button", { className: "key control", type: "button", onClick: () => handleKey("ENTER") }, "ENTER"));
  kb.appendChild(controls);
}

function showHint(tile) {
  document.getElementById("hint-panel").textContent = tooltipFor(tile);
}

function handleKey(key) {
  if (state.finished) return;
  if (key === "DEL") {
    state.current.pop();
  } else if (key === "ENTER") {
    submitGuess();
  } else if (state.current.length < CONFIG.target.length) {
    state.current.push(key);
  }
  renderGrid();
}

function submitGuess() {
  if (state.current.length !== CONFIG.target.length) {
    setMessage("Not enough phonemes for this " + CONFIG.target.length + "-phoneme word.");
    return;
  }
  const guessTiles = state.current.slice();
  const statuses = new Array(guessTiles.length).fill("gray");
  const targetPool = CONFIG.target.slice();

  guessTiles.forEach((tile, i) => {
    if (tile === CONFIG.target[i]) {
      statuses[i] = "green";
      targetPool[i] = null;
    }
  });
  guessTiles.forEach((tile, i) => {
    if (statuses[i] === "green") return;
    const idx = targetPool.indexOf(tile);
    if (idx !== -1) {
      statuses[i] = "yellow";
      targetPool[idx] = null;
    }
  });

  guessTiles.forEach((tile, i) => {
    const rank = { gray: 0, yellow: 1, green: 2 };
    if (!state.keyStatus[tile] || rank[statuses[i]] > rank[state.keyStatus[tile]]) {
      state.keyStatus[tile] = statuses[i];
    }
  });

  state.guesses.push({ tiles: guessTiles, statuses });
  state.current = [];

  const won = statuses.every((s) => s === "green");
  if (won) {
    finish(true);
  } else if (state.guesses.length >= CONFIG.maxGuesses) {
    finish(false);
  } else {
    setMessage("Guess " + (state.guesses.length + 1) + " of " + CONFIG.maxGuesses + ".");
  }
  renderGrid();
  renderKeyboard();
}

function finish(won) {
  state.finished = true;
  setMessage(won ? "Correct! Well done." : "Out of guesses.");
  const panel = document.getElementById("result-panel");
  panel.classList.add("show");
  document.getElementById("result-word").textContent = CONFIG.display;
  document.getElementById("result-phoneme").textContent =
    CONFIG.target.map((p) => "/" + p + "/").join("  ") + "  →  " + CONFIG.display;
}

function setMessage(msg) {
  document.getElementById("message").textContent = msg;
}

document.addEventListener("keydown", (e) => {
  if (state.finished) return;
  if (e.key === "Enter") handleKey("ENTER");
  else if (e.key === "Backspace") handleKey("DEL");
});

renderHeader();
renderGrid();
renderKeyboard();
setMessage("Guess " + (state.guesses.length + 1) + " of " + CONFIG.maxGuesses + ".");
</script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
