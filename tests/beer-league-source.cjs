const LEAGUES_URL = 'https://arapahoebowl.com/league-options/';
const USER_AGENT = 'BLS Beer League importer prototype (+https://github.com/nearhart15/bls)';

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function plainText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function anchors(html, baseUrl) {
  const results = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    let url;
    try { url = new URL(decodeHtml(match[1]), baseUrl).href; } catch { continue; }
    results.push({ url, text: plainText(match[2]), index: match.index });
  }
  return results;
}

async function fetchOk(url, asBuffer = false) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': USER_AGENT,
      'accept': asBuffer ? 'application/pdf,*/*;q=0.8' : 'text/html,application/xhtml+xml,*/*;q=0.8'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
  return asBuffer ? Buffer.from(await response.arrayBuffer()) : await response.text();
}

function findBeerLeaguePage(html) {
  const candidates = anchors(html, LEAGUES_URL)
    .filter(a => /view\s+league/i.test(a.text))
    .map(a => {
      const context = plainText(html.slice(Math.max(0, a.index - 5000), a.index + 500));
      let score = 0;
      if (/\bBeer\b/i.test(context)) score += 8;
      if (/Thursday/i.test(context)) score += 4;
      if (/8\s*:\s*00\s*PM/i.test(context)) score += 4;
      if (/2026\s*[–-]\s*27/i.test(context)) score += 2;
      return { ...a, context, score };
    })
    .sort((a, b) => b.score - a.score);

  if (!candidates.length || candidates[0].score < 8) {
    throw new Error('Could not identify the Fall/Winter Beer league View League link.');
  }
  return candidates[0];
}

function findStandingsPdf(html, leaguePageUrl) {
  const candidates = anchors(html, leaguePageUrl)
    .filter(a => /\.pdf(?:$|[?#])/i.test(a.url))
    .map(a => {
      const context = plainText(html.slice(Math.max(0, a.index - 1500), a.index + 500));
      let score = 0;
      if (/standings?/i.test(`${a.text} ${context}`)) score += 8;
      if (/beer/i.test(`${a.url} ${a.text} ${context}`)) score += 4;
      if (/week|wk\.?\s*\d+/i.test(`${a.url} ${a.text} ${context}`)) score += 2;
      return { ...a, context, score };
    })
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) throw new Error('Beer league page did not contain a PDF link.');
  return candidates[0];
}

(async () => {
  console.log(`1. Loading league directory: ${LEAGUES_URL}`);
  const directoryHtml = await fetchOk(LEAGUES_URL);
  const league = findBeerLeaguePage(directoryHtml);
  console.log(`2. Found Beer / Thursday / 8:00 PM View League target: ${league.url}`);

  const leagueHtml = await fetchOk(league.url);
  const pdf = findStandingsPdf(leagueHtml, league.url);
  console.log(`3. Found standings PDF: ${pdf.url}`);

  const bytes = await fetchOk(pdf.url, true);
  if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error(`Standings URL did not return a PDF (${bytes.length} bytes).`);
  }

  console.log(`4. PDF download verified (${bytes.length.toLocaleString()} bytes).`);
  console.log(JSON.stringify({ source: LEAGUES_URL, leaguePage: league.url, standingsPdf: pdf.url, bytes: bytes.length }, null, 2));
})().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
