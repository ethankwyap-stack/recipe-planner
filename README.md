# 🍳 Mise — Recipe Box & Weekly Meal Planner

A free, no-account web app for storing your own recipes, auto-building a weekly
**lunch + dinner** plan, generating a grocery list, and **sharing plans by link**.

- **Your recipes live inside the website** — they're stored in
  [`public/data/recipes.json`](public/data/recipes.json), so everyone who opens the
  site (on any device) sees the same collection.
- **Smart weekly auto-fill** from your own library — no AI, no repeats within a week,
  respects diet tags (vegetarian, gluten-free…), de-prioritises recent meals.
- **Auto grocery list** — merges duplicate ingredients across the week, scales to your
  household size, groups by aisle, check-off + printable.
- **Share by link** — each plan encodes itself (and the recipes it uses) into the URL.
  Anyone can open it read-only, no login. They can "Save a copy" to tweak it.
- **Zero billing risk** — static site, no paid APIs, no AI, no database service.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## Add / edit recipes

Use **Recipes → New recipe** or **Import** (paste plain text, paste JSON, or upload a
`recipes.json`). Edits are kept as a local draft until you publish them into the site.

### Publishing recipes into the live site (both options free)

Open **Publish** in the top bar:

- **Option A — Export & commit yourself:** download `recipes.json`, drop it into
  `public/data/`, and push. No token needed.
- **Option B — Publish directly:** paste a GitHub
  [fine-grained token](https://github.com/settings/tokens?type=beta) with
  *Contents: Read & write* on this repo. The token is stored **only in your browser**.
  Clicking **Publish to site** commits `recipes.json` for you; the site redeploys
  automatically. GitHub is free — no billing.

## Deploy (free)

This repo includes a GitHub Pages workflow at
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Push this project to a GitHub repo.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` builds and deploys. Your site is at
   `https://<you>.github.io/<repo>/`.

Vite's `base: './'` makes the build work both on a project Pages URL and on
Vercel/Netlify (drop-in: build command `npm run build`, output `dist`).

## How sharing works

The "Share" button builds a link like `…/#plan=<encoded>`. The encoded value is the
week plan plus the recipes it uses, so a recipient with no library still sees the full
plan and grocery list. Nothing is sent to any server — the data is in the URL itself.

## Project layout

```
public/data/recipes.json   # the shared recipe collection (lives in the site)
src/lib/                    # rotation, grocery, share, github, parse, week, storage
src/components/             # cards, forms, grid, grocery, modals
src/pages/                  # Library, Planner, SharedPlanView
```
