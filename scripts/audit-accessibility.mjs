import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOTS = ["app", "components"];
const findings = [];

function sourceFiles(directory) {
  const absolute = path.join(process.cwd(), directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative);
    return entry.isFile() && relative.endsWith(".tsx") ? [relative] : [];
  });
}

function tagName(node) {
  return node.tagName.getText();
}

function attributes(node) {
  return new Map(
    node.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => [attribute.name.getText(), attribute]),
  );
}

function attributeText(attribute) {
  if (!attribute?.initializer) return "";
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
    return attribute.initializer.expression.getText();
  }
  return attribute.initializer.getText();
}

function expressionCanName(expression) {
  if (!expression) return false;
  if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
    return Boolean(expression.text.trim());
  }
  if (ts.isJsxElement(expression)) return childrenCanName(expression.children);
  if (ts.isJsxFragment(expression)) return childrenCanName(expression.children);
  if (ts.isParenthesizedExpression(expression)) return expressionCanName(expression.expression);
  if (ts.isConditionalExpression(expression)) {
    return expressionCanName(expression.whenTrue) || expressionCanName(expression.whenFalse);
  }
  if (ts.isBinaryExpression(expression)) {
    return expressionCanName(expression.left) || expressionCanName(expression.right);
  }
  return (
    ts.isIdentifier(expression) ||
    ts.isPropertyAccessExpression(expression) ||
    ts.isElementAccessExpression(expression) ||
    ts.isCallExpression(expression) ||
    ts.isTemplateExpression(expression)
  );
}

function childrenCanName(children) {
  return children.some((child) => {
    if (ts.isJsxText(child)) return Boolean(child.text.trim());
    if (ts.isJsxExpression(child)) return expressionCanName(child.expression);
    if (ts.isJsxElement(child)) return childrenCanName(child.children);
    return false;
  });
}

function hasAccessibleName(node, attrs) {
  if (attributeText(attrs.get("aria-label")).replace(/[{}]/g, "").trim()) return true;
  if (attributeText(attrs.get("aria-labelledby")).replace(/[{}]/g, "").trim()) return true;
  if (attributeText(attrs.get("title")).replace(/[{}]/g, "").trim()) return true;
  return ts.isJsxElement(node.parent) && childrenCanName(node.parent.children);
}

function isWrappedByLabel(node) {
  let parent = node.parent;
  while (parent && !ts.isSourceFile(parent)) {
    if (ts.isJsxElement(parent) && tagName(parent.openingElement) === "label") return true;
    parent = parent.parent;
  }
  return false;
}

function report(file, source, node, message) {
  const location = source.getLineAndCharacterOfPosition(node.getStart(source));
  findings.push({
    file: file.replaceAll("\\", "/"),
    line: location.line + 1,
    message,
  });
}

for (const file of ROOTS.flatMap(sourceFiles)) {
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const labelsFor = new Set();

  function collectLabels(node) {
    if (ts.isJsxOpeningElement(node) && tagName(node) === "label") {
      const value = attributeText(attributes(node).get("htmlFor")).replace(/[{}'"`]/g, "");
      if (value) labelsFor.add(value);
    }
    ts.forEachChild(node, collectLabels);
  }
  collectLabels(source);

  function visit(node) {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const tag = tagName(node);
    const attrs = attributes(node);
    const hasSpreadAttributes = node.attributes.properties.some(ts.isJsxSpreadAttribute);
    const role = attributeText(attrs.get("role")).replace(/[{}'"`]/g, "");
    const ariaHidden = attributeText(attrs.get("aria-hidden"));

    if (tag === "button" && !hasSpreadAttributes && !hasAccessibleName(node, attrs)) {
      report(file, source, node, "Button has no statically detectable accessible name.");
    }

    if (["input", "select", "textarea"].includes(tag)) {
      const type = attributeText(attrs.get("type")).replace(/[{}'"`]/g, "");
      const id = attributeText(attrs.get("id")).replace(/[{}'"`]/g, "");
      const named =
        type === "hidden" ||
        hasSpreadAttributes ||
        isWrappedByLabel(node) ||
        Boolean(attributeText(attrs.get("aria-label"))) ||
        Boolean(attributeText(attrs.get("aria-labelledby"))) ||
        (id && labelsFor.has(id));
      if (!named) report(file, source, node, `${tag} is not associated with a label.`);
    }

    if (tag === "img" && !attrs.has("alt")) {
      report(file, source, node, "Image is missing alt text.");
    }

    if (tag === "iframe" && !attrs.has("title")) {
      report(file, source, node, "Iframe is missing a title.");
    }

    if (
      tag === "canvas" &&
      ariaHidden !== '"true"' &&
      ariaHidden !== "true" &&
      !attrs.has("aria-label") &&
      !attrs.has("aria-labelledby")
    ) {
      report(file, source, node, "Canvas needs an accessible description or aria-hidden.");
    }

    if (role === "button") {
      if (!attrs.has("tabIndex")) report(file, source, node, "role=button is missing tabIndex.");
      if (!attrs.has("onKeyDown")) report(file, source, node, "role=button is missing keyboard handling.");
      if (!hasAccessibleName(node, attrs)) report(file, source, node, "role=button has no accessible name.");
    }

    const onClick = attrs.has("onClick");
    if (
      onClick &&
      ["div", "span", "section", "article"].includes(tag) &&
      ariaHidden !== '"true"' &&
      ariaHidden !== "true" &&
      !["button", "link"].includes(role)
    ) {
      report(file, source, node, "Clickable non-interactive element needs keyboard semantics.");
    }

    if (role === "dialog") {
      if (!attrs.has("aria-label") && !attrs.has("aria-labelledby")) {
        report(file, source, node, "Dialog has no accessible name.");
      }
      if (attributeText(attrs.get("aria-modal")) === '"true"' && !attrs.has("tabIndex")) {
        report(file, source, node, "Modal dialog needs a programmatic focus target.");
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

console.log(JSON.stringify({ scannedRoots: ROOTS, findings }, null, 2));
if (findings.length) process.exitCode = 1;
