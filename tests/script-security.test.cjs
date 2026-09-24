const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {pathToFileURL} = require("node:url");

async function securityUtils() {
  return import(pathToFileURL(path.resolve(__dirname, "../scripts/security-utils.mjs")).href);
}

test("trusted importer URLs require HTTPS and approved hosts", async () => {
  const {assertTrustedUrl} = await securityUtils();
  const allowed = ["arapahoebowl.com"];
  assert.equal(assertTrustedUrl("https://arapahoebowl.com/a.pdf", allowed).hostname, "arapahoebowl.com");
  assert.equal(assertTrustedUrl("https://www.arapahoebowl.com/a.pdf", allowed).hostname, "www.arapahoebowl.com");
  assert.throws(() => assertTrustedUrl("http://arapahoebowl.com/a.pdf", allowed), /scheme/);
  assert.throws(() => assertTrustedUrl("https://user:pass@arapahoebowl.com/a.pdf", allowed), /credentials/);
  assert.throws(() => assertTrustedUrl("https://arapahoebowl.com.evil.example/a.pdf", allowed), /host/);
});

test("importer redirects cannot escape the approved host set", async () => {
  const {safeFetch} = await securityUtils();
  const original = global.fetch;
  global.fetch = async () => new Response("", {status: 302, headers: {location: "https://evil.example/payload"}});
  try {
    await assert.rejects(
      safeFetch("https://arapahoebowl.com/start", {}, {allowedHosts: ["arapahoebowl.com"]}),
      /Untrusted URL host/
    );
  } finally {
    global.fetch = original;
  }
});

test("importer response readers enforce byte limits", async () => {
  const {readLimitedText, readLimitedJson} = await securityUtils();
  await assert.rejects(readLimitedText(new Response("12345"), 4), /too large/);
  assert.deepEqual(await readLimitedJson(new Response('{"ok":true}'), 100), {ok: true});
});

test("importer concurrency values are bounded", async () => {
  const {boundedEnvInt} = await securityUtils();
  assert.equal(boundedEnvInt("6", 4, 1, 12), 6);
  assert.equal(boundedEnvInt("999", 4, 1, 12), 12);
  assert.equal(boundedEnvInt("-10", 4, 1, 12), 1);
  assert.equal(boundedEnvInt("bad", 4, 1, 12), 4);
});
