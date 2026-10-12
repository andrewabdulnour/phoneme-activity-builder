  # Phoneme Activity Builder

**Assessment 4 — Testing, performance and technical defence (final integrated system)**
Andrew Abdulnour — Student No. 20719271
GitHub: https://github.com/andrewabdulnour/phoneme-activity-builder

A full-stack builder for phoneme-based classroom activities for Speech Pathology students
and teachers. Teachers manage phoneme-based **word lists** and saved **activity
configurations** (Wordle or Word Search) through a database-backed REST API, preview them
live, and generate a single self-contained `.html` file — built from stored data — that
plays in any browser with no server, database, or internet connection.

This stage continues directly from Assessment 1 (frontend design and usability). The
interface and the standalone-HTML generators are unchanged in purpose; Assessment 2 adds
the backend, database, API, validation, and Docker packaging that make the builder
data-driven and reproducible. **Assessment 3** (this stage) turns it into a monitored,
reportable system: every generation, page visit and builder change is stored, then
summarised on a live **dashboard**, a **reports** view, and a set of **alerts** — and the
whole system is tested with **Playwright**, **JMeter** and **Lighthouse**. **Assessment 4**
brings it together for the live demonstration and addresses the marker feedback from the
earlier stages (below).

## Assessment 4: what changed and why

Each change responds to written feedback on an earlier submission.

| Feedback (assessment) | Change | Where |
| --- | --- | --- |
| Docker ran one service with SQLite, not separate services (A2) | PostgreSQL 17 now runs as its own `db` service; a one-shot `migrate` job applies migrations and seeds; the `app` service starts only once both succeed (healthcheck-ordered). Optional Adminer service for inspecting the database. | `docker-compose.yml`, `Dockerfile`, `docker-entrypoint.sh` |
| Database-level constraints could be stronger (A2) | Fixed vocabularies are Postgres **enums**; **CHECK** constraints enforce difficulty, grid size and guess ranges, type-specific settings and "a failed generation has a reason"; a word's spelling is **unique within its list**. | `prisma/schema.prisma`, `prisma/migrations/*_postgres_init` |
| Cross-entity and edge-case validation (A2) | An activity's target word must belong to its word list; moving an activity to another list clears a stale target; Wordle-only / Word-Search-only settings are rejected on the wrong type; database rule violations return 400/409, never 500. | `lib/activities.js`, `lib/apiResponse.js` |
| Legacy hard-coded logic remained (A2) | The second, hard-coded copy of the 90-word corpus is gone; the builder pages read every word from the database. | `lib/phonemeData.js`, `lib/useWordLists.js`, `app/wordle`, `app/word-search` |
| Duplicated logic (A2) | Activity defaults, word-picking rules and labels live in one module shared by browser and server (they had drifted: a 3-phoneme Wordle got 7 guesses in the builder but 5 when saved). Shared form styles and word-creation helper. | `lib/activityRules.js`, `components/forms.js`, `lib/wordLists.js` |
| Teachers could not choose their own words (A1) | Teachers tick exactly which words go into a Word Search (builder and saved activities), and set Wordle guesses and first-phoneme pre-fill. Teachers add their own words on Word Lists. | `components/WordPicker.js` |
| Theme used utilities + direct DOM writes, not a provider (A1) | `ThemeProvider` React context owns theme and layout density; "System" follows OS changes live. | `components/ThemeProvider.js` |
| Not every control had the same hover feedback (A1) | One shared set of control styles with hover and focus states. | `components/forms.js` |
| Few commits (A1) | Work is committed in small, described steps on the `assessment-4` branch. | `git log` |

Why the frontend and API are still one service: the dashboard and reports pages are React
Server Components that call the same data functions as the API directly, so splitting them
into separate containers would add a network hop and duplicate the data layer without a
real benefit at classroom scale. The database — the piece with different scaling,
backup and lifecycle needs — is the part that was separated.

## Assessment 3 at a glance

