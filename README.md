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
site and publishes the contents of `dist/` to GitHub Pages (preview copy).

Production is `themedmotion.com` (cPanel hosting): upload the contents of
`dist/` into `public_html` — zip it, upload, **Extract** over what is there.

## Site admin (content + users, from the browser)

The live site has an admin at `themedmotion.com/#/admin`. It needs PHP, so it
only works on the hosting — on GitHub Pages / `npm run dev` the site simply
shows the defaults.

- **Content** — everything grouped by page and section: copy, pictures, videos,
  lists (Work projects, the History story blocks and photo reel) and switches
  (show/hide the Work and History pages). Logged-in users can also edit copy
  directly on the page ("Edit on the page").
- **Users** — two roles: *Administrator* (content + users) and *Editor*
  (content only). Users are added from the dashboard; each one can change their
  own password under "My account".

How it fits together:

- `src/schema.js` is the single source of truth: every editable field with its
  default, plus the dashboard grouping. Pages read content through `<T k="…">`
  and the `useMedia / useFlag / useList` hooks (`src/content*.js[x]`); saved
  edits are overrides layered on top of those defaults.
  **Keys and list item ids are permanent** — renaming one orphans its saved
  edit. A changed default in the code does not replace a value the client has
  already overridden (theirs wins until they press *↺ Original*).
- `src/admin/` is the dashboard, built as its own lazy chunk (visitors never
  download it).
- `public/api/` is the backend: plain PHP 7.2+, no database (copied into
  `dist/api/`). Uploads are type-checked by content, renamed at random and
  limited to JPG/PNG/WebP/GIF/MP4/WebM.
- First time on a new server: open `/api/setup.php` once to create the first
  administrator. To start over, delete `api/config.php` in the File Manager.

Files that exist **only on the server** — never in the build, so re-uploading
`dist/` leaves them alone. Don't delete them when cleaning `public_html`:

| Path | What it is |
| --- | --- |
| `api/config.php` | the users (name, role, password hash) |
| `data/content.json` | the saved content overrides (public; the site reads it) |
| `data/uploads/` | pictures and clips uploaded from the dashboard (public) |
| `data/private/` | last 30 content backups + login-attempt log (web access denied) |

To test the admin locally: `npm run build`, copy `dist/` somewhere disposable
and run `php -d upload_max_filesize=96M -d post_max_size=100M -S 127.0.0.1:8099 -t <that copy>`
— never inside `dist/` itself, or test users/edits end up in the next upload.
