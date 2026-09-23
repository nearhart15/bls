const assert = require("node:assert/strict");
const test = require("node:test");
const {pathToFileURL} = require("node:url");
const path = require("node:path");

const importer = import(pathToFileURL(path.resolve(__dirname, "../scripts/backfill-leaguesecretary-history.mjs")).href);

function apiRows({teamId = 26, teamName = "Pins Go Boom!", playerId = 237, playerName = "Earhart, Nick", average = "166", games = [182, 130, 187], types = ["S", "S", "S"]} = {}) {
    const row = {
        BowlerID: playerId,
        BowlerTitle: playerName,
        Average: average,
        Handicap: "39",
        IsHeader: false,
        IsTotal: false,
        TeamID: 0,
        TeamName: "",
    };
    for (let index = 0; index < 6; index += 1) {
        row[`Game${index + 1}`] = games[index] == null ? "" : String(games[index]);
        row[`ScoreType${index + 1}`] = types[index] ?? "0";
    }
    row.Total = String(games.reduce((sum, score, index) => sum + (score != null && types[index] === "S" ? score : 0), 0));
    row.HandicapTotal = row.Total;
    return [
        {BowlerID: 0, BowlerTitle: teamName, IsHeader: true, IsTotal: false, TeamID: teamId, TeamName: teamName, LaneBowledOn: 34, TeamPointsWon: 2},
        row,
        {BowlerID: 0, BowlerTitle: "Total", IsHeader: false, IsTotal: true, Game1: "182", Game2: "130", Game3: "187", Total: row.Total, HandicapTotal: row.Total},
    ];
}

function snapshot(week, date, bowlers, season = "Summer 2024", year = 2024, seasonCode = "u") {
    return {reporting: {week, date, label: season, year, seasonCode}, bowlers};
}

function bowler({id, name = "Nick Earhart", sourceName = "Earhart, Nick", teamId = 26, scores = [182, 130, 187]} = {}) {
    const weekPins = scores.reduce((sum, score) => sum + score, 0);
    return {
        sourcePlayerId: id,
        sourceName,
        name,
        normalizedName: name.toLowerCase().replace(/[^a-z0-9]+/g, ""),
        teamId,
        teamName: "Pins Go Boom!",
        teamNumber: teamId,
        games: scores.map((score, index) => ({game: index + 1, score, type: "S", raw: String(score)})),
        weekGames: scores.length,
        weekPins,
        weekAverage: Math.round((weekPins / scores.length) * 10) / 10,
        weekSeries: scores.length === 3 ? weekPins : null,
    };
}

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

test("period-specific recap rows assign teams and use only scratch games", async () => {
    const {parseRecapRows} = await importer;
    const rows = [
        ...apiRows(),
        ...apiRows({teamId: 25, teamName: "Knuckles Deep", playerId: 231, playerName: "Scott, Sarah", average: "93", games: [93, 93, 93], types: ["A", "A", "A"]}),
    ];
    const teams = parseRecapRows(rows);
    assert.equal(teams.length, 2);
    const nick = teams[0].players[0];
    assert.equal(nick.sourcePlayerId, 237);
    assert.equal(nick.name, "Nick Earhart");
    assert.equal(nick.teamName, "Pins Go Boom!");
    assert.equal(nick.weekGames, 3);
    assert.equal(nick.weekPins, 499);
    assert.equal(nick.weekAverage, 166.3);
    assert.equal(nick.weekSeries, 499);
    const absent = teams[1].players[0];
    assert.equal(absent.weekGames, null);
    assert.equal(absent.weekPins, null);
    assert.equal(absent.weekAverage, null);
    assert.equal(absent.weekSeries, null);
});

test("player history accumulates exact weekly scratch pinfall within each season", async () => {
    const {buildPlayerHistory} = await importer;
    const players = buildPlayerHistory([
        snapshot(1, "2024-05-09", [bowler({id: 237, scores: [182, 130, 187]})]),
        snapshot(2, "2024-05-16", [bowler({id: 237, scores: [200, 200, 200]})]),
    ]);
    assert.equal(players.length, 1);
    assert.equal(players[0].history[0].games, 3);
    assert.equal(players[0].history[0].pins, 499);
    assert.equal(players[0].history[0].seasonAverage, 166.3);
    assert.equal(players[0].history[1].games, 6);
    assert.equal(players[0].history[1].pins, 1099);
    assert.equal(players[0].history[1].seasonAverage, 183.2);
    assert.equal(players[0].history[1].highGame, 200);
    assert.equal(players[0].history[1].highSeries, 600);
});

test("the same bowler can keep one history when LeagueSecretary IDs change between seasons", async () => {
    const {buildPlayerHistory} = await importer;
    const players = buildPlayerHistory([
        snapshot(1, "2024-05-09", [bowler({id: 237})]),
        snapshot(1, "2026-09-03", [bowler({id: 160, teamId: 24, scores: [195, 206, 172]})], "Fall 2026", 2026, "f"),
    ]);
    assert.equal(players.length, 1);
    assert.deepEqual(players[0].sourcePlayerIds, [160, 237]);
    assert.equal(players[0].sourcePlayerId, 160);
    assert.equal(players[0].history.length, 2);
    assert.equal(players[0].history[1].games, 3);
    assert.equal(players[0].history[1].pins, 573);
    assert.equal(players[0].history[1].seasonAverage, 191);
});

test("duplicate names in the same reporting week remain separate", async () => {
    const {buildPlayerHistory} = await importer;
    const sameName = "Alex Smith";
    const sameSource = "Smith, Alex";
    const players = buildPlayerHistory([
        snapshot(1, "2024-05-09", [
            bowler({id: 1, name: sameName, sourceName: sameSource, scores: [150, 150, 150]}),
            bowler({id: 2, name: sameName, sourceName: sameSource, teamId: 25, scores: [170, 170, 170]}),
        ]),
    ]);
    assert.equal(players.length, 2);
    assert.deepEqual(players.map(player => player.sourcePlayerId).sort((a, b) => a - b), [1, 2]);
});

test("absentee rows create a gap without changing season totals", async () => {
    const {parseRecapRows, buildPlayerHistory} = await importer;
    const week1 = parseRecapRows(apiRows())[0].players;
    const week2 = parseRecapRows(apiRows({games: [166, 166, 166], types: ["A", "A", "A"]}))[0].players;
    const players = buildPlayerHistory([
        snapshot(1, "2024-05-09", week1),
        snapshot(2, "2024-05-16", week2),
    ]);
    assert.equal(players[0].history[1].games, 3);
    assert.equal(players[0].history[1].pins, 499);
    assert.equal(players[0].history[1].weekAverage, null);
    assert.equal(players[0].history[1].seasonAverage, 166.3);
});