| Requirement | Where |
| --- | --- |
| Health check — `/health` returns `200 OK` | `app/health/route.js`; polled live on the dashboard every 10 s |
| Dashboard — activities created (Wordle / Word Search), successful and failed generations, average time on page, most-used activity type | `/dashboard` (`app/dashboard/page.js`, `lib/stats.js`), including a *Generated activities* table that links each saved activity to its word list and opens the generated game |
| Alerts — failed generation, empty word lists, invalid phoneme data, misconfigured activities | `lib/alerts.js`, `GET /api/alerts`, dashboard alerts panel |
| Reporting views — 7 / 30 / 90-day charts and tables, CSV export | `/reports`, `GET /api/reports`, `GET /api/reports/export` |
| Simulated input records, stored in the database | `lib/simulation.mjs`, `POST /api/simulate`, seed script |
| Server-side monitoring | `GET /api/metrics` (JSON or Prometheus format) |
| Playwright — builder CRUD and generate/play use cases | `tests/e2e/` — 15 / 15 passing (7 added in Assessment 4) |
| JMeter — x1, x10, x100, x1000, x10000 users | `tests/load/`, results in `docs/load-testing/` |
| Lighthouse accessibility, before and after | `scripts/lighthouse-a11y.mjs`, reports in `docs/lighthouse/` |

The full testing write-up, with the load-test analysis and the accessibility changes, is in
**[`docs/TESTING.md`](docs/TESTING.md)**.

## How the data flows

```
Teacher (builder pages)                     Student (generated .html file)
   │  create / edit / delete                       ▲
   ▼                                               │ generate (preview / download)
REST API route handlers ──► Prisma ──► PostgreSQL ──┘
   │  every request timed          │  WordList, Word, Phoneme, ActivityConfig
   ▼                               │  GenerationEvent, PageView, AuditEvent
lib/metrics.js (in memory)         ▼
   │                        lib/stats.js · lib/alerts.js · reports
   ▼                               │
/api/metrics, /health  ─────►  /dashboard  ·  /reports  ·  CSV export
```

1. **Content** — word lists, words, ordered phoneme symbols and activity configurations
   (type, difficulty, hints, grid size, output settings) are stored as in Assessment 2.
2. **Events** — each attempt to generate an activity writes a `GenerationEvent` (success or
   failure, with the reason, time taken and file size). The builder pages report their
   in-browser generations through `POST /api/telemetry/generation`. `PageTimeTracker`
   sends the visible time on each page with `navigator.sendBeacon` when the visitor leaves
   (`PageView`). Every create, update and delete writes an `AuditEvent`, so creation counts
   stay correct after records are deleted. Events are written with Next.js `after()`,
   after the response has gone, so recording them never slows the teacher down.
3. **Aggregation** — `lib/stats.js` and the reports route turn those rows into totals,
   rates, averages and daily series; `lib/alerts.js` applies rules to the stored data and
   recent events.
4. **Presentation** — the dashboard and reports pages are server-rendered from the same
   functions the JSON API uses, so the page and the API always agree.

### Simulated records

`npm run db:seed` loads the real corpus, then adds 30 days of simulated usage (activities,
generations including some failures, and page views). The dashboard's simulator panel can
add more (`POST /api/simulate`) or remove it all (`DELETE /api/simulate`). Every simulated
row carries `simulated = true`, so it can be told apart from real use and cleared without
touching it. `node prisma/seed.js --no-simulate` seeds content only.

## Testing

```bash
npm run test:e2e                              # Playwright end-to-end tests
tests/load/start-load-server.sh               # JMeter: production server on :3001
tests/load/run-load-tests.sh                  # JMeter: x1 → x10000 users
npm run lighthouse -- --label after --theme light   # Lighthouse accessibility audit
```

| | Result |
| --- | --- |
| Playwright | 15 / 15 tests pass (local dev server and the Docker production stack): word-list CRUD, activity CRUD, generating and playing a Wordle and a Word Search, downloading from the builder, health and alerts, plus (A4) data-integrity rules, the Word Search word picker and the theme provider |
| JMeter (A3, SQLite build) | No errors and sub-50 ms responses from x1 to x1000; at x10000 users, 2.7 % of requests failed with connection resets from the single-machine setup's network limits, and the app logged no server errors |
| Lighthouse | Accessibility average went from 96 to **100**, with all 9 pages at 100 in both light and dark mode |

See [`docs/TESTING.md`](docs/TESTING.md) for method, full results and discussion. The JMeter
figures were measured in Assessment 3, before the move to PostgreSQL; the load-test server
script now targets a separate `phoneme_loadtest` Postgres database so the run can be
repeated on the current stack.

## Stack

| Concern            | Choice                                                             |
| ------------------ | ----------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router) — `npx create-next-app`                   |
| Language / UI      | React 19, Tailwind CSS v4                                        |
| API                | Next.js Route Handlers (`app/**/route.js`)                       |
| ORM / database     | Prisma 6 + PostgreSQL 17 (own Docker service, named volume)      |
| Validation         | Zod                                                              |
| Packaging          | Multi-stage `Dockerfile` + `docker-compose.yml` (db, migrate, app) |

