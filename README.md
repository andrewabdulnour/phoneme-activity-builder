# Phoneme Activity Builder

**Assessment 2 — Full-stack cloud application implementation**
Andrew Abdulnour — Student No. 20719271

A full-stack builder for phoneme-based classroom activities for Speech Pathology students
and teachers. Teachers manage phoneme-based **word lists** and saved **activity
configurations** (Wordle or Word Search) through a database-backed REST API, preview them
live, and generate a single self-contained `.html` file — built from stored data — that
plays in any browser with no server, database, or internet connection.

This stage continues directly from Assessment 1 (frontend design and usability). The
interface and the standalone-HTML generators are unchanged in purpose; Assessment 2 adds
the backend, database, API, validation, and Docker packaging that make the builder
data-driven and reproducible.

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

## Before submitting

- [ ] Set `VIDEO_EMBED_URL` in `app/about/page.js` once the walkthrough video is uploaded.
- [ ] Record the video (student ID in the first 30 seconds; face + narration throughout)
      covering: the schema and how it supports the builder; creating, saving, editing,
      reading and deleting words / activities; the frontend using backend data to generate
      Wordle and Word Search outputs; `/health` returning 200; and the app running inside a
      Docker container.
- [ ] `docker compose up --build` and confirm <http://localhost:3000/health> returns 200.
- [ ] Push to GitHub and include the repo link in the submission.
- [ ] Remove `node_modules` before zipping.
- [ ] Complete the AI acknowledgement form.

## References

- International Phonetic Association. (1999). *Handbook of the International Phonetic
  Association: A guide to the use of the International Phonetic Alphabet*. Cambridge
  University Press.
- Gillon, G. T. (2018). *Phonological awareness: From research to practice* (2nd ed.).
  Guilford Press.
- Fielding, R. T., & Taylor, R. N. (2002). Principled design of the modern Web
  architecture. *ACM Transactions on Internet Technology, 2*(2), 115–150.
  https://doi.org/10.1145/514183.514185
- Vercel. (2025). *Next.js documentation: Route Handlers*. Retrieved September 1, 2026,
  from https://nextjs.org/docs/app/api-reference/file-conventions/route
- Prisma Data, Inc. (2025). *Prisma ORM documentation*. Retrieved September 1, 2026, from
  https://www.prisma.io/docs/orm
- Meta Open Source. (2025). *React documentation: You might not need an effect*. Retrieved
  September 1, 2026, from https://react.dev/learn/you-might-not-need-an-effect
- Docker, Inc. (2025). *Best practices for writing Dockerfiles*. Retrieved September 1,
  2026, from https://docs.docker.com/build/building/best-practices/
- Nielsen, J. (1994). *Usability engineering*. Morgan Kaufmann.
