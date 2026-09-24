const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workflows = path.join(root, ".github", "workflows");

function workflowFiles() {
  return fs.readdirSync(workflows)
    .filter(name => /\.ya?ml$/i.test(name))
    .map(name => path.join(workflows, name));
}

test("third-party GitHub Actions are pinned to immutable commit SHAs", () => {
  for (const file of workflowFiles()) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
      const ref = match[1];
      if (ref.startsWith("./")) continue;
      assert.match(ref, /@[0-9a-f]{40}$/i, `${path.basename(file)} has an unpinned action: ${ref}`);
    }
  }
});

test("workflows avoid pull_request_target and blanket write permissions", () => {
  for (const file of workflowFiles()) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\bpull_request_target\s*:/, `${path.basename(file)} uses pull_request_target`);
    assert.doesNotMatch(source, /\bpermissions\s*:\s*write-all\b/, `${path.basename(file)} grants write-all`);
  }
});

test("checkout credentials are never persisted", () => {
  for (const file of workflowFiles()) {
    const source = fs.readFileSync(file, "utf8");
    const checkoutCount = (source.match(/uses:\s*actions\/checkout@[0-9a-f]{40}/gi) ?? []).length;
    const disabledCount = (source.match(/persist-credentials:\s*false/gi) ?? []).length;
    assert.ok(disabledCount >= checkoutCount, `${path.basename(file)} persists checkout credentials`);
  }
});

test("npm lifecycle scripts are disabled by default", () => {
  const npmrc = fs.readFileSync(path.join(root, ".npmrc"), "utf8");
  assert.match(npmrc, /^ignore-scripts=true$/m);
});
