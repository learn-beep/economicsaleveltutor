# economicsaleveltutor.com

Static Astro site for Pearson Edexcel A-level Economics A (9EC0) and AS (8EC0), deployed on Netlify. Third site in the family after mathsaleveltutor.com and alevelpsychologytutor.com; built from the Psychology template with the `subject-revision-site` skill.

## Run locally
    npm install
    npm run dev        # http://localhost:4321
    npm run build      # writes dist/

## Deploy
Push to `main` of the linked GitHub repository; Netlify builds with `npm run build` (Node 22) and publishes `dist/`.
Set `CROPS=off` in Netlify's environment to replace every Pearson crop with a link to Pearson's site.

## Data
- `scripts/export.py --bank "<Question Bank folder>" --topics topics.json --config site.config.json [--images [--only <bundle>]]`
  reads the Economics question bank app export (`data/index.js`, `data/img/*.js`) and writes `src/data/questions.json`, `papers.json`, `topics.json`, `spec.json`, `weighting.json`, and with `--images` the WebP crops under `public/img/<bundle>/`.
  `--only` rewrites the data files with a single paper: always follow it with the full run.
- The Economics bank has no `fmt` field; `derive_format()` builds the question type from the bank's feature codes (F MCQ, F ESSAY, F LEVELS, F CALC, F DRAW) and command words. MCQ answers come from the bank's `ans` field. Each part's shared data/extracts crop comes from `stems` via `sid`.
- `topics.json` (repo root) maps spec statements to the 42 site topics, grouped by Theme. `site.config.json` holds the site line, WhatsApp wording, exam dates, grade boundaries and tutors.

## Pages that differ from the Psychology template
- `/diagrams/` and `/quantitative-skills/`: Economics-specific pages built from the `draw` feature and the QS tags.
- `/mock/` assembles Edexcel-shaped papers: Section A groups (Q1–5), a whole Section B data-response question (Q6, or Q1/Q2 on Paper 3), a Section C essay (Q7/Q8).
- `/essays/` lists the 25-mark (A level) and 20-mark (AS) essays; self-marking uses Edexcel's KAA + evaluation levels.
- Question types: Multiple choice, Definition, Calculation, Diagram, Short answer, Extended response (8–15), Essay (20–25), plus Data response by feature.
- Flashcards are key-term decks only (`src/data/decks/*.json`, picked up automatically by `src/lib/decks.ts`). Decks with `"checked": false` show a "being checked by our tutor" line.

## Content that needs a tutor's check before launch
- The six key-term decks in `src/data/decks/`.
- The diagram checklist on `/diagrams/` and the skills notes on `/quantitative-skills/`.
- The level descriptions and self-marking marks in `/essays/` and `src/scripts/player.js` (LEVELS table).
- `src/data/tutors.json` is empty: add the tutor's name, photo (`public/tutors/<slug>.webp`), bio, offers and fee, and the tutor page fills itself in.

## Upkeep
New papers: run the bank pipeline, then `export.py --images`, commit `src/data` and `public/img`. Grade boundaries (`site.config.json` → `boundaries`) in August; exam dates in the autumn; then re-run `new_site.py`-style config edits by hand in `src/data/exams.json` and `boundaries.json`.
