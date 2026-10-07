# Testing — Assessment 3

Three kinds of testing were used, each answering a different question:

| Tool | Question it answers | Where |
|---|---|---|
| **Playwright** | Do the builder and the generated activities work end to end, in a real browser? | `tests/e2e/` |
| **Apache JMeter** | How does the system behave as the number of users grows from 1 to 10,000? | `tests/load/` |
| **Lighthouse** | Can everyone use it — keyboard, screen reader, low vision? | `scripts/lighthouse-a11y.mjs`, `docs/lighthouse/` |

---

## 1. End-to-end tests (Playwright)

Run with the dev server up (`npm run dev`), or let Playwright start it:

```bash
npm run test:e2e          # headless, list + HTML report
npm run test:e2e:ui       # interactive UI mode (watch each step)
npm run test:e2e:report   # open the last HTML report
```

Tests create uniquely named records and delete them afterwards, so they are safe to run
against the development database.

| Spec | Use case | What it proves |
|---|---|---|
| `builder-word-list-crud.spec.js` | **Builder — CRUD on a word list** | Teacher creates a list, adds the word *chip* by tapping `/tʃ/ /ɪ/ /p/` on the IPA keyboard, reads it back through the API, edits the hint, deletes the word and the list. The empty-list warning appears and disappears, and the dashboard's activity feed records the deletion (audit trail). |
| `builder-activity-crud.spec.js` | **Builder — CRUD on an activity configuration** | Teacher saves a Word Search (difficulty 3, 8×8 grid, student note) against a stored list; it is listed and stored with those settings; the dashboard's Word Search count goes up by one; a `PATCH` changes the grid to 12×12 and the UI shows it; delete removes it (`404` afterwards). |
| `user-generate-play.spec.js` › Wordle | **User — generate and play a Wordle** | Teacher clicks *Preview* on a saved Wordle; the generated standalone file opens in a new tab; the student makes a wrong guess (tiles coloured, "Guess 2 of 6") then the right one ("Correct! Well done.", three green tiles, result panel). The successful generation is counted in `/api/stats`. |
| `user-generate-play.spec.js` › Word Search | **User — generate and play a Word Search** | The generated file has a 10×10 grid and a 5-word bank; the test drags across a hidden word and the game marks it found. |
| `user-generate-play.spec.js` › builder download | **User — download from the builder page** | *Generate .html file* on `/wordle` downloads `phoneme-wordle-*.html` containing a complete, self-contained game. |
| `observability.spec.js` | **Monitoring** | `GET /health` returns `200` with `database: "connected"`; the dashboard shows *Healthy* and every key statistic; an activity on an **empty word list** fails to generate (`400`), shows a warning on the Activities page, raises a *critical* and a *warning* alert on the dashboard, and appears in the Reports failure log. |

Result: **8 / 8 passed** (≈5 s).

---

## 2. Load testing (JMeter)

### Method

`tests/load/phoneme-builder-load.jmx` models one virtual user as the full builder →
generated-activity workflow (7 requests):

1. `GET /health`
2. `GET /api/word-lists` (extracts a word-list id)
3. `GET /wordle` (builder page)
4. `POST /api/activities` — save a Wordle configuration (extracts the new id)
5. `GET /api/activities/{id}/generate` — build the playable HTML file (asserts it contains the game config)
6. `POST /api/telemetry/page-view` — the time-on-page beacon
7. `DELETE /api/activities/{id}` — clean up

Each level ran in JMeter's non-GUI mode against a **production build** (`next start`) on
port 3001 with its **own SQLite database**, so load testing never touched development data:

```bash
tests/load/start-load-server.sh     # terminal 1: build + start on :3001 with prisma/loadtest.db
tests/load/run-load-tests.sh        # terminal 2: x1, x10, x100, x1000, x10000
```

| Level | Users | Ramp-up | Requests |
|---|---:|---:|---:|
| x1 | 1 | 1 s | 7 |
| x10 | 10 | 5 s | 70 |
| x100 | 100 | 10 s | 700 |
| x1000 | 1,000 | 30 s | 7,000 |
| x10000 | 10,000 | 60 s | 70,000 |

Environment: a single Apple-silicon Mac running both JMeter and the server — so the
client and server compete for the same CPU and network stack.

### Results (27 Sep 2026)

| Users | Requests | Error % | Avg ms | Median | p95 | p99 | Max | Throughput |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| x1 | 7 | 0.00 | 7.9 | 5 | 26 | 26 | 26 | 7 req/s |
| x10 | 70 | 0.00 | 3.8 | 3 | 8 | 31 | 31 | 14 req/s |
| x100 | 700 | 0.00 | 2.9 | 2 | 7 | 12 | 26 | 70 req/s |
| x1,000 | 7,000 | 0.00 | 1.9 | 1 | 5 | 10 | 50 | 234 req/s |
| x10,000 | 70,000 | 2.74 | 12.2 | 4 | 31 | 175 | 737 | 1,159 req/s |

Full tables (including a per-request breakdown at x10,000) are in
`docs/load-testing/results-2026-09-27.md`; JMeter's own HTML dashboards for x1,000 and
x10,000 are in `docs/load-testing/jmeter-dashboard-x*/index.html`; the server's view of each
run (`/api/metrics` captured straight after it) is in `docs/load-testing/x*.server-metrics.json`.

### What the results show

- **x1 → x1,000: flat and error-free.** Throughput scaled from 7 to 234 requests/s with
  no errors, and latency actually *fell* (average 7.9 ms → 1.9 ms) as the Node.js process
  warmed up (JIT compilation, Prisma connection pool, SQLite page cache). At this scale the
  system is nowhere near a limit — a whole school using the builder at once is comfortably
  within x1,000.
