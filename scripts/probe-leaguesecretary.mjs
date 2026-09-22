const target = process.env.LEAGUESECRETARY_URL || "https://www.leaguesecretary.com/bowling-centers/arapahoe-bowling-center/bowling-leagues/beer-fall-2026/league/recaps-png/133016";
const headers = {
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
  "accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
};

function unique(values) {
  return [...new Set(values)];
}

function absolute(value, base) {
  try { return new URL(value, base).href; } catch { return null; }
}

function interesting(value) {
  return /api|recap|report|season|week|pdf|league|graphql|_next/i.test(value);
}

async function main() {
  const response = await fetch(target, {redirect: "follow", headers});
  const html = await response.text();
  console.log(JSON.stringify({
    target,
    status: response.status,
    finalUrl: response.url,
    contentType: response.headers.get("content-type"),
    bytes: Buffer.byteLength(html),
    title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null,
  }, null, 2));

  const attrs = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)]
    .map(match => absolute(match[1], response.url))
    .filter(Boolean);
  const direct = unique(attrs.filter(interesting));
  console.log("\n=== Interesting page URLs ===");
  direct.slice(0, 300).forEach(value => console.log(value));

  console.log("\n=== Inline endpoint/string candidates ===");
  const strings = unique(
    [...html.matchAll(/["'`](.{1,240}?)["'`]/g)]
      .map(match => match[1])
      .filter(value => interesting(value) && !/^[A-Za-z0-9 _.-]+$/.test(value))
  );
  strings.slice(0, 350).forEach(value => console.log(value));

  const scriptUrls = unique(attrs.filter(value => /\.js(?:[?#]|$)/i.test(value))).slice(0, 40);
  console.log(`\n=== JavaScript bundles (${scriptUrls.length}) ===`);
  scriptUrls.forEach(value => console.log(value));

  for (const url of scriptUrls) {
    try {
      const jsResponse = await fetch(url, {headers});
      if (!jsResponse.ok) continue;
      const js = await jsResponse.text();
      const candidates = unique(
        [...js.matchAll(/["'`](.{1,220}?)["'`]/g)]
          .map(match => match[1])
          .filter(value => interesting(value) && (/^\//.test(value) || /https?:|api|recap|report|season|week|pdf/i.test(value)))
      );
      if (!candidates.length) continue;
      console.log(`\n--- ${url} ---`);
      candidates.slice(0, 250).forEach(value => console.log(value));
    } catch (error) {
      console.log(`bundle error ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
