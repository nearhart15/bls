const routes = [
  ["summer-2024-week-1", "https://www.leaguesecretary.com/bowling-centers/arapahoe-bowling-center/bowling-leagues/beer-fall-2026/league/recaps/133016/2024/u/1/0"],
  ["fall-2026-week-3", "https://www.leaguesecretary.com/bowling-centers/arapahoe-bowling-center/bowling-leagues/beer-fall-2026/league/recaps/133016/2026/f/3/0"],
];

function decode(value) {
  return String(value)
    .replaceAll("\\u0026", "&")
    .replaceAll("&amp;", "&")
    .replaceAll("\\/", "/")
    .replaceAll("\\u003d", "=")
    .replaceAll("\\u002f", "/");
}

for (const [label, url] of routes) {
  const response = await fetch(url, {headers: {"user-agent": "BLS history-source probe"}});
  const raw = await response.text();
  const html = decode(raw);
  const reportLinks = [...new Set([...html.matchAll(/https:\/\/www\.leaguesecretary\.com\/reports\/shared\?[^"'<>\\s]+/gi)].map(m => m[0]))];
  const pdfPaths = [...new Set([...html.matchAll(/\/uploads\/[^"'<>\\s]+\.pdf/gi)].map(m => m[0]))];
  const apiPaths = [...new Set([...html.matchAll(/(?:https:\/\/www\.leaguesecretary\.com)?\/(?:api|league)[^"'<>\\s)]*/gi)].map(m => m[0]))].slice(0, 80);
  const dataSources = [...html.matchAll(/dataSource/g)].length;
  const bowlerIds = [...html.matchAll(/BowlerID/g)].length;
  const totalPins = [...html.matchAll(/TotalPins/g)].length;
  console.log("\n===== " + label + " =====");
  const contexts = {};
  for (const needle of ["/League/InteractiveRecap", "leagueRecapTeam", "dataSource"]) {
    const positions = [];
    let at = 0;
    while ((at = html.indexOf(needle, at)) >= 0 && positions.length < 8) {
      positions.push(html.slice(Math.max(0, at - 1200), Math.min(html.length, at + 2600)));
      at += needle.length;
    }
    contexts[needle] = positions;
  }
  const hiddenInputs = [...html.matchAll(/<input\b[^>]*type=["']hidden["'][^>]*>/gi)].map(m => m[0]).slice(0, 80);
  console.log(JSON.stringify({status: response.status, finalUrl: response.url, bytes: raw.length, reportLinks, pdfPaths, apiPaths, dataSources, bowlerIds, totalPins, hiddenInputs, contexts}, null, 2));
}
