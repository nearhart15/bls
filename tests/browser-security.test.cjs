const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../src");

function sourceFiles(dir = root) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

test("browser source avoids dangerous dynamic HTML and script execution sinks", () => {
  const forbidden = [
    ["dangerouslySetInnerHTML", /\bdangerouslySetInnerHTML\b/],
    ["innerHTML assignment", /\.innerHTML\s*=/],
    ["outerHTML assignment", /\.outerHTML\s*=/],
    ["document.write", /\bdocument\.write\s*\(/],
    ["eval", /\beval\s*\(/],
    ["Function constructor", /\bnew\s+Function\s*\(/],
    ["insertAdjacentHTML", /\.insertAdjacentHTML\s*\(/],
    ["javascript URL", /["'`]\s*javascript\s*:/i],
  ];
  for (const file of sourceFiles()) {
    const source = fs.readFileSync(file, "utf8");
    for (const [label, pattern] of forbidden) {
      assert.doesNotMatch(source, pattern, `${path.relative(root, file)} contains ${label}`);
    }
  }
});

test("browser network access is centralized through the validated fetch boundary", () => {
  for (const file of sourceFiles()) {
    const relative = path.relative(root, file).replaceAll(path.sep, "/");
    const source = fs.readFileSync(file, "utf8");
    if (relative === "data/utils/fetch-json.ts") continue;
    assert.doesNotMatch(source, /\bfetch\s*\(/, `${relative} performs a raw browser fetch`);
  }
});

test("new-tab anchors explicitly prevent opener access and referrer leakage", () => {
  for (const file of sourceFiles()) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/<a\b[^>]*\btarget=["']_blank["'][^>]*>/gis)) {
      assert.match(match[0], /\brel=["'][^"']*\bnoopener\b[^"']*["']/i, `${path.relative(root, file)} missing noopener`);
      assert.match(match[0], /\brel=["'][^"']*\bnoreferrer\b[^"']*["']/i, `${path.relative(root, file)} missing noreferrer`);
    }
  }
});


test("production CSP blocks high-risk browser capabilities", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
  const marker = 'http-equiv="Content-Security-Policy" content="';
  const start = html.indexOf(marker);
  assert.ok(start >= 0, "CSP meta tag is missing");
  const valueStart = start + marker.length;
  const valueEnd = html.indexOf('"', valueStart);
  assert.ok(valueEnd > valueStart, "CSP meta tag is malformed");
  const csp = html.slice(valueStart, valueEnd);
  for (const directive of [
    "default-src 'self'",
    "script-src-attr 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]) {
    assert.ok(csp.includes(directive), `CSP is missing ${directive}`);
  }
  assert.equal(html.includes("fonts.googleapis.com"), false, "Google Fonts CSS must not be loaded");
  assert.equal(html.includes("fonts.gstatic.com"), false, "Google Fonts assets must not be loaded");
});
