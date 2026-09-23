const assert = require("node:assert/strict");
const test = require("node:test");
const load = require("./load-source.cjs");

const {
    pointsForApiPlayerTimeframe,
    summarizeApiPlayerHistory,
} = load("src/data/player/api-player-timeframe.ts");

function point({season, seasonKey, week, date, weekGames = 3, weekPins, weekSeries, highGame, highSeries}) {
    return {
        season,
        seasonKey,
        week,
        date,
        teamId: 24,
        teamName: "Pins Go Boom!",
        teamNumber: 24,
        games: week * 3,
        pins: weekPins * week,
        seasonAverage: weekPins / Math.max(1, weekGames),
        weekGames,
        weekPins,
        weekAverage: weekGames > 0 ? weekPins / weekGames : null,
        weekSeries,
        highGame,
        highSeries,
    };
}

const history = [
    point({season:"Fall 2024",seasonKey:"2024-f",week:1,date:"2024-09-10",weekPins:510,weekSeries:510,highGame:190,highSeries:510}),
    point({season:"Fall 2024",seasonKey:"2024-f",week:2,date:"2024-10-10",weekPins:630,weekSeries:630,highGame:225,highSeries:630}),
    point({season:"Fall 2025",seasonKey:"2025-f",week:1,date:"2025-09-10",weekPins:540,weekSeries:540,highGame:200,highSeries:540}),
    point({season:"Fall 2025",seasonKey:"2025-f",week:2,date:"2025-10-10",weekPins:660,weekSeries:660,highGame:240,highSeries:660}),
    point({season:"Summer 2026",seasonKey:"2026-u",week:1,date:"2026-05-10",weekPins:600,weekSeries:600,highGame:230,highSeries:600}),
    point({season:"Fall 2026",seasonKey:"2026-f",week:1,date:"2026-09-03",weekPins:548,weekSeries:548,highGame:221,highSeries:548}),
    point({season:"Fall 2026",seasonKey:"2026-f",week:2,date:"2026-09-10",weekPins:615,weekSeries:615,highGame:221,highSeries:615}),
    point({season:"Fall 2026",seasonKey:"2026-f",week:3,date:"2026-09-17",weekPins:573,weekSeries:573,highGame:221,highSeries:615}),
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

test("historical timeframe summary rebuilds scratch totals from weekly records", () => {
    const fall2026 = pointsForApiPlayerTimeframe(history, "this-season");
    const summary = summarizeApiPlayerHistory(fall2026);
    assert.equal(summary.games, 9);
    assert.equal(summary.pinfall, 1736);
    assert.equal(Math.round(summary.average * 10) / 10, 192.9);
    assert.equal(summary.seriesCount, 3);
    assert.equal(Math.round(summary.averageSeries * 10) / 10, 578.7);
    assert.equal(summary.highGame, 221);
    assert.equal(summary.highSeries, 615);
    assert.equal(summary.known600Series, 1);
    assert.equal(summary.known700Series, 0);
});

test("summary ignores absentee weeks with no scratch games", () => {
    const withAbsence = [
        ...history.slice(-2),
        point({season:"Fall 2026",seasonKey:"2026-f",week:4,date:"2026-09-24",weekGames:0,weekPins:0,weekSeries:null,highGame:221,highSeries:615}),
    ];
    const summary = summarizeApiPlayerHistory(withAbsence);
    assert.equal(summary.games, 6);
    assert.equal(summary.pinfall, 1188);
    assert.equal(summary.seriesCount, 2);
});