Assessments 2 and 3 used SQLite, which kept everything in one container. Assessment 4
moves to PostgreSQL: concurrent writes no longer queue on a single file lock (relevant
because every generation and page view is also an INSERT), the database runs and is
backed up independently of the app, and Postgres enums and CHECK constraints let the
database itself reject invalid data. Because all data access goes through Prisma, the
switch needed a new baseline migration and the removal of one SQLite-only PRAGMA — no
query changes.

## Getting started (local)

```bash
cp .env.example .env          # DATABASE_URL=postgresql://phoneme:phoneme@localhost:5432/phoneme
docker compose up -d db       # start just PostgreSQL (published on localhost:5432)
npm install                   # also runs `prisma generate`
npm run db:deploy             # apply the migrations
npm run db:seed               # load the 90-word HCE corpus + sample activities
npm run dev                   # http://localhost:3000
```

Other scripts:

```bash
npm run build         # production build
npm run start         # run the production build
npm run db:studio     # Prisma Studio (browse/edit the database)
npm run db:reset      # drop, re-migrate and re-seed
```

## Run in Docker

```bash
docker compose up --build                 # db + migrate + app
docker compose --profile tools up -d      # … plus Adminer on http://localhost:8080
```

Then open <http://localhost:3000> and <http://localhost:3000/health>.

| Service | Image | Role |
| --- | --- | --- |
| `db` | `postgres:17-alpine` | PostgreSQL; data on the `pgdata` named volume, `pg_isready` healthcheck |
| `migrate` | app image, `migrate` command | One-shot: `prisma migrate deploy`, then seeds **only if the database is empty**; exits |
| `app` | app image, `start` command | Next.js frontend + API on :3000; non-root, `HEALTHCHECK` against `/health` |
| `adminer` | `adminer:5` (tools profile) | Optional database browser (server `db`, user/password/database `phoneme`) |

Startup is ordered by health, not sleeps: `db` healthy → `migrate` completed
successfully → `app` starts. Teacher edits survive `docker compose down` / `up`;
`docker compose down -v` wipes the volume for a fresh, re-seeded start.

## API

All responses are JSON. Errors have the shape `{ "error": string, "details"?: [...] }`.

| Method & path                               | Purpose                                             |
| ------------------------------------------- | -------------------------------------------------- |
| `GET /health`                               | Liveness + database check → `200 { status: "ok" }` |
| `GET /api/word-lists`                        | List all word lists (with words + phonemes)         |
| `POST /api/word-lists`                       | Create a word list (optionally with words)          |
| `GET /api/word-lists/:id`                    | Get one word list                                   |
| `PATCH /api/word-lists/:id`                  | Update list name / description / length             |
| `DELETE /api/word-lists/:id`                 | Delete a list (cascades to words, phonemes)         |
| `POST /api/word-lists/:id/words`             | Add a word (with ordered phonemes) to a list        |
| `GET /api/words/:id`                         | Get one word                                        |
| `PATCH /api/words/:id`                       | Update a word / replace its phoneme sequence        |
| `DELETE /api/words/:id`                      | Delete a word                                       |
| `GET /api/activities`                        | List saved activity configurations                  |
| `POST /api/activities`                       | Save a Wordle / Word Search configuration           |
| `GET /api/activities/:id`                    | Get one activity                                    |
| `PATCH /api/activities/:id`                  | Update an activity                                  |
| `DELETE /api/activities/:id`                 | Delete an activity                                  |
| `GET /api/activities/:id/generate`           | Generate the standalone `.html` from stored data (`?download=1` to attach) |
| `GET /api/stats`                             | Dashboard headline numbers and recent-events feed   |
| `GET /api/alerts`                            | Current critical / warning / info alerts            |
| `GET /api/reports?days=7\|30\|90`             | Time-range report behind `/reports`                 |
| `GET /api/reports/export?dataset=…&days=…`   | One report table as CSV (`daily`, `word-lists`, `pages`, `failures`) |
| `GET /api/metrics`                           | In-process request metrics (`?format=prometheus`)   |
| `POST /api/telemetry/generation`             | Record a builder-page generation attempt            |
| `POST /api/telemetry/page-view`              | Record visible time on a page                       |
| `POST /api/simulate` / `DELETE /api/simulate` | Add / remove simulated usage records               |

### Validation & error handling

