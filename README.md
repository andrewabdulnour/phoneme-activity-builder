# Phoneme Activity Builder

**Assessment 1 — Frontend Design and Usability**
Andrew Abdulnour — Student No. 20719271

A frontend builder for phoneme-based classroom activities aimed at Speech Pathology
students and teachers. Teachers configure a **Wordle** or **Word Search** activity built
around phoneme symbols (not standard spelling entry), preview it live, and generate a
single, self-contained `.html` file that plays in any browser — no server, database, or
internet connection required to run it.

This is the frontend-only stage of a subject-long project. There is no database or
dynamic word-list management yet — the Wordle target word and Word Search word list are
fixed. Those arrive in Assessment 2.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run lint    # ESLint
```

## Project structure

```
app/
  page.js              Home
  about/page.js         About (project info, name/student number, video)
  wordle/page.js         Wordle builder (settings + live preview + generate)
  word-search/page.js    Word Search builder (settings + live preview + generate)
  settings/page.js       Theme + layout density preferences (cookies)
  layout.js              Root layout: nav, header, footer, theme init script
components/
  Navbar.js               Nav bar, hamburger (mobile) and kebab (About/Settings) menus
  Footer.js
  WordleGame.js            Interactive phoneme Wordle (live preview)
  WordSearchGame.js        Interactive phoneme word search (live preview)
  PhonemeKey.js / Tooltip.js   Phoneme tile button with IPA hover hint
  ThemeSettings.js          Theme/layout controls (client-only, see below)
lib/
  phonemeData.js            IPA keyboard layout, IPA→grapheme hints, the 90-word HCE corpus
  wordSearchGenerator.js    Word search grid placement algorithm (places phoneme tokens)
  generateWordleHtml.js     Builds the standalone Wordle .html export
  generateWordSearchHtml.js Builds the standalone Word Search .html export
  download.js                Blob-based file download helper
  theme.js                   Cookie helpers + the render-blocking theme-init script
```

## Design notes

- **Phoneme-first interaction.** Both activities are built entirely around phoneme
  symbols, not English letters. The Wordle keyboard's key *labels* are IPA symbols (`θ`,
  `ʃ`, `tʃ`, `ŋ`, vowels, etc.), grouped by phonetic category (plosives, nasals,
  fricatives, liquids/glides, affricates, vowels); the Word Search grid's *cells* hold
  phoneme tokens too, so a cell can contain a multi-character symbol like `tʃ` or `əʉ`.
  Every tile/cell reveals its English grapheme and an example word on hover/focus, e.g.
  `/θ/ → TH (as in "thin")`.
- **Word corpus.** `lib/phonemeData.js` hardcodes the unit's 90-word HCE phoneme corpus
  (30 words each at 3/4/5 phonemes). Phoneme length is the difficulty control — a
  teacher picks a length, then a specific word from that length's list. Still no
  database (Assessment 2), but the data shape maps directly onto a future query.
- **Keyboard-accessible Word Search.** Grid cells are real `<button>`s with roving
  `tabindex`; arrow keys move focus and Enter marks/submits a straight-line selection,
  reusing the same start/end-alignment check the mouse drag uses — so anything
  selectable by mouse is selectable by keyboard alone.
- **Preview vs. export.** The React components (`WordleGame`, `WordSearchGame`) drive the
  in-app preview. The exported `.html` file is generated from a separate, dependency-free
  vanilla-JS template (`lib/generateWordleHtml.js`, `lib/generateWordSearchHtml.js`,
  including the same keyboard-selection logic) so it has no React/Next runtime dependency
  and can be opened directly via `file://` in any browser.
- **Client-only randomness.** The Word Search grid is randomly generated
  (`Math.random()`), so `WordSearchGame` and the Settings theme controls are loaded with
  `next/dynamic(..., { ssr: false })` — server-rendering random/cookie-dependent content
  would otherwise disagree with the client's first render and cause a hydration
  mismatch.
- **Theme/layout preferences** are stored in cookies (`phoneme-theme`,
  `phoneme-layout`) and applied via a small render-blocking inline script in the root
  layout, so there's no flash of the wrong theme on load.

## AI acknowledgement

This project's generative AI use is declared as **Full AI** per the assessment brief.
Complete and submit the unit's AI acknowledgement form alongside this submission.

## Before submitting

- [ ] Set `VIDEO_EMBED_URL` in `app/about/page.js` once the walkthrough video is uploaded.
- [ ] Record the 6–8 minute video (student ID, face, voice) covering: design decisions,
      component structure and scalability, usability, accessibility, trade-offs, and how
      the interface supports Speech Pathology students/teachers. Show the GitHub repo
      homepage and talk through commits.
- [ ] Push to GitHub and include the repo link in your submission.
- [ ] Remove `node_modules` before zipping, if required.
- [ ] Complete the AI acknowledgement form.

## References (starting point — expand to 5+ and confirm APA 7 formatting)

- React. (n.d.). *React documentation*. https://react.dev
- Next.js. (n.d.). *Next.js documentation*. https://nextjs.org/docs
- W3C. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. World Wide Web
  Consortium. https://www.w3.org/TR/WCAG22/
- Nielsen, J. (1994). *Usability engineering*. Morgan Kaufmann.
- International Phonetic Association. (1999). *Handbook of the International Phonetic
  Association: A guide to the use of the International Phonetic Alphabet*. Cambridge
  University Press.
- Gillon, G. T. (2018). *Phonological awareness: From research to practice* (2nd ed.).
  Guilford Press.
