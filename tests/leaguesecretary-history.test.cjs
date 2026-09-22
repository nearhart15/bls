const assert = require("node:assert/strict");
const test = require("node:test");
const {pathToFileURL} = require("node:url");
const path = require("node:path");

const importer = import(pathToFileURL(path.resolve(__dirname, "../scripts/backfill-leaguesecretary-history.mjs")).href);

function bowler(id, name, games, pins) {
    return {
        sourcePlayerId: id,
        sourceName: name,
        name: name.includes(",") ? name.split(",").reverse().map(part => part.trim()).join(" ") : name,
        teamId: 24,
        teamName: "Pins Go Boom!",
        teamNumber: 18,
        games,
        pins,
        average: games ? Math.floor(pins / games) : 0,
        enteringAverage: 0,
        handicap: 0,
        highGame: 220,
        highSeries: 600,
        highHandicapGame: 0,
        highHandicapSeries: 0,
    };
}

function snapshot(week, date, bowlers, season = "Fall 2026", year = 2026, seasonCode = "f") {
    return {reporting: {week, date, label: season, year, seasonCode}, bowlers};
}

test("player history uses pin-weighted cumulative average and weekly deltas", async () => {
    const {buildPlayerHistory} = await importer;
    const players = buildPlayerHistory([
        snapshot(1, "2026-09-03", [bowler(160, "Earhart, Nick", 3, 450)]),
        snapshot(2, "2026-09-10", [bowler(160, "Earhart, Nick", 6, 930)]),
    ]);
    assert.equal(players.length, 1);
    assert.equal(players[0].name, "Nick Earhart");
    assert.equal(players[0].history[1].seasonAverage, 155);
    assert.equal(players[0].history[1].weekGames, 3);
    assert.equal(players[0].history[1].weekPins, 480);
    assert.equal(players[0].history[1].weekAverage, 160);
    assert.equal(players[0].history[1].weekSeries, 480);
});

test("weeks with no new games remain gaps instead of inventing scores", async () => {
    const {buildPlayerHistory} = await importer;
    const players = buildPlayerHistory([
        snapshot(1, "2026-09-03", [bowler(160, "Earhart, Nick", 3, 450)]),
        snapshot(2, "2026-09-10", [bowler(160, "Earhart, Nick", 3, 450)]),
    ]);
    const second = players[0].history[1];
    assert.equal(second.weekGames, null);
    assert.equal(second.weekPins, null);
    assert.equal(second.weekAverage, null);
    assert.equal(second.weekSeries, null);
});

test("duplicate names remain separate when LeagueSecretary BowlerIDs differ", async () => {
    const {buildPlayerHistory} = await importer;
    const players = buildPlayerHistory([
        snapshot(1, "2026-09-03", [
            bowler(1, "Smith, Alex", 3, 450),
            bowler(2, "Smith, Alex", 3, 510),
        ]),
    ]);
    assert.equal(players.length, 2);
    assert.deepEqual(players.map(player => player.sourcePlayerId).sort((a, b) => a - b), [1, 2]);
});

test("reporting-period selector parses LeagueSecretary week metadata", async () => {
    const {extractSelectOptions, parseReportingPeriod} = await importer;
    const html = '<select id="leaguePngViewer-recaps-period"><option value="3|2026|f" selected>Fall 2026 Week 3 09/17/2026</option></select>';
    const options = extractSelectOptions(html, "leaguePngViewer-recaps-period");
    assert.equal(options.length, 1);
    assert.deepEqual(parseReportingPeriod(options[0]), {
        week: 3,
        year: 2026,
        seasonCode: "f",
        label: "Fall 2026",
        date: "2026-09-17",
        sourceLabel: "Fall 2026 Week 3 09/17/2026",
    });
});

test("bowler data extraction does not depend on optional subscription markup", async () => {
    const {extractLeagueBowlerData} = await importer;
    const html = '<script>widget({"dataSource":[{"id":1}]});other({"dataSource":[{"BowlerID":160,"BowlerName":"Earhart, Nick","TotalPins":1736,"TotalGames":9}]});</script>';
    const rows = extractLeagueBowlerData(html);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].BowlerID, 160);
});
