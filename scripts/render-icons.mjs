// Renders the app icon (concept X1, see docs/superpowers/specs/2026-09-27-app-icon-design.md)
// to every source file web and mobile need. Run: node scripts/render-icons.mjs
// Then in apps/mobile: dart run flutter_launcher_icons
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const COLOR = {
  pin: "#423a6a",
  body: "#1e2030",
  chip: "#423a6a",
  dim: "#5d5294",
  main: "#9184d9",
  signal: "#fcee0a",
  bracket: "#d2cefd",
  dimOp: 1,
  chipOp: 1,
  bodyOp: 1,
};
const MONO = {
  pin: "#fff",
  body: "#fff",
  chip: "#fff",
  dim: "#fff",
  main: "#fff",
  signal: "#fff",
  bracket: "#fff",
  dimOp: 0.4,
  chipOp: 0.25,
  bodyOp: 0,
};

const FULL = "0 0 108 108";
const IOS = "22 22 64 64";
const FAV = "26 26 56 56";

function background() {
  return `<rect width="108" height="108" fill="#161826"/>
<rect width="108" height="108" fill="url(#halo)"/>
<rect width="108" height="108" fill="url(#scan)"/>`;
}

// A1's grid on C2's chip. Drawn large, scaled to 0.85 so everything sits in the 66-unit safe circle.
function mark(c, glow) {
  const cell = (x, y, role) => {
    const fill = role === "d" ? c.dim : role === "s" ? c.signal : c.main;
    const op = role === "d" && c.dimOp !== 1 ? ` fill-opacity="${c.dimOp}"` : "";
    return `<rect x="${x}" y="${y}" width="10" height="10" rx="1" fill="${fill}"${op}/>`;
  };
  const roles = ["d", "m", "d", "m", "s", "d", "d", "d", "m"];
  const cells = roles.map((r, i) => cell(36 + (i % 3) * 13, 36 + Math.floor(i / 3) * 13, r)).join("");
  const pins = [39.4, 52.4, 65.4]
    .flatMap((p) => [
      `<rect x="${p}" y="25" width="3.2" height="6"/>`,
      `<rect x="${p}" y="77" width="3.2" height="6"/>`,
      `<rect x="25" y="${p}" width="6" height="3.2"/>`,
      `<rect x="77" y="${p}" width="6" height="3.2"/>`,
    ])
    .join("");
  return `<g transform="translate(54 54) scale(0.85) translate(-54 -54)"${glow ? ' filter="url(#glow)"' : ""}>
<g fill="${c.pin}" fill-opacity="${c.chipOp}">${pins}</g>
<rect x="31" y="31" width="46" height="46" rx="3" fill="${c.body}" fill-opacity="${c.bodyOp}"/>
<rect x="31" y="31" width="46" height="46" rx="3" fill="none" stroke="${c.chip}" stroke-opacity="${c.chipOp}" stroke-width="1.6"/>
${cells}
<path d="M27 35 V27 H35 M73 27 H81 V35 M81 73 V81 H73 M35 81 H27 V73" fill="none" stroke="${c.bracket}" stroke-width="2.8" stroke-linecap="square"/>
</g>`;
}

const DEFS = `<defs>
<radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#9184d9" stop-opacity="0.34"/><stop offset="1" stop-color="#9184d9" stop-opacity="0"/></radialGradient>
<pattern id="scan" width="108" height="3" patternUnits="userSpaceOnUse"><rect width="108" height="0.7" fill="#9184d9" fill-opacity="0.08"/></pattern>
<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>`;

function svg(viewBox, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${DEFS}${body}</svg>\n`;
}

const full = (glow) => background() + mark(COLOR, glow);

const pngs = [
  ["apps/mobile/assets/icon/icon.png", 1024, svg(IOS, full(true))],
  ["apps/mobile/assets/icon/foreground.png", 1024, svg(FULL, mark(COLOR, true))],
  ["apps/mobile/assets/icon/background.png", 1024, svg(FULL, background())],
  ["apps/mobile/assets/icon/monochrome.png", 1024, svg(FULL, mark(MONO, false))],
  ["apps/web/public/apple-touch-icon.png", 180, svg(IOS, full(true))],
];

const write = (rel, data) => {
  const file = resolve(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log("wrote", rel);
};

write("apps/web/public/favicon.svg", svg(FAV, full(false)));

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [rel, size, source] of pngs) {
    await page.setViewportSize({ width: size, height: size });
    const sized = source.replace("<svg ", `<svg width="${size}" height="${size}" `);
    await page.setContent(`<body style="margin:0;background:transparent">${sized}</body>`);
    write(
      rel,
      await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
    );
  }
} finally {
  await browser.close();
}
