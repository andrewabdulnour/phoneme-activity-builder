  # Phoneme Activity Builder

**Assessment 3 — Data-driven dashboard, observability and testing**
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
whole system is tested with **Playwright**, **JMeter** and **Lighthouse**.

## Assessment 3 at a glance

| Requirement | Where |
| --- | --- |
| Health check — `/health` returns `200 OK` | `app/health/route.js`; polled live on the dashboard every 10 s |
| Dashboard — activities created (Wordle / Word Search), successful and failed generations, average time on page, most-used activity type | `/dashboard` (`app/dashboard/page.js`, `lib/stats.js`), including a *Generated activities* table that links each saved activity to its word list and opens the generated game |
| Alerts — failed generation, empty word lists, invalid phoneme data, misconfigured activities | `lib/alerts.js`, `GET /api/alerts`, dashboard alerts panel |
| Reporting views — 7 / 30 / 90-day charts and tables, CSV export | `/reports`, `GET /api/reports`, `GET /api/reports/export` |
| Simulated input records, stored in the database | `lib/simulation.mjs`, `POST /api/simulate`, seed script |
| Server-side monitoring | `GET /api/metrics` (JSON or Prometheus format) |
| Playwright — builder CRUD and generate/play use cases | `tests/e2e/` — 8 / 8 passing |
| JMeter — x1, x10, x100, x1000, x10000 users | `tests/load/`, results in `docs/load-testing/` |
| Lighthouse accessibility, before and after | `scripts/lighthouse-a11y.mjs`, reports in `docs/lighthouse/` |

The full testing write-up, with the load-test analysis and the accessibility changes, is in
**[`docs/TESTING.md`](docs/TESTING.md)**.

## How the data flows

```
Teacher (builder pages)                     Student (generated .html file)
   │  create / edit / delete                       ▲
   ▼                                               │ generate (preview / download)
REST API route handlers ──► Prisma ──► SQLite ──────┘
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
| Playwright | 8 / 8 tests pass: word-list CRUD, activity CRUD, generating and playing a Wordle and a Word Search, downloading from the builder, health and alerts |
| JMeter | No errors and sub-50 ms responses from x1 to x1000; at x10000 users, 2.7 % of requests failed with connection resets from the single-machine setup's network limits, and the app logged no server errors |
| Lighthouse | Accessibility average went from 96 to **100**, with all 9 pages at 100 in both light and dark mode |

See [`docs/TESTING.md`](docs/TESTING.md) for method, full results and discussion.

## Stack

| Concern            | Choice                                                             |
| ------------------ | ----------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router) — `npx create-next-app`                   |
| Language / UI      | React 19, Tailwind CSS v4                                        |
| API                | Next.js Route Handlers (`app/**/route.js`)                       |
| ORM / database     | Prisma 6 + SQLite (file-based; volume-mounted in Docker)         |
| Validation         | Zod                                                              |
| Packaging          | Multi-stage `Dockerfile` + `docker-compose.yml`                  |

SQLite keeps the whole system in one reproducible container with no external database
service to provision, which suits a single-tenant classroom tool; the Prisma schema is
portable to Postgres later by changing the datasource `provider`.

## Getting started (local)

```bash
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npm install                   # also runs `prisma generate`
npm run db:migrate            # create the SQLite database + schema
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
docker compose up --build
```

Then open <http://localhost:3000> and <http://localhost:3000/health>.

The container entrypoint (`docker-entrypoint.sh`) runs `prisma migrate deploy`, seeds the
database **only if it is empty**, then starts `next start`. The SQLite file lives on the
`phoneme-data` named volume (`/app/data/prod.db`), so teacher edits survive
`docker compose down` / `up`. The image runs as a non-root user and declares a
`HEALTHCHECK` against `/health`.

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
- Malformed JSON → `400`; unknown id → `404`; unique-constraint clash → `409`; any
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
contains. The Wordle and Word Search builder pages can also switch their word pool from the
fixed corpus to any saved list.

## AI acknowledgement

This project's generative AI use is declared as **Full AI** per the assessment brief.
Complete and submit the unit's AI acknowledgement form alongside this submission.



## References

References are in APA 7th edition style.

Apache Software Foundation. (2026). *Apache JMeter user's manual*. Retrieved September 27,
2026, from https://jmeter.apache.org/usermanual/index.html

Beyer, B., Jones, C., Petoff, J., & Murphy, N. R. (Eds.). (2016). *Site reliability
engineering: How Google runs production systems*. O'Reilly Media.

Docker Inc. (2026). *Building best practices*. Docker documentation. Retrieved September 1,
2026, from https://docs.docker.com/build/building/best-practices/

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

Nielsen, J. (1994). *Usability engineering*. Morgan Kaufmann.

Prisma Data, Inc. (2026). *Prisma ORM: Schema and relations*. Prisma documentation.
Retrieved September 1, 2026, from https://www.prisma.io/docs/orm/prisma-schema

Sadalage, P. J., & Fowler, M. (2013). *NoSQL distilled: A brief guide to the emerging
world of polyglot persistence*. Addison-Wesley.

Vercel Inc. (2026). *Route Handlers*. Next.js documentation. Retrieved September 1, 2026,
from https://nextjs.org/docs/app/api-reference/file-conventions/route

World Wide Web Consortium. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*.
https://www.w3.org/TR/WCAG22/
