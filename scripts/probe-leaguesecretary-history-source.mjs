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


console.log("\n===== period-specific recap endpoint =====");
for (const probe of [
  {label: "summer-2024-week-1-pins", year: 2024, season: "u", weekNum: 1, teamId: 26},
  {label: "fall-2026-week-3-pins", year: 2026, season: "f", weekNum: 3, teamId: 24},
]) {
  const body = new URLSearchParams({
    leagueId: "133016",
    year: String(probe.year),
    season: probe.season,
    weekNum: String(probe.weekNum),
    teamId: String(probe.teamId),
    page: "1",
    pageSize: "100",
  });
  const response = await fetch("https://www.leaguesecretary.com/League/InteractiveRecaps_Read", {
    method: "POST",
    headers: {
      "user-agent": "BLS history-source probe",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      accept: "application/json,text/plain,*/*",
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  console.log(probe.label, JSON.stringify({
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes: text.length,
    total: parsed?.Total,
    errors: parsed?.Errors,
    rows: Array.isArray(parsed?.Data) ? parsed.Data.slice(0, 20) : null,
    bodyPreview: parsed ? null : text.slice(0, 1200),
  }, null, 2));
}


console.log("\n===== period-specific recap endpoint with session/token =====");
for (const probe of [
  {label: "summer-2024-week-1-pins", year: 2024, season: "u", weekNum: 1, teamId: 26},
  {label: "fall-2026-week-3-pins", year: 2026, season: "f", weekNum: 3, teamId: 24},
]) {
  const pageUrl = `https://www.leaguesecretary.com/bowling-centers/arapahoe-bowling-center/bowling-leagues/beer-fall-2026/league/recaps/133016/${probe.year}/${probe.season}/${probe.weekNum}/${probe.teamId}`;
  const page = await fetch(pageUrl, {headers: {"user-agent": "BLS history-source probe"}});
  const pageHtml = await page.text();
  const token = pageHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/i)?.[1] ?? "";
  const cookies = typeof page.headers.getSetCookie === "function" ? page.headers.getSetCookie() : [page.headers.get("set-cookie")].filter(Boolean);
  const cookie = cookies.map(value => String(value).split(";")[0]).join("; ");
  for (const variant of ["form-token", "header-token"]) {
    const body = new URLSearchParams({
      leagueId: "133016",
      year: String(probe.year),
      season: probe.season,
      weekNum: String(probe.weekNum),
      teamId: String(probe.teamId),
      page: "1",
      pageSize: "100",
    });
    if (variant === "form-token" && token) body.set("__RequestVerificationToken", token);
    const headers = {
      "user-agent": "BLS history-source probe",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      accept: "application/json,text/plain,*/*",
      "x-requested-with": "XMLHttpRequest",
      referer: pageUrl,
      origin: "https://www.leaguesecretary.com",
    };
    if (cookie) headers.cookie = cookie;
    if (variant === "header-token" && token) headers.RequestVerificationToken = token;
    const response = await fetch("https://www.leaguesecretary.com/League/InteractiveRecaps_Read", {method: "POST", headers, body});
    const text = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    console.log(probe.label + " " + variant, JSON.stringify({
      pageStatus: page.status,
      tokenLength: token.length,
      cookieNames: cookies.map(value => String(value).split("=")[0]),
      status: response.status,
      contentType: response.headers.get("content-type"),
      bytes: text.length,
      total: parsed?.Total,
      errors: parsed?.Errors,
      rows: Array.isArray(parsed?.Data) ? parsed.Data.slice(0, 20) : null,
      bodyPreview: parsed ? null : text.slice(0, 700),
    }, null, 2));
  }
}
