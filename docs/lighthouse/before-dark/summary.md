# Lighthouse accessibility — before (dark mode, following the OS setting)

Audited http://localhost:3000 on 27/09/2026, 1:11:16 pm. Average score: **96**.

| Page | Score | Failing audits |
|---|---:|---|
| `/` | 98 | Heading elements are not in a sequentially-descending order (1) |
| `/wordle` | 93 | Background and foreground colors do not have a sufficient contrast ratio. (6); Links rely on color to be distinguishable. (2) |
| `/word-search` | 91 | Elements with an ARIA `[role]` that require children to contain a specific `[role]` are missing some or all of those required children. (1); Heading elements are not in a sequentially-descending order (1); Links rely on color to be distinguishable. (2) |
| `/word-lists` | 96 | Background and foreground colors do not have a sufficient contrast ratio. (35); `<td>` elements in a large `<table>` do not have table headers. (1) |
| `/activities` | 96 | Background and foreground colors do not have a sufficient contrast ratio. (20) |
| `/dashboard` | 97 | Links rely on color to be distinguishable. (1) |
| `/reports` | 100 | — |
| `/about` | 96 | Links rely on color to be distinguishable. (2) |
| `/settings` | 100 | — |
