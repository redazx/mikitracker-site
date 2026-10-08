// Runs before the page paints: marks that JavaScript is on (so scroll-reveal styles apply only then), and restores a
// visitor's accent choice without a flash.
document.documentElement.classList.add("js");
try {
  var saved = localStorage.getItem("miki-accent");
  if (saved && /^#[0-9a-f]{6}$/i.test(saved)) {
    var n = parseInt(saved.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    document.documentElement.style.setProperty("--accent", saved);
    document.documentElement.style.setProperty("--accent-ink", lum > 0.5 ? "#0c0c0f" : "#ffffff");
    document.documentElement.style.setProperty("--glow-pct", saved.toLowerCase() === "#ffffff" ? "14%" : "34%");
  }
} catch (e) { /* storage blocked - the default accent stays */ }
