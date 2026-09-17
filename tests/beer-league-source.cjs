const LEAGUES_URL = 'https://arapahoebowl.com/league-options/';
const AJAX_URL = new URL('/wp-admin/admin-ajax.php', LEAGUES_URL).href;
const USER_AGENT = 'BLS Beer League importer prototype (+https://github.com/nearhart15/bls)';

function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}
async function request(url, options = {}) {
  const response = await fetch(url, { redirect: 'follow', ...options, headers: { 'user-agent': USER_AGENT, 'accept': 'text/html,application/json,application/pdf,*/*;q=0.8', ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
  return response;
}
function publicActions(html) { return [...new Set([...html.matchAll(/publicRequest\(\s*["']([^"']+)["']\s*\)/g)].map(match => match[1]))]; }
async function publicData(action) {
  const response = await request(AJAX_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: new URLSearchParams({ action }).toString() });
  const json = await response.json(); if (!json?.success) throw new Error(`Public AJAX action ${action} failed.`); return json.data;
}
function objects(value, output = []) { if (!value || typeof value !== 'object') return output; if (!Array.isArray(value)) output.push(value); for (const child of Object.values(value)) objects(child, output); return output; }
function beerScore(item) {
  const title = String(item.title ?? item.name ?? item.league_name ?? ''); const day = String(item.day ?? item.weekday ?? item.bowling_day ?? ''); const time = String(item.time ?? item.start_time ?? item.bowling_time ?? ''); const season = String(item.season_label ?? item.season ?? item.season_name ?? ''); let score = 0;
  if (/^beer$/i.test(title.trim())) score += 20; else if (/\bbeer\b/i.test(title)) score += 8; if (/thursday/i.test(day)) score += 6; if (/8\s*:\s*00\s*pm/i.test(time)) score += 6; if (/2026\s*[–-]\s*27/i.test(season)) score += 3; return score;
}
function findBeerLeague(dataSets) {
  const candidates = dataSets.flatMap(({ action, data }) => objects(data).map(item => ({ action, item, score: beerScore(item) }))).filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score);
  if (!candidates.length || candidates[0].score < 20) throw new Error('Public league data did not contain the Beer league.'); return candidates[0];
}
function urlsFromObject(item) { return Object.entries(item).filter(([, value]) => typeof value === 'string' && /^https?:\/\//i.test(value)).map(([key, value]) => ({ key, url: decodeHtml(value) })); }
function chooseLeaguePage(item) { const urls = urlsFromObject(item); return urls.find(entry => /permalink|page|link|url/i.test(entry.key) && !/pdf|stand|cover/i.test(entry.key))?.url ?? urls.find(entry => !/\.pdf(?:$|[?#])/i.test(entry.url) && !/wp-content\/uploads/i.test(entry.url))?.url ?? null; }
function pdfUrlsFromHtml(html, baseUrl) {
  const patterns = [/(?:https?:\\?\/\\?\/)[^"'<>\s\\]+\.pdf(?:[?#][^"'<>\s\\]*)?/gi, /\/wp-content\/uploads\/[^"'<>\s\\]+\.pdf(?:[?#][^"'<>\s\\]*)?/gi];
  const urls = [];
  for (const pattern of patterns) for (const match of html.matchAll(pattern)) { const raw = decodeHtml(match[0].replaceAll('\\/', '/')); try { urls.push(new URL(raw, baseUrl).href); } catch { /* ignore */ } }
  return [...new Set(urls)];
}
function choosePdf(item, leagueHtml, leaguePageUrl) {
  const objectPdf = urlsFromObject(item).filter(entry => /\.pdf(?:$|[?#])/i.test(entry.url)); const htmlPdf = pdfUrlsFromHtml(leagueHtml, leaguePageUrl).map(url => ({ key: 'html', url }));
  const candidates = [...objectPdf, ...htmlPdf].map(entry => { let score = 0; if (/stand/i.test(entry.key)) score += 8; if (/beer/i.test(entry.url)) score += 4; if (/stand/i.test(entry.url)) score += 4; if (/wk|week/i.test(entry.url)) score += 2; return { ...entry, score }; }).sort((a, b) => b.score - a.score);
  console.log(`   PDF candidates: ${JSON.stringify(candidates)}`); return candidates[0]?.url ?? null;
}
(async () => {
  console.log(`1. Loading league directory: ${LEAGUES_URL}`); const directoryHtml = await (await request(LEAGUES_URL)).text(); const actions = publicActions(directoryHtml); if (!actions.length) throw new Error('Could not discover the public league AJAX actions.'); console.log(`2. Discovered public data actions: ${actions.join(', ')}`);
  const dataSets = []; for (const action of actions) dataSets.push({ action, data: await publicData(action) }); const league = findBeerLeague(dataSets); console.log(`3. Found Beer league via ${league.action}: ${JSON.stringify(league.item)}`);
  const leaguePageUrl = chooseLeaguePage(league.item); if (!leaguePageUrl) throw new Error('Beer league data did not include a league page URL.'); console.log(`4. Following View League target: ${leaguePageUrl}`);
  const leagueHtml = await (await request(leaguePageUrl)).text(); const pdfUrl = choosePdf(league.item, leagueHtml, leaguePageUrl); if (!pdfUrl) throw new Error('Beer league page did not expose a standings PDF URL.'); console.log(`5. Found standings PDF: ${pdfUrl}`);
  const bytes = Buffer.from(await (await request(pdfUrl)).arrayBuffer()); if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error(`Standings URL did not return a PDF (${bytes.length} bytes).`); console.log(`6. PDF download verified (${bytes.length.toLocaleString()} bytes).`); console.log(JSON.stringify({ source: LEAGUES_URL, leaguePage: leaguePageUrl, standingsPdf: pdfUrl, bytes: bytes.length }, null, 2));
})().catch(error => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
