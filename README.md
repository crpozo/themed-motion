# ThemedMotion — From Idea to Animatronic

Production implementation of the ThemedMotion / P&P Projects scrollytelling site
(handoff from Claude Design). Light theme, brand orange `#F26B1F`, YouTube hero
banner, and eight chapters from Concept → Animation software.

## Stack

- Vite + React 19
- Google Fonts (Barlow / Barlow Condensed / JetBrains Mono / Caveat)
- Static assets in `public/assets`

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
site and publishes the contents of `dist/` to GitHub Pages.
