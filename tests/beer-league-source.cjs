// Read-only integration check: use the same discovery and URL validation as production.
(async () => {
    const {discoverBeerLeague} = await import('../scripts/import-beer-league.mjs');
    const {league, leaguePageUrl, pdfUrl} = await discoverBeerLeague();
    console.log(JSON.stringify({league: league.item.title ?? league.item.name, leaguePageUrl, pdfUrl}, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
