const target = process.env.LEAGUESECRETARY_URL || "https://www.leaguesecretary.com/bowling-centers/arapahoe-bowling-center/bowling-leagues/beer-fall-2026/league/recaps-png/133016";
const headers = {
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
  "accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
};

const decode = value => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", "\"")
  .replaceAll("&#x27;", "'")
  .replaceAll("&#39;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");

function strip(value) {
  return decode(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function selectBlocks(html) {
  return [...html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)]
    .map(match => match[0])
    .map(block => {
      const open = block.match(/^<select\b[^>]*>/i)?.[0] ?? "";
      const id = open.match(/\bid=["']([^"']+)["']/i)?.[1] ?? null;
      const name = open.match(/\bname=["']([^"']+)["']/i)?.[1] ?? null;
      const options = [...block.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(option => ({
        value: decode(option[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? ""),
        selected: /\bselected\b/i.test(option[1]),
        text: strip(option[2]),
      }));
      return {id, name, options};
    });
}

async function inspect(url, label) {
  const response = await fetch(url, {redirect:"follow", headers});
  const html = await response.text();
  console.log(`\n===== ${label} =====`);
  console.log(JSON.stringify({
    status: response.status,
    finalUrl: response.url,
    bytes: Buffer.byteLength(html),
    title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null,
  }, null, 2));

  console.log("\n--- selects ---");
  console.log(JSON.stringify(selectBlocks(html), null, 2));

  console.log("\n--- forms ---");
  const forms = [...html.matchAll(/<form\b([^>]*)>/gi)].map(match => ({
    action: decode(match[1].match(/\baction=["']([^"']*)["']/i)?.[1] ?? ""),
    method: match[1].match(/\bmethod=["']([^"']*)["']/i)?.[1] ?? "",
    id: match[1].match(/\bid=["']([^"']*)["']/i)?.[1] ?? "",
  }));
  console.log(JSON.stringify(forms, null, 2));

  console.log("\n--- Pins Go Boom occurrences ---");
  const lower = html.toLowerCase();
  let index = 0, count = 0;
  while ((index = lower.indexOf("pins go boom", index)) >= 0 && count < 30) {
    console.log(strip(html.slice(Math.max(0,index-500), Math.min(html.length,index+800))));
    index += 12; count += 1;
  }

  const recapLinks = [...html.matchAll(/href=["']([^"']*\/league\/recaps\/133016[^"']*)["']/gi)]
    .map(match => new URL(decode(match[1]), response.url).href);
  console.log("\n--- recap links ---");
  console.log([...new Set(recapLinks)].join("\n"));

  const reportLinks = [...html.matchAll(/href=["']([^"']*(?:reports\/shared|\.pdf)[^"']*)["']/gi)]
    .map(match => new URL(decode(match[1]), response.url).href);
  console.log("\n--- report links ---");
  console.log([...new Set(reportLinks)].join("\n"));

  return {html, recapLinks};
}

const first = await inspect(target, "recap sheets");
const interactive = first.recapLinks.find(url => /\/league\/recaps\/133016\/\d{4}\/[fsw]\/\d+\/\d+/i.test(url))
  || "https://www.leaguesecretary.com/bowling-centers/arapahoe-bowling-center/bowling-leagues/beer-fall-2026/league/recaps/133016";
await inspect(interactive, "interactive recap");
