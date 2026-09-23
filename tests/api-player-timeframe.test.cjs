const assert = require("node:assert/strict");
const test = require("node:test");
const load = require("./load-source.cjs");

const {
    API_PLAYER_PROGRESS_OPTIONS,
    buildApiPlayerProgress,
    pointsForApiPlayerTimeframe,
    summarizeApiPlayerHistory,
} = load("src/data/player/api-player-timeframe.ts");

function point({season, seasonKey, week, date, weekScores = [], weekGames = weekScores.length, weekPins, weekSeries, handicap = 20, highGame, highSeries}) {
    const pins = weekPins ?? weekScores.reduce((sum, score) => sum + score, 0);
    return {
        season,
        seasonKey,
        week,
        date,
        teamId: 24,
        teamName: "Pins Go Boom!",
        teamNumber: 24,
        games: week * Math.max(weekGames, 0),
        pins: pins * week,
        seasonAverage: weekGames > 0 ? pins / weekGames : null,
        weekGames,
        weekPins: weekGames > 0 ? pins : null,
        weekAverage: weekGames > 0 ? pins / weekGames : null,
        weekSeries,
        weekScores,
        handicap,
        highGame,
        highSeries,
    };
}

const history = [
    point({season:"Fall 2024",seasonKey:"2024-f",week:1,date:"2024-09-10",weekScores:[160,170,180],weekSeries:510,highGame:190,highSeries:510}),
    point({season:"Fall 2024",seasonKey:"2024-f",week:2,date:"2024-10-10",weekScores:[205,200,225],weekSeries:630,highGame:225,highSeries:630}),
    point({season:"Fall 2025",seasonKey:"2025-f",week:1,date:"2025-09-10",weekScores:[180,160,200],weekSeries:540,highGame:200,highSeries:540}),
    point({season:"Fall 2025",seasonKey:"2025-f",week:2,date:"2025-10-10",weekScores:[210,210,240],weekSeries:660,highGame:240,highSeries:660}),
    point({season:"Summer 2026",seasonKey:"2026-u",week:1,date:"2026-05-10",weekScores:[200,200,200],weekSeries:600,highGame:230,highSeries:600}),
    point({season:"Fall 2026",seasonKey:"2026-f",week:1,date:"2026-09-03",weekScores:[180,147,221],weekSeries:548,handicap:25,highGame:221,highSeries:548}),
    point({season:"Fall 2026",seasonKey:"2026-f",week:2,date:"2026-09-10",weekScores:[205,200,210],weekSeries:615,handicap:20,highGame:221,highSeries:615}),
    point({season:"Fall 2026",seasonKey:"2026-f",week:3,date:"2026-09-17",weekScores:[190,191,192],weekSeries:573,handicap:18,highGame:221,highSeries:615}),
];

test("timeframe filters use latest archive date and latest season", () => {
    assert.deepEqual(
        pointsForApiPlayerTimeframe(history, "this-season").map(p => p.date),
        ["2026-09-03", "2026-09-10", "2026-09-17"],
    );
    assert.deepEqual(
        pointsForApiPlayerTimeframe(history, "last-year").map(p => p.date),
        ["2025-10-10", "2026-05-10", "2026-09-03", "2026-09-10", "2026-09-17"],
    );
    assert.deepEqual(
        pointsForApiPlayerTimeframe(history, "last-2-years").map(p => p.date),
        ["2024-10-10", "2025-09-10", "2025-10-10", "2026-05-10", "2026-09-03", "2026-09-10", "2026-09-17"],
    );
    assert.equal(pointsForApiPlayerTimeframe(history, "career").length, history.length);
});

test("historical timeframe summary rebuilds every selectable player stat", () => {
    const fall2026 = pointsForApiPlayerTimeframe(history, "this-season");
    const summary = summarizeApiPlayerHistory(fall2026);
    assert.equal(summary.games, 9);
    assert.equal(summary.pinfall, 1736);
    assert.equal(Math.round(summary.average * 10) / 10, 192.9);
    assert.equal(summary.handicap, 18);
    assert.equal(summary.seriesCount, 3);
    assert.equal(Math.round(summary.averageSeries * 10) / 10, 578.7);
    assert.equal(summary.highGame, 221);
    assert.equal(summary.highSeries, 615);
    assert.equal(summary.highHandicapGame, 246);
    assert.equal(summary.highHandicapSeries, 675);
    assert.equal(summary.known200Games, 4);
    assert.equal(summary.known600Series, 1);
    assert.equal(summary.known700Series, 0);

    for (const option of API_PLAYER_PROGRESS_OPTIONS) {
        const progress = buildApiPlayerProgress(fall2026, option.value);
        assert.equal(progress.length, 3, option.label);
        assert.ok(progress.some(row => row.value != null), option.label);
    }
});

test("progress totals restart at the selected time frame boundary", () => {
    const selected = pointsForApiPlayerTimeframe(history, "last-year");
    const games = buildApiPlayerProgress(selected, "games");
    const pins = buildApiPlayerProgress(selected, "pinfall");
    assert.equal(games[0].value, 3);
    assert.equal(pins[0].value, 660);
    assert.equal(games.at(-1).value, 15);
    assert.equal(pins.at(-1).value, 2996);
});

test("average progress includes weekly and running values", () => {
    const fall2026 = pointsForApiPlayerTimeframe(history, "this-season");
    const rows = buildApiPlayerProgress(fall2026, "average");
    assert.equal(Math.round(rows[0].value * 10) / 10, 182.7);
    assert.equal(Math.round(rows[1].value * 10) / 10, 193.8);
    assert.equal(Math.round(rows[2].value * 10) / 10, 192.9);
    assert.equal(Math.round(rows[1].weeklyValue * 10) / 10, 205);
});

test("summary ignores absentee weeks with no scratch games", () => {
    const withAbsence = [
        ...history.slice(-2),
        point({season:"Fall 2026",seasonKey:"2026-f",week:4,date:"2026-09-24",weekScores:[],weekGames:0,weekPins:0,weekSeries:null,handicap:17,highGame:221,highSeries:615}),
    ];
    const summary = summarizeApiPlayerHistory(withAbsence);
    assert.equal(summary.games, 6);
    assert.equal(summary.pinfall, 1188);
    assert.equal(summary.seriesCount, 2);
    assert.equal(summary.handicap, 17);
    assert.equal(summary.known200Games, 3);
});
