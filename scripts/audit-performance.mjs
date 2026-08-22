import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const panelBuild = path.join(root, ".next", "server", "app", "panel");

if (!fs.existsSync(panelBuild)) {
  console.error("No existe .next. Ejecuta npm run build antes de audit:performance.");
  process.exit(1);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.name.endsWith("client-reference-manifest.js") ? [target] : [];
  });
}

function readManifest(file) {
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/__RSC_MANIFEST\["([^"]+)"\]\s*=\s*(\{.*\});\s*$/s);
  if (!match) throw new Error(`No se pudo interpretar ${file}`);
  return { routeKey: match[1], manifest: JSON.parse(match[2]) };
}

function chunkBytes(chunks) {
  return [...new Set(chunks)].reduce((total, chunk) => {
    const file = path.join(root, ".next", chunk.replace(/^\//, ""));
    return total + (fs.existsSync(file) ? fs.statSync(file).size : 0);
  }, 0);
}

const routes = [];
let layoutChunks = [];

for (const file of walk(panelBuild)) {
  const { routeKey, manifest } = readManifest(file);
  const entries = manifest.entryJSFiles ?? {};
  layoutChunks = entries["[project]/app/panel/layout"] ?? layoutChunks;
  const pageEntry = Object.keys(entries).find((entry) => entry.endsWith("/page"));
  if (!pageEntry) continue;
  routes.push({
    route: routeKey.replace(/\/page$/, ""),
    chunks: new Set(entries[pageEntry]).size,
    bytes: chunkBytes(entries[pageEntry]),
  });
}

routes.sort((left, right) => right.bytes - left.bytes);
const routeMap = new Map(routes.map((route) => [route.route, route]));
const layoutBytes = chunkBytes(layoutChunks);
const globalSource = [...new Set(layoutChunks)]
  .map((chunk) => fs.readFileSync(path.join(root, ".next", chunk), "utf8"))
  .join("\n");

const budgets = new Map([
  ["/panel/overview", 300],
  ["/panel/calibration", 280],
  ["/panel/radar", 180],
  ["/panel/lumenite", 180],
  ["/panel/chat", 180],
  ["/panel/leads", 200],
  ["/panel/widget", 340],
  ["/panel/knowledge", 550],
  ["/panel/settings", 470],
]);

const findings = [];
if (layoutBytes / 1024 > 150) {
  findings.push(`El layout global supera 150 KB: ${(layoutBytes / 1024).toFixed(1)} KB.`);
}
if (/GoTrueClient|RealtimeClient|supabase-js/.test(globalSource)) {
  findings.push("El SDK de Supabase volvio a entrar en el paquete global del panel.");
}
for (const [route, budget] of budgets) {
  const current = routeMap.get(route);
  if (!current) {
    findings.push(`Falta el manifiesto de ${route}.`);
  } else if (current.bytes / 1024 > budget) {
    findings.push(`${route} supera ${budget} KB: ${(current.bytes / 1024).toFixed(1)} KB.`);
  }
}

console.table(
  routes.map((route) => ({
    route: route.route,
    chunks: route.chunks,
    kb: Number((route.bytes / 1024).toFixed(1)),
  })),
);
console.log(
  JSON.stringify(
    {
      layoutKb: Number((layoutBytes / 1024).toFixed(1)),
      supabaseInGlobalBundle: /GoTrueClient|RealtimeClient|supabase-js/.test(globalSource),
      findings,
    },
    null,
    2,
  ),
);

if (findings.length) process.exitCode = 1;