- **x10,000: the first signs of saturation.** At ~1,160 requests/s the median was still
  4 ms, but the tail stretched (p99 175 ms, max 737 ms) and **2.74 % of requests failed**.
- **The failures were at the network layer, not in the application.** 1,727 of the 1,916
  errors were `java.net.SocketException: Connection reset by peer / Broken pipe`, and all of
  them fell inside a single ~10-second burst near the end of the ramp. The server's own
  metrics for that run recorded **54,452 requests with zero 5xx errors** and an in-app p95 of
  31 ms. The remaining 189 errors (`404` on generate/delete, `400` on save) were a knock-on
  effect: when a *save* was reset, the virtual user had no activity id for its next steps.
  The resets come from the listen backlog on macOS (`kern.ipc.somaxconn = 128`) and from
  JMeter and the server sharing one machine — connections queued faster than the single
  Node.js process accepted them.
- **The database kept up.** Every workflow does three writes (create, generation event,
  page view — plus two audit rows). Switching SQLite to write-ahead-log mode
  (`PRAGMA journal_mode = WAL`, `lib/prisma.js`) lets readers continue while those writes
  happen; no `SQLITE_BUSY` or Prisma timeout errors occurred at any level.
- **Instrumentation did not cost latency.** Generation and page-view events are written with
  Next.js `after()`, i.e. after the response has been sent, so recording usage adds nothing
  to the teacher's wait.
- **Memory stayed modest**: resident memory rose from ~50 MB to ~380 MB at x10,000 and the
  heap stayed near 60–75 MB, so there was no leak under sustained load.

### What would scale it further

1. Run several Node.js instances behind a reverse proxy / load balancer (the app is
   stateless apart from the database) and raise the OS listen backlog — this removes the
   connection-reset bottleneck seen at x10,000.
2. Move from SQLite to PostgreSQL (a one-line change of the Prisma `provider`) so writes
   from multiple instances are not serialised on one file.
3. Batch the observability inserts (queue in memory, flush every second) once event volume
   is very high.
4. Run the load generator on a separate machine so client and server do not compete.

---

## 3. Accessibility (Lighthouse)

```bash
npm run lighthouse -- --label after --theme light
npm run lighthouse -- --label after --theme dark
```

The script audits all nine pages and writes an HTML report per page plus
`summary.md` to `docs/lighthouse/<label>-<theme>/`.

### Before and after

| Page | Before (dark mode) | After — light | After — dark |
|---|---:|---:|---:|
| `/` | 98 | 100 | 100 |
| `/wordle` | 93 | 100 | 100 |
| `/word-search` | 91 | 100 | 100 |
| `/word-lists` | 96 | 100 | 100 |
| `/activities` | 96 | 100 | 100 |
| `/dashboard` | 97 | 100 | 100 |
| `/reports` | 100 | 100 | 100 |
| `/about` | 96 | 100 | 100 |
| `/settings` | 100 | 100 | 100 |
| **Average** | **96** | **100** | **100** |

(The baseline ran with the Mac's dark appearance, which the app follows by default — that
is why most of the problems it found were dark-mode ones. After fixing, both themes were
audited explicitly.)

### Changes made after reviewing the report

| Lighthouse finding | Where | Change |
|---|---|---|
| **Colour contrast** — muted grey text (`slate-500`, 3.7:1) and red *Delete* buttons (`red-600`, 3.7:1) on the dark card background | Word Lists, Activities, Wordle keyboard labels, About | Every muted-text class now has a light **and** dark step that clears 4.5:1 (`slate-600` in light, `slate-400` in dark); destructive buttons use `red-400` in dark mode. |
| **Links rely on colour** (`link-in-text-block`) — inline links only 1.2–1.4:1 against the surrounding text | Wordle, Word Search, Dashboard, About | Links inside sentences are now underlined, so they are identifiable without colour vision. |
| **ARIA grid missing required children** (`aria-required-children`) — `role="grid"` contained buttons directly | Word Search builder preview *and* the generated Word Search file | Cells are grouped into `role="row"` wrappers (`display: contents`, so the layout is unchanged) and each cell has `role="gridcell"`, giving screen readers the row/column structure the arrow-key navigation implies. |
| **Heading order skipped a level** (`heading-order`) | Home, Word Search | Feature-card titles and "Find these words" promoted from `h3` to `h2`. |
| **Table cell without a header** (`td-has-header`) — the Edit/Delete column had an empty `<th>` | Word Lists | Added a visually hidden "Actions" header. |

### How accessibility shaped the final design

Accessibility was designed into the new dashboard and reports rather than bolted on, which
is why `/dashboard` and `/reports` needed only one fix between them (an inline link):

- **Status is never colour alone.** Health and alerts use an icon (✓ ! ✕ i) *and* a word
  (Healthy / Critical / Warning), plus a hidden "Critical:" prefix for screen readers.
- **Every chart has a table.** Each chart has a *Show data table* toggle, so no value is
  only reachable by hovering. The daily chart is keyboard-focusable: the arrow keys step
  through the days, and the tooltip is announced.
- **Colour-blind-safe series colours.** Wordle (blue) and Word Search (orange) keep the
  same colour on every chart. The pair was checked with a colour-vision-deficiency
  validator, with a separate step for dark mode.
- **Direct labels.** Bar values are printed at the tip of each bar rather than left to a
  legend or tooltip.
- **Live regions** announce health-check results and simulator outcomes (`aria-live`).
