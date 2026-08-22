import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const rootDirectory = process.cwd();
const cssPath = path.join(rootDirectory, "app", "lumenai-obsidian.css");
const shouldWrite = process.argv.includes("--write");
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".codex-logs",
  "node_modules",
  "supabase",
]);

function sourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(target));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

const productSource = sourceFiles(rootDirectory)
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const originalCss = fs.readFileSync(cssPath, "utf8");
const cssRoot = postcss.parse(originalCss, { from: cssPath });
const sourceClassCache = new Map();
const removedSelectors = [];
let removedRules = 0;
let retainedUnparseableRules = 0;

function classIsUsed(className) {
  if (!sourceClassCache.has(className)) {
    sourceClassCache.set(className, productSource.includes(className));
  }
  return sourceClassCache.get(className);
}

function selectorIsUsed(selector) {
  let classes = [];
  try {
    selectorParser((parsed) => {
      parsed.walkClasses((classNode) => classes.push(classNode.value));
    }).processSync(selector);
  } catch {
    retainedUnparseableRules += 1;
    return true;
  }

  return classes.length === 0 || classes.every(classIsUsed);
}

cssRoot.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;

  let selectors;
  try {
    selectors = rule.selectors;
  } catch {
    retainedUnparseableRules += 1;
    return;
  }

  const activeSelectors = selectors.filter(selectorIsUsed);
  const deadSelectors = selectors.filter((selector) => !activeSelectors.includes(selector));
  removedSelectors.push(...deadSelectors);

  if (activeSelectors.length === 0) {
    removedRules += 1;
    rule.remove();
  } else if (deadSelectors.length > 0) {
    rule.selectors = activeSelectors;
  }
});

cssRoot.walkAtRules((atRule) => {
  if (atRule.nodes?.length === 0) atRule.remove();
});

const cssWithoutDeadSelectors = cssRoot.toString();
const removedKeyframes = [];
cssRoot.walkAtRules((atRule) => {
  if (!/keyframes$/i.test(atRule.name)) return;
  const animationName = atRule.params.trim();
  const definition = atRule.toString();
  const otherCss = cssRoot.toString().replace(definition, "");
  if (!otherCss.includes(animationName) && !productSource.includes(animationName)) {
    removedKeyframes.push(animationName);
    atRule.remove();
  }
});

const auditedCss = `${cssRoot.toString().trim()}\n`;
const report = {
  file: path.relative(rootDirectory, cssPath).replaceAll("\\", "/"),
  write: shouldWrite,
  before: {
    bytes: Buffer.byteLength(originalCss),
    lines: originalCss.split(/\r?\n/).length,
  },
  after: {
    bytes: Buffer.byteLength(auditedCss),
    lines: auditedCss.split(/\r?\n/).length,
  },
  removedRules,
  removedSelectorAlternatives: removedSelectors.length,
  removedKeyframes: [...new Set(removedKeyframes)].sort(),
  retainedUnparseableRules,
  removedSelectorSample: [...new Set(removedSelectors)].slice(0, 80),
  intermediateBytes: Buffer.byteLength(cssWithoutDeadSelectors),
};

if (shouldWrite) fs.writeFileSync(cssPath, auditedCss, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