- Every write is validated with Zod (`lib/validation.js`): required fields, string
  lengths, phoneme tokens must be non-empty and space-free, `type` restricted to
  `WORDLE` / `WORD_SEARCH`, numeric ranges on difficulty / grid size / guesses.
- Phoneme symbols are checked against the HCE IPA inventory; an unrecognised symbol is
  rejected with a message naming it (`?allowUnknownPhonemes=true` overrides).
- Cross-entity rules (Assessment 4): a Wordle's target word must be in the activity's
  word list, settings for the other activity type are rejected, and moving an activity to
  another list clears its old target word. Updates are checked against the merged record.
- Malformed JSON → `400`; unknown id → `404`; unique-constraint clash (e.g. the same word
  twice in a list) → `409`; foreign-key or CHECK-constraint violation → `400`; any
  unexpected error is caught and returned as a generic `500` without a stack trace
  (`withErrorHandling` in `lib/apiResponse.js`).
- Generating an activity whose word list is empty → `400` with a clear message.

## Database schema (`prisma/schema.prisma`)

```
WordList ─┬─< Word ─< Phoneme
          └─< ActivityConfig
```

- **WordList** — `name`, `description`, `phonemeLength`, timestamps.
- **Word** — `text`, `displayText`, `phonemeCount`, `hint`, `notes`, `orderIndex`.
- **Phoneme** — `symbol` (a **string**, so multi-character IPA tokens like `tʃ`, `əʉ`,
  `ɐː` are stored faithfully) and `position` (0-based order within the word), unique on
  `(wordId, position)`.
- **ActivityConfig** — `type`, `difficulty`, `maxGuesses`, `prefillFirst`, `gridSize`,
  `targetWordId`, `hint`, `teacherNote`, `outputSettings` (JSON, extensible without a
  migration). Multiple configurations per word list are supported.

`onDelete: Cascade` throughout, so deleting a list cleans up its words, phonemes and
activities.

Database-level rules (Assessment 4, PostgreSQL): `type`, `status`, `source`, `mode`,
`entityType` and `action` are enums; CHECK constraints keep difficulty and phoneme length
in 2–12, grid size in 5–20 and guesses in 1–12, forbid a grid size on a Wordle or a guess
limit / target word on a Word Search, and require an error message on (and only on) a
failed generation; `(wordListId, text)` is unique on `Word`.

Assessment 3 adds three append-only event tables for reporting and observability:

- **GenerationEvent** — `activityType`, `source` (saved activity or builder page),
  `status` (`SUCCESS` / `FAILED`), `errorMessage`, `difficulty`, `mode`
  (preview / download), `durationMs`, `outputBytes`.
- **PageView** — `path` and visible `durationMs` (average time on page).
- **AuditEvent** — `entityType`, `action` (`CREATE` / `UPDATE` / `DELETE`), `label`,
  `activityType`.

They hold plain ids rather than foreign keys, so history survives when the word list or
activity it refers to is deleted. Each has a `simulated` flag, as do word lists and
activities.

## Project structure (added in Assessment 2)

```
app/
  health/route.js                    GET /health
  api/word-lists/route.js            list / create word lists
  api/word-lists/[id]/route.js       get / update / delete a word list
  api/word-lists/[id]/words/route.js add a word
  api/words/[id]/route.js            get / update / delete a word
  api/activities/route.js            list / create activities
  api/activities/[id]/route.js       get / update / delete an activity
  api/activities/[id]/generate/route.js  build the standalone .html from stored data
  word-lists/page.js                 word-list + word CRUD UI
  activities/page.js                 activity CRUD + generate/download UI
lib/
  prisma.js            PrismaClient singleton
  validation.js        Zod schemas + phoneme-inventory check
  apiResponse.js       JSON response + error-handling helpers
  wordLists.js         word-list / word data-access layer
  activities.js        activity data-access + HTML generation from DB records
  apiClient.js         browser-side fetch wrapper
components/
  PhonemePicker.js     reusable ordered-phoneme editor (IPA keyboard)
  WordListManager.js   word-list management screen
  ActivityManager.js   activity management screen
prisma/
  schema.prisma        data model
  migrations/          SQL migration history
  seed.js              loads hce-corpus.json into the database
  hce-corpus.json      the 90-word HCE phoneme corpus
Dockerfile, docker-compose.yml, docker-entrypoint.sh, .dockerignore
```

### Added in Assessment 3

