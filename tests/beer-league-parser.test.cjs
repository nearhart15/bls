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
