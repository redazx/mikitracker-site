// Builds the site's pages: node tools/build.mjs
// The header, footer and <head> tags live here once; each page's own content is in src/pages/<name>.body.html.
// The output (index.html, privacy.html, ...) is committed, so Cloudflare Pages needs NO build step - it just serves the files.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://mikitracker.top";
const config = JSON.parse(readFileSync(join(root, "site.config.json"), "utf8"));
const read = (p) => readFileSync(join(root, p), "utf8");

// A short fingerprint of everything under assets/ (except fonts). Appended to asset URLs as ?v=..., so a changed screenshot or
// stylesheet is fetched fresh instead of coming from a browser or CDN cache.
function assetVersion() {
  const hash = createHash("sha1");
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir)).sort()) {
      const rel = `${dir}/${name}`;
      if (statSync(join(root, rel)).isDirectory()) { if (name !== "fonts") walk(rel); }
      else hash.update(rel).update(readFileSync(join(root, rel)));
    }
  };
  walk("assets");
  return hash.digest("hex").slice(0, 8);
}
const ASSET_V = assetVersion();
const versioned = (html) => html.replace(/((?:\/|https:\/\/mikitracker\.top\/)assets\/(?:css|js|img)\/[A-Za-z0-9_\-\/.]+\.(?:css|js|png|webp))(?=["')\s])/g, "$1?v=" + ASSET_V);

// Legal pages mention who runs the app. Until site.config.json has the real name, a plain fallback is used (and a warning printed).
const operator = config.operator?.trim() || "";
if (!operator) console.warn("WARNING: site.config.json has no \"operator\" - the privacy policy and terms use a generic phrase. Fill it in before launch.");
const vars = {
  OPERATOR: operator || "the independent developer of Miki",
  OPERATOR_SHORT: operator || "the developer",
  COUNTRY: config.country?.trim() || "the developer's home country",
  UPDATED: config.legalUpdated,
  SUPPORT_EMAIL: "support@mikitracker.top",
  PR_EMAIL: "pr@mikitracker.top",
};
const fill = (html) => html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

const nav = [
  ["Features", "/#features"],
  ["Shorts", "/#shorts"],
  ["Community", "/#community"],
  ["AI", "/#ai"],
  ["FAQ", "/#faq"],
];

function header() {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="/" aria-label="Miki home"><img src="/assets/img/icon-64.png" width="38" height="38" alt="">Miki</a>
    <nav class="nav-links" aria-label="Main">
      ${nav.map(([label, href]) => `<a href="${href}">${label}</a>`).join("\n      ")}
      <a class="btn btn-primary btn-sm nav-cta" href="/#download" data-store>Get the app</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="brand" href="/" style="margin-bottom:14px"><img src="/assets/img/icon-64.png" width="38" height="38" alt="">Miki</a>
        <p style="margin:0;max-width:26em">Anime &amp; Manga Tracker. Track your list, find what to watch next, and join the conversation.</p>
      </div>
      <div>
        <h4>Explore</h4>
        <ul>
          <li><a href="/#features">Features</a></li>
          <li><a href="/#shorts">Anime Shorts</a></li>
          <li><a href="/#community">News &amp; Community</a></li>
          <li><a href="/#ai">AI</a></li>
        </ul>
      </div>
      <div>
        <h4>Help</h4>
        <ul>
          <li><a href="/support">Support</a></li>
          <li><a href="mailto:${vars.SUPPORT_EMAIL}">${vars.SUPPORT_EMAIL}</a></li>
          <li><a href="mailto:${vars.PR_EMAIL}">Advertise: ${vars.PR_EMAIL}</a></li>
        </ul>
      </div>
      <div>
        <h4>Legal</h4>
        <ul>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms &amp; Conditions</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-small">
      <span>&copy; <span data-year>${new Date().getFullYear()}</span> Miki. Built with <span class="heart" aria-label="love">&#9829;</span> by Miki's father.</span>
      <span>Miki is an independent app, not affiliated with or endorsed by MyAnimeList, YouTube, Google or Anime News Network. Names and logos belong to their owners.</span>
    </div>
  </div>
</footer>`;
}

function page({ file, path, title, description, body, ogTitle, noindex = false, jsonld = "", scripts = [] }) {
  const extraScripts = scripts.map((src) => `<script src="${src}" defer></script>`).join("\n");
  const url = `${SITE}${path}`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="#0b0b0e">
<meta name="color-scheme" content="dark">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/google-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Miki">
<meta property="og:title" content="${ogTitle ?? title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle ?? title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${SITE}/assets/img/og-image.png">
<link rel="stylesheet" href="/assets/css/site.css">
<script src="/assets/js/early.js"></script>
${jsonld}
</head>
<body>
${header()}
<main id="main">
${fill(body)}
</main>
${footer()}
<script src="/assets/js/config.js"></script>
<script src="/assets/js/site.js" defer></script>
${extraScripts}
</body>
</html>
`;
  writeFileSync(join(root, file), versioned(html));
  console.log("built", file);
}

const softwareApp = `<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "Miki: Anime & Manga Tracker",
  operatingSystem: "ANDROID",
  applicationCategory: "EntertainmentApplication",
  description: "Track your anime and manga, discover what to watch next, watch anime Shorts, read the news and join the community.",
  url: SITE,
  image: `${SITE}/assets/img/icon-512.png`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
})}</script>`;

page({
  file: "index.html",
  path: "/",
  title: "Miki - Anime & Manga Tracker for Android",
  ogTitle: "Miki - Anime & Manga Tracker",
  description: "Track your anime and manga, discover what to watch next, swipe through anime Shorts, read the news and join the community. Miki for Android.",
  body: read("src/pages/index.body.html"),
  jsonld: softwareApp,
});
page({
  file: "privacy.html",
  path: "/privacy",
  title: "Privacy Policy - Miki",
  description: "How Miki handles your data: what we collect, why, who we share it with, and the choices you have.",
  body: read("src/pages/privacy.body.html"),
});
page({
  file: "terms.html",
  path: "/terms",
  title: "Terms & Conditions - Miki",
  description: "The terms for using Miki: Anime & Manga Tracker, including community rules, AI features and paid placements.",
  body: read("src/pages/terms.body.html"),
});
page({
  file: "support.html",
  path: "/support",
  title: "Support - Miki",
  description: "Get help with Miki: contact us, report a bug, delete your data, or ask about advertising.",
  body: read("src/pages/support.body.html"),
});
// Private report pages: not in the sitemap, and asked to stay out of search results.
page({
  file: "sponsor-admin.html",
  path: "/sponsor-admin",
  title: "Sponsored report (admin) - Miki",
  description: "Impressions for Sponsored videos in Miki. Admin only.",
  body: read("src/pages/sponsor-admin.body.html"),
  noindex: true,
  scripts: ["/assets/js/reports.js"],
});
page({
  file: "sponsor-report.html",
  path: "/sponsor-report",
  title: "Your Sponsored report - Miki",
  description: "How often your Sponsored video was shown in Miki.",
  body: read("src/pages/sponsor-report.body.html"),
  noindex: true,
  scripts: ["/assets/js/reports.js"],
});
page({
  file: "404.html",
  path: "/404",
  title: "Page not found - Miki",
  description: "That page doesn't exist.",
  body: read("src/pages/404.body.html"),
  noindex: true,
});

// sitemap
const urls = ["/", "/privacy", "/terms", "/support"];
writeFileSync(
  join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${config.legalUpdatedIso}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`,
);
console.log("built sitemap.xml");
