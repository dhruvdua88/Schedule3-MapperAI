# Schedule III Reviewer

AI-assisted Schedule III and CARO 2020 audit review tool for Indian Chartered Accountants.

Built with Vite 5 + React 18. Runs entirely in the browser — your PDF text and DeepSeek API key never leave your machine except for the analysis request sent directly to `api.deepseek.com`.

---

## Quick start

```bash
cd sch3-reviewer
npm install
npm run dev
```

Open `http://localhost:5173`, paste your [DeepSeek API key](https://platform.deepseek.com), and upload a balance sheet PDF.

---

## What it does

1. **Extracts** PDF text client-side using pdfjs-dist (no server, no file upload)
2. **Reviews** the extracted text against 30 Schedule III Division I checks (T01–T30)
3. **Evaluates** CARO 2020 applicability using the Para 1(2)(iv) threshold test
4. **Drafts** Annexure A wording for all 21 CARO clauses using ICAI illustrative language
5. **Generates** a SA 700 (Revised) compliant Independent Auditor's Report as a `.doc` file
6. **Exports** a styled 5-sheet Excel working paper (Cover, SCH3 Issues, CARO Applicability, CARO Clauses, Audit Report Fields)
7. **Saves** engagements locally in `localStorage` — load them back in any future session

---

## Configuration

### DeepSeek API key

On first launch you will be prompted for your DeepSeek API key (`sk-...`). Get one at [platform.deepseek.com](https://platform.deepseek.com). The key is stored only in your browser's `localStorage` under `ddandco_deepseek_key` and is sent only to `api.deepseek.com`.

### Firm defaults

Open **Settings** (gear icon, top-right) to pre-fill:

| Field | Default |
|-------|---------|
| Firm name | Dhruv Dua & Co. |
| FRN | 028145N |
| Partner name | Dhruv Dua |
| Membership No | 531607 |
| Place | New Delhi |

These values auto-populate the signature block of every new engagement. You can override them per engagement in the **Audit Report** tab.

### Model

Two options in Settings → AI Model:

- `deepseek-v4-pro` (default) — heavier reasoning, better for complex disclosures
- `deepseek-v4-flash` — faster and cheaper, suitable for simpler filings

> If DeepSeek updates the model string, change it in Settings without redeploying.

---

## Deployment

### Local development

```bash
npm run dev
```

### Build for production

```bash
npm run build
# output in dist/
```

### GitHub Pages

```bash
# Set GITHUB_PAGES=true in your environment, or edit vite.config.js base
GITHUB_PAGES=true npm run build
npm run deploy:gh
```

The `deploy:gh` script uses `gh-pages` to push `dist/` to the `gh-pages` branch.

### Vercel / Netlify (static SPA)

```bash
npm run build
```

Upload `dist/` to Vercel or Netlify. Both platforms auto-detect Vite. No server-side configuration required — this is a pure SPA.

For Netlify add a `_redirects` file in `public/`:

```
/*  /index.html  200
```

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Build | Vite 5 |
| UI | React 18 (hooks only, no state library) |
| PDF extraction | pdfjs-dist v4 (worker bundled via `?url`) |
| AI | DeepSeek V4 Pro via OpenAI-compatible API |
| Excel export | ExcelJS 4.3 (loaded from cdnjs CDN) |
| Word export | HTML + MSO XML namespace blob (opens in Word / Google Docs) |
| Icons | lucide-react |
| Fonts | Fraunces · IBM Plex Sans · JetBrains Mono (Google Fonts) |
| Persistence | `localStorage` only |

---

## Privacy

- **PDF never leaves your browser.** pdfjs extracts text client-side; only the extracted text is sent to the API.
- **API key stored locally.** Saved in `localStorage`; never transmitted to any server other than `api.deepseek.com`.
- **No analytics, no tracking.** This app has no backend, no database, and no third-party analytics.
- **Engagement data stays on-device.** Saved engagements are stored in `localStorage` and never synced anywhere.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + E` | Export Excel working paper (when analysis is complete) |

---

## Acceptance criteria

Before shipping, verify:

- [ ] `npm install && npm run dev` succeeds with no errors
- [ ] Settings Gate appears on first load; unlocks on valid `sk-...` key
- [ ] PDF drag-drop and file picker both work
- [ ] Extraction preview shows markdown text; Edit and Re-extract work
- [ ] SCH3 phase → CARO phase → done state reached
- [ ] All 4 tabs render: Issues, CARO Applicability, CARO Clauses (if applicable), Audit Report
- [ ] ClauseRow edit and "Restore standard" work
- [ ] Excel export downloads a valid `.xlsx` file with 5 sheets
- [ ] Word report downloads a valid `.doc` file
- [ ] Engagement save/load via localStorage works
- [ ] Export/Import engagement JSON round-trips correctly
- [ ] `npm run build` succeeds with no errors

---

## Credits

- Audit framework: ICAI Schedule III Division I (amended 24 March 2021), CARO 2020, SA 700 (Revised)
- CARO illustrative wording: ICAI Illustrative Audit Report formats
- AI: DeepSeek V4 Pro

---

*Internal tool — Dhruv Dua & Co., Chartered Accountants · FRN 028145N*