```
app/
  dashboard/page.js                  live dashboard
  reports/page.js                    7 / 30 / 90-day reports
  api/stats, api/alerts, api/reports, api/reports/export, api/metrics,
  api/telemetry/generation, api/telemetry/page-view, api/simulate
lib/
  stats.js             dashboard aggregates
  alerts.js            alert rules
  metrics.js           in-memory request metrics (fed by withErrorHandling)
  telemetry.js         writes GenerationEvent / PageView / AuditEvent rows
  generationTelemetry.js  browser helper: builds a file and reports the attempt
  simulation.mjs       simulated usage records
components/
  PageTimeTracker.js   time-on-page beacon
  dashboard/           health, alerts, simulator, auto-refresh panels
  charts/              accessible bar and daily charts, each with a data table
tests/e2e/             Playwright specs
tests/load/            JMeter test plan and run scripts
scripts/lighthouse-a11y.mjs   Lighthouse accessibility audit of every page
docs/                  TESTING.md, Lighthouse reports, JMeter results
```

## Activity generation is data-driven

`GET /api/activities/:id/generate` loads the activity, its word list, every word and every
phoneme from the database, then feeds them into the same dependency-free generators from
Assessment 1 (`lib/generateWordleHtml.js`, `lib/generateWordSearchHtml.js`). Editing a
word list — adding words, changing a phoneme — changes what the next generated file
contains. Since Assessment 4 the Wordle and Word Search builder pages also read their words
only from saved lists (the seed loads the HCE corpus as three lists), and both the pages
and the saved-activity route apply the same rules from `lib/activityRules.js`.

## AI acknowledgement

This project's generative AI use is declared as **Full AI** per the assessment brief.
Complete and submit the unit's AI acknowledgement form alongside this submission.



## References

References are in APA 7th edition style.

Apache Software Foundation. (2026). *Apache JMeter user's manual*. Retrieved September 27,
2026, from https://jmeter.apache.org/usermanual/index.html

Beyer, B., Jones, C., Petoff, J., & Murphy, N. R. (Eds.). (2016). *Site reliability
engineering: How Google runs production systems*. O'Reilly Media.

Docker Inc. (2026a). *Building best practices*. Docker documentation. Retrieved September 1,
2026, from https://docs.docker.com/build/building/best-practices/

Docker Inc. (2026b). *Control startup and shutdown order in Compose*. Docker documentation.
Retrieved October 12, 2026, from https://docs.docker.com/compose/how-tos/startup-order/

Few, S. (2006). *Information dashboard design: The effective visual communication of
data*. O'Reilly Media.

Fielding, R. T., & Taylor, R. N. (2002). Principled design of the modern Web architecture.
*ACM Transactions on Internet Technology, 2*(2), 115–150.
https://doi.org/10.1145/514183.514185

Gillon, G. T. (2018). *Phonological awareness: From research to practice* (2nd ed.).
Guilford Press.

Google. (2026). *Lighthouse accessibility scoring*. Chrome for Developers. Retrieved
September 27, 2026, from https://developer.chrome.com/docs/lighthouse/accessibility/scoring

International Phonetic Association. (1999). *Handbook of the International Phonetic
Association: A guide to the use of the International Phonetic Alphabet*. Cambridge
University Press.

Majors, C., Fong-Jones, L., & Miranda, G. (2022). *Observability engineering: Achieving
production excellence*. O'Reilly Media.

Microsoft. (2026). *Playwright documentation*. Retrieved September 27, 2026, from
https://playwright.dev/docs/intro

Molyneaux, I. (2014). *The art of application performance testing* (2nd ed.). O'Reilly
Media.

Meta Platforms, Inc. (2026). *Passing data deeply with context*. React documentation.
Retrieved October 12, 2026, from https://react.dev/learn/passing-data-deeply-with-context

Nielsen, J. (1994). *Usability engineering*. Morgan Kaufmann.

PostgreSQL Global Development Group. (2026). *Constraints*. PostgreSQL documentation.
Retrieved October 12, 2026, from https://www.postgresql.org/docs/current/ddl-constraints.html

Prisma Data, Inc. (2026). *Prisma ORM: Schema and relations*. Prisma documentation.
Retrieved September 1, 2026, from https://www.prisma.io/docs/orm/prisma-schema

Sadalage, P. J., & Fowler, M. (2013). *NoSQL distilled: A brief guide to the emerging
world of polyglot persistence*. Addison-Wesley.

Vercel Inc. (2026). *Route Handlers*. Next.js documentation. Retrieved September 1, 2026,
from https://nextjs.org/docs/app/api-reference/file-conventions/route

World Wide Web Consortium. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*.
https://www.w3.org/TR/WCAG22/
