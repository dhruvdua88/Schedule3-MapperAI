# Schedule III Reviewer

Schedule III &amp; CARO 2020 audit-review tool for Indian Chartered Accountants. Two-path workflow — a deterministic **Quick Review** that runs entirely in your browser with no API key, plus an optional **Deep AI Review** powered by DeepSeek for the semantic / judgement checks the rule engine can't reason about.

Built with Vite 5 + React 18. Runs entirely client-side — your PDF text and DeepSeek API key never leave the machine except for the AI request sent directly to `api.deepseek.com`.

---

## Quick start

```bash
cd sch3-reviewer
npm install
npm run dev
```

Open `http://localhost:5173`. You can use the app immediately — click **Skip — use Quick Review only** on the gate to run without an API key. Paste a [DeepSeek API key](https://platform.deepseek.com) if you want the full Deep AI Review.

---

## What it does

1. **Extracts** PDF text page-by-page using `pdfjs-dist`. Detects scanned PDFs and offers an opt-in **OCR fallback** powered by Tesseract.js.
2. **Quick Review (no API)** — runs ~25 deterministic checks in ~2 seconds:
   - **Keyword presence** — title deeds, benami, wilful defaulter, struck-off companies, layers compliance, intermediary/UB funds, crypto, undisclosed income, 11 Sch III ratios, trade receivables/payables ageing, Reserves &amp; Surplus break-up, rounding policy, MSMED disclosure, Note 1 (Corporate Info), Note 2 (Significant Accounting Policies).
   - **Arithmetic** — Tax-PBT alignment, CFS tie-back, Reserves arithmetic.
   - **Structural** — Balance Sheet balancing (Total Assets = Equity + Liabilities), comparative-year presence, CIN format validity.
   - **Tie-out checks** — notes-to-face reconciliation (PPE / Trade Receivables / Inventories / Reserves note totals tie to face of BS); within-note arithmetic (line items sum to disclosed total); opening = prior-year closing for movement schedules.
3. **Deep AI Review (DeepSeek)** — full **73-test** pass across six sections (Internal Consistency, 2021 MCA Amendment, Other Sch III Presentation, AS Compliance, Companies Act, P&amp;L Sub-classification). Runs Quick Review first and merges results — every issue is tagged `Rule`, `AI`, or `Rule + AI`.
4. **CARO 2020** — Para 1(2)(iv) applicability arithmetic runs locally regardless of route; AI clause-level review only fires when CARO actually applies (saves the API call on small private companies).
5. **Source-anchored evidence** — each issue's quote is fuzzy-matched back to its PDF page; click the "Page N" chip to see the matched passage highlighted.
6. **Per-issue review workflow** — Accept / Dismiss / For-review / Note actions with reviewer-name and timestamp audit trail. Survives reloads. Designed for ICAI peer-review compliance.
7. **Accounting Policies drafter** (optional, post-analysis) — generates a single comprehensive "Note 2 — Significant Accounting Policies" tailored to the engagement's balance-sheet heads. Editable per sub-policy. Downloads as Word.
8. **Follow-up chat** (optional, Cmd+K) — engagement-context-loaded chat to ask "why was T22 flagged?" or "draft a manager review note on the MSME finding".
9. **Independent Auditor's Report** — SA 700 (Revised) compliant Word doc with conditional Annexure A (CARO 2020) and Annexure B (IFCoFR per Sec 143(3)(i)). Rule 11 clauses have **scenario dropdowns** drawing from the ICAI Implementation Guide on Audit Trail (Revised 2024 Edition) — eight variants for Rule 11(g) alone.
10. **Excel working paper** — 6 sheets including Cover dashboard, Schedule III Issues table, CARO Applicability + Annexure A wording, Audit Report Fields snapshot, and an **MCA Verification Checklist** with checkboxes for registered office / directors / shareholding / paid-up &amp; authorised capital / etc.
11. **Engagement persistence** — last 5 engagements saved in `localStorage`. JSON export / import for sharing engagements across machines.

---

## Configuration

### DeepSeek API key (optional)

On first launch the app shows a gate. You can either:

- **Save key and continue** — paste an `sk-...` key from [platform.deepseek.com](https://platform.deepseek.com). Stored only in this browser's `localStorage` under `ddandco_deepseek_key`; sent only to `api.deepseek.com`.
- **Skip — use Quick Review only** — drops into the app without a key. Quick Review works fully offline. AI features prompt for the key inline if invoked later.

### Firm defaults

**Settings** (gear icon, top-right) pre-fills the audit report signature block:

| Field | Default |
|---|---|
| Firm name | Dhruv Dua &amp; Co. |
| FRN | 028145N |
| Partner name | Dhruv Dua |
| Membership No | 531607 |
| Place | New Delhi |

Override per engagement in the Audit Report tab.

### AI Model

- `deepseek-v4-pro` (default) — heavier reasoning, ~75 seconds on a typical engagement.
- `deepseek-v4-flash` — faster and cheaper, ~45 seconds.

The model is picked inline from the preview screen; the choice is remembered.

---

## Deployment

```bash
# Local development
npm run dev

# Production build
npm run build

# GitHub Pages — pushes dist/ to gh-pages branch
npm run deploy:gh

# If you see a Rollup native-binary error after a fresh git clone:
rm -rf node_modules package-lock.json && npm install
```

For Netlify / Vercel — drop `dist/` in; no server-side config needed (it's a pure SPA). Add `_redirects` to `public/` with `/* /index.html 200` for Netlify.

---

## Tech stack

| Layer | Choice |
|---|---|
| Build | Vite 5 |
| UI | React 18 (hooks only) |
| PDF | `pdfjs-dist` v4 |
| OCR (opt-in) | `tesseract.js` 5 — lazy-loaded from jsdelivr CDN |
| Rule engine | Plain JS — `src/lib/ruleEngine.js`, `src/data/ruleDefinitions.js`, `src/lib/metricsExtract.js` |
| AI | DeepSeek v4 Pro / Flash via OpenAI-compatible API |
| Excel export | ExcelJS 4.4 (lazy-loaded from cdnjs) |
| Word export | HTML + MSO XML namespace blob (`.doc`) |
| Icons | `lucide-react` |
| Fonts | Fraunces · IBM Plex Sans · JetBrains Mono |
| Persistence | `localStorage` only |

---

## Privacy

- **PDF stays on your machine.** `pdfjs` extracts text in the browser; only the extracted text is sent to the API (and only when Deep AI Review is invoked).
- **API key stored locally.** `localStorage` only; sent only to `api.deepseek.com`.
- **No backend, no analytics, no tracking.** Pure SPA.
- **Engagement data stays on-device.** Last 5 engagements in `localStorage`. JSON export is opt-in.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + E` | Export Excel working paper (on Done screen) |
| `Cmd/Ctrl + K` | Toggle the engagement chat panel (on Done screen) |
| `J` / `K` | Next / previous issue (when issue list is in focus) |
| `Enter` | Toggle expand/collapse on the focused issue |
| `A` | Accept the focused issue |
| `X` | Dismiss the focused issue |
| `R` | Mark the focused issue for partner review |
| `Esc` | Clear keyboard focus |

---

## For developers / Claude sessions

See **`CLAUDE.md`** at the repo root for engineering onboarding — file map, architectural conventions, recent decisions, open scope, what not to break. It's intentionally kept under ~250 lines so any Claude session can read it in one shot.

---

## Credits

- **Audit framework:** ICAI Schedule III Division I (amended 24 March 2021), CARO 2020, SA 700 (Revised).
- **Standard wording:** ICAI Implementation Guide on Reporting on Audit Trail under Rule 11(g) (Revised 2024); ICAI Implementation Guide on Rule 11(e) and 11(f); ICAI Guidance Note on Division I — Non Ind AS Schedule III (Jan 2022 Edition).
- **AI:** DeepSeek v4 Pro / Flash.

---

*Internal tool — Dhruv Dua &amp; Co., Chartered Accountants · FRN 028145N*
