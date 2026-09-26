const test = require("node:test");
const assert = require("node:assert/strict");

const sample = `08/14/2025 Week 15 of 15 Beer Summer 2025 Page 1
Thursday 07:00 pm Arapahoe Bowling Center Lanes 1 - 40
Team Standings In Each Division
Points Points Team Pins + Scratch HDCP HDCP High High
Place # Team Name Won Lost Avg HDCP HDCP Pins Game Sers Game Sers
Tastes Great!
1 3 Just Split On It 40 20 676 146 37643 29636 979 2688 785 2201
7 11 BADA BING!!!!! 32½ 27½ 614 202 37093 27499 918 2583 701 1932
Less Filling!
1 28 Great Balls of Fire 39 21 705 118 37991 31598 938 2678 863 2453
Review of Last Week's Bowling.....
Team Rosters
High High HDCP HDCP HDCP
Name Avg HDCP Pins Gms Game Sers Game Sers -1- -2- -3- Total Total
3 - Just Split On It
Kurtis Fleming 165 40 2479 15 213 542 241 629 149 144 121 414 516
Tyler Baker 191 17 7464 39 258 710 302 782 0 0
Temporary Substitutes
High High HDCP HDCP HDCP
Name Avg HDCP Pins Gms Game Sers Game Sers -1- -2- -3- Total Total
Shannon Adler 109 90 328 3 123 328 213 598 0 0
View Standings on the Web`;

test("parses BLS standings, divisions, rosters and substitutes", async () => {
  const { parseBlsText } = await import("../scripts/import-beer-league.mjs");
  const data = parseBlsText(sample, { season: "Summer 2025", pdfUrl: "https://example.com/beer.pdf" });
  assert.equal(data.league.week, 15);
  assert.equal(data.league.totalWeeks, 15);
  assert.equal(data.standings.length, 3);
  assert.equal(data.standings[1].won, 32.5);
  assert.equal(data.standings[2].division, "Less Filling!");
  assert.equal(data.teams.length, 1);
  assert.equal(data.teams[0].name, "Just Split On It");
  assert.equal(data.teams[0].players[0].weekTotal, 414);
  assert.deepEqual(data.teams[0].players[0].weekScores, [149, 144, 121]);
  assert.equal(data.teams[0].players[1].weekTotal, 0);
  assert.equal(data.substitutes.length, 1);
});

test("prefers the current Fall/Winter season without a hard-coded year", async () => {
  const { rankBeerLeagueItems } = await import("../scripts/import-beer-league.mjs");
  const items = [
    { title: "Beer", day: "Thursday", time: "8:00 pm", season_label: "Fall / Winter 2026–27" },
    { title: "Beer", day: "Thursday", time: "8:00 pm", season_label: "Fall / Winter 2027–28" },
  ];
  const ranked = rankBeerLeagueItems(items, new Date("2027-09-15T12:00:00Z"));
  assert.equal(ranked[0].item.season_label, "Fall / Winter 2027–28");
});

test("prefers summer during the summer window and Fall/Winter after rollover", async () => {
  const { rankBeerLeagueItems } = await import("../scripts/import-beer-league.mjs");
  const items = [
    { title: "Beer", day: "Thursday", time: "8:00 pm", season_label: "Summer 2028" },
    { title: "Beer", day: "Thursday", time: "8:00 pm", season_label: "Fall / Winter 2028–29" },
  ];
  assert.equal(rankBeerLeagueItems(items, new Date("2028-06-15T12:00:00Z"))[0].item.season_label, "Summer 2028");
  assert.equal(rankBeerLeagueItems(items, new Date("2028-09-15T12:00:00Z"))[0].item.season_label, "Fall / Winter 2028–29");
});




test("prefers the newest standings week when the league page lists multiple PDFs", async () => {
  const { rankStandingsPdfUrls } = await import("../scripts/import-beer-league.mjs");
  const ranked = rankStandingsPdfUrls([
    { key: "standings_pdf", url: "https://arapahoebowl.com/wp-content/uploads/2026/08/Beer-Fall-2026-Standings-Wk-3.pdf?abc_pdf_v=1790102208" },
    { key: "html", url: "https://arapahoebowl.com/wp-content/uploads/2026/09/Beer-Fall-2026-Standings-Wk-4.pdf?abc_pdf_v=1790700000" },
  ]);
  assert.match(ranked[0].url, /Wk-4\.pdf/);
  assert.equal(ranked[0].week, 4);
});

test("preserves generatedAt when imported standings are otherwise unchanged", async () => {
  const { preserveGeneratedAtIfUnchanged } = await import("../scripts/import-beer-league.mjs");
  const existing = {status:"ready", generatedAt:"2026-09-23T12:00:00.000Z", league:{week:3}, standings:[{number:1}], teams:[]};
  const same = {status:"ready", generatedAt:"2026-09-24T12:00:00.000Z", league:{week:3}, standings:[{number:1}], teams:[]};
  const changed = {status:"ready", generatedAt:"2026-09-24T12:00:00.000Z", league:{week:4}, standings:[{number:1}], teams:[]};
  assert.equal(preserveGeneratedAtIfUnchanged(same, existing).generatedAt, existing.generatedAt);
  assert.equal(preserveGeneratedAtIfUnchanged(changed, existing).generatedAt, changed.generatedAt);
});
