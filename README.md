# mikitracker.top

The website for **Miki: Anime & Manga Tracker** - a landing page plus `/privacy`, `/terms` and `/support`.
Plain HTML, CSS and a little JavaScript. No framework, no tracking, no cookies, and **no build step on the host**:
Cloudflare Pages just serves the files in this folder.

## Edit the site

Page text lives in `src/pages/*.body.html`; the header, footer and `<head>` tags live once in `tools/build.mjs`.
After editing, regenerate the pages and commit the result:

```sh
node tools/build.mjs      # needs Node 18+ ; writes index.html, privacy.html, terms.html, support.html, 404.html, sitemap.xml
```

Open `index.html` through any static server to preview (the pages use root-relative links like `/assets/...`):

```sh
python -m http.server 8080   # then visit http://127.0.0.1:8080
```

## Launch-day checklist

1. **Google Play link** - paste it into `assets/js/config.js` (`playStoreUrl`), run `node tools/build.mjs` (it re-versions the asset URLs), commit and push. Every "Coming soon" button then links to the listing. **Then replace the plain text button with Google's official, unmodified "Get it on Google Play" badge** (Google only allows the badge for a live app, linked to its listing; download it from Google's Partner Marketing Hub, keep a quarter-badge-height of clear space).
2. **Who runs Miki** - fill `operator` and `country` in `site.config.json`, run `node tools/build.mjs`. The privacy policy and terms use these.
3. **Legal pages** - have a lawyer review `src/pages/privacy.body.html` and `terms.body.html`. Update them (and the date in `site.config.json`) whenever the app's data handling changes.
4. Replace the screenshots in `assets/img/screens/` when the app's look changes (540x1170 WebP, same file names).

## Deploy (Cloudflare Pages + GitHub)

1. Push this repo to GitHub.
2. Cloudflare dashboard > **Workers & Pages** > **Create** > **Pages** > **Connect to Git** > pick this repo.
3. Build settings: **Framework preset: None**, **Build command: (leave empty)**, **Build output directory: `/`**.
4. After the first deploy: **Custom domains** > add `mikitracker.top` (and `www.mikitracker.top`, redirecting to the apex). The domain's DNS has to be on Cloudflare for the apex to work.
5. Every push to `main` redeploys automatically; other branches get preview URLs.

`_headers` sets the security headers (strict Content-Security-Policy) and long caching for `/assets/*`.
Clean URLs work out of the box: `privacy.html` is served at `/privacy`.

## Fonts

Asset URLs get a `?v=<hash>` suffix on every build, so changed screenshots/CSS are never served stale.

The page font is Google Sans (SIL Open Font License - see `assets/fonts/OFL.txt`), subset to Latin as a ~60 KB WOFF2. No fonts or scripts are loaded from other websites.
