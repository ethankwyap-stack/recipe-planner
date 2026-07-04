# Mise — Recipe Planner

Recipe box + weekly lunch/dinner meal planner. Vite + React + TS + Tailwind v4, dark/neon theme. Static site — there is NO backend.

## Hard constraints (user-set, do not violate)
- **Zero risk of charges**: no paid APIs, no AI APIs (Claude API explicitly declined), no database service. Static hosting only.
- Recipes live in `public/data/recipes.json`, committed to the repo — shared by all users, not siloed per browser.
- Sharing = read-only public links encoding the plan in the URL hash (`#plan=<base64>`). No login.
- Suggestions are smart rotation from the user's own library (`src/lib/rotation.ts`) — no AI.

## Key modules (`src/lib/`)
`rotation.ts` auto-fill · `grocery.ts` list aggregate/scale · `share.ts` link encode/decode · `github.ts` auto-publish (commits recipes.json via fine-grained PAT stored in the owner's browser) · `parse.ts` bulk paste import · `importUrl.ts` import from a recipe URL · `ocr.ts` photo import (Tesseract.js, client-side; heic2any for iPhone photos) · `cook.ts` cook-from-pantry · `favorites.ts`

## Run / deploy
- Dev: `npm run dev` · Build check: `npm run build`
- Deploy: commit + `git push` → Vercel (https://recipe-planner-easy.vercel.app) and GitHub Pages both rebuild automatically (~1 min). No `vercel` CLI needed.
- Repo: github.com/ethankwyap-stack/recipe-planner (account ethankwyap-stack)

## Notes
- Recipe photos can be multi-page and .heic — both must keep working through the OCR import.
- To add recipes in bulk, generate them and commit to `public/data/recipes.json` directly.
