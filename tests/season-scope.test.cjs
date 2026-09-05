const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const {availableSeasons, slicesForSeason} = load('src/data/player/season-scope.ts');

test('last season is the previous distinct season across all bowlers', () => {
    const entries = [
        {seasonSlices: [{season:'2024 - 25'}, {season:'2026 - 27'}]},
        {seasonSlices: [{season:'2025 - 26', games:12}, {season:'2026 - 27', games:3}]},
    ];
    const seasons = availableSeasons(entries);
    assert.deepEqual(seasons, ['2026 - 27', '2025 - 26', '2024 - 25']);
    assert.deepEqual(slicesForSeason(entries[0].seasonSlices, seasons[1]), []);
    assert.deepEqual(slicesForSeason(entries[1].seasonSlices, seasons[1]), [{season:'2025 - 26', games:12}]);
});

test('empty or single-season data has no last season', () => {
    assert.deepEqual(availableSeasons([]), []);
    const entries = [{seasonSlices:[{season:'2026 - 27'}]}];
    assert.deepEqual(slicesForSeason(entries[0].seasonSlices, availableSeasons(entries)[1]), []);
});
