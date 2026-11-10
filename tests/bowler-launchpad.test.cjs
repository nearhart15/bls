const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const {findBowlers, bowlerTeamNames, currentBowlerSeason, bowlerSeasonPreview} = load('src/pages/components/home/bowler-launchpad-data.ts');

function player(id, name, teams = [], seasonSlices = []) {
    return {id, name, appearanceSlices: teams.map(teamName => ({teamName})), seasonSlices};
}

function season(season, games, average, highGame = 220, highSeries = 600) {
    return {season, games, average, highGame, highSeries, pinfall: games * average, games200: 0};
}

test('bowler finder matches accent-insensitive words across name and team context', () => {
    const entries = [player('j', 'José O’Neill', ['Pins Go Boom!']), player('s', 'Sam', ['Other Team'])];
    assert.deepEqual(findBowlers(entries, ' JOSE boom '), [entries[0]]);
    assert.deepEqual(findBowlers(entries, "o'neill PINS"), [entries[0]]);
    assert.deepEqual(findBowlers(entries, 'jose other'), []);
});

test('bowler finder favors exact names over prefixes and team-only matches without mutating data', () => {
    const entries = [player('team', 'Alex', ['Nick Supporters']), player('prefix', 'Nick Smith'), player('exact', 'Nick')];
    assert.deepEqual(findBowlers(entries, 'nick').map(p => p.id), ['exact', 'prefix', 'team']);
    assert.deepEqual(entries.map(p => p.id), ['team', 'prefix', 'exact']);
    assert.deepEqual(findBowlers(entries, '').map(p => p.id), ['exact', 'prefix', 'team']);
});

test('team context preserves distinct teams while removing duplicate and empty labels', () => {
    assert.deepEqual(bowlerTeamNames(player('p', 'Pat', [' Pins Go Boom! ', 'Pins Go Boom!', '', 'Hookers and Bowl'])), ['Pins Go Boom!', 'Hookers and Bowl']);
    const bowler = {...player('p', 'Pat'), appearanceSlices: [{teamName: 'Old Team', season: '2025'}, {teamName: 'Current Team', season: '2026'}]};
    assert.deepEqual(bowlerTeamNames(bowler, '2026'), ['Current Team']);
});

test('preview combines only the latest shared season, weighted by games', () => {
    const entries = [player('a', 'Amy', [], [season('2025 - 26', 30, 200), season('2026 - 27', 3, 180, 230, 610), season('2026 - 27', 6, 210, 240, 650)]), player('b', 'Ben', [], [season('2027 - 28', 3, 150)])];
    assert.equal(currentBowlerSeason(entries), '2027 - 28');
    assert.deepEqual(bowlerSeasonPreview(entries[0], '2026 - 27'), {average: 200, games: 9, highGame: 240, highSeries: 650});
    assert.deepEqual(bowlerSeasonPreview(entries[0], currentBowlerSeason(entries)), {average: null, games: 0, highGame: 0, highSeries: 0});
});

test('empty data has no selected season and no invented statistics', () => {
    assert.equal(currentBowlerSeason([]), undefined);
    assert.deepEqual(findBowlers([], 'nick'), []);
    assert.deepEqual(bowlerSeasonPreview(player('p', 'Pat'), undefined), {average: null, games: 0, highGame: 0, highSeries: 0});
});
