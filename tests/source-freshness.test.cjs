const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment');
const load = require('./load-source.cjs');
const {
    normalizeResultsDate, frameFreshness, latestFrameResults,
    recordFrameFreshness, recordApiFreshness, freshnessSnapshot, subscribeToFreshness,
} = load('src/data/utils/source-freshness.ts');

const played = (scheduled, bowled = scheduled) => ({
    scheduledDate: moment(scheduled), bowlDate: moment(bowled),
    scores: {playerScores: [{games: [{blind: false, vacant: false}]}]},
});

test('result dates retain their calendar day and reject invalid dates', () => {
    assert.equal(normalizeResultsDate('11/05/2026'), '2026-11-05');
    assert.equal(normalizeResultsDate('2024-02-29'), '2024-02-29');
    assert.equal(normalizeResultsDate('02/29/2026'), null);
    assert.equal(normalizeResultsDate('2026-13-01'), null);
    assert.equal(normalizeResultsDate('2026-11-07T17:49:27.866Z'), null);
    assert.equal(normalizeResultsDate(null), null);
});

test('frame coverage uses actual scored matchups and ignores future placeholders', () => {
    const league = {id: 'coverage-test', season: '2026 - 27', teams: [{id: 'pins', matchups: [
        played('2026-10-22'),
        played('2026-10-29', '2026-10-27'),
        {scheduledDate: moment('2026-11-12'), scores: {playerScores: []}},
        {scheduledDate: moment('2026-11-19')},
        {scheduledDate: moment('2026-11-26'), scores: {playerScores: [{games: [{blind: true, vacant: false}]}]}},
    ]}]};
    assert.deepEqual(frameFreshness(league), {resultsThrough: '2026-10-27', season: '2026 - 27'});
});

test('a historical team view does not borrow another team or season result date', () => {
    const league = {id: 'old-season', season: '2024 - 25', teams: [
        {id: 'pins', matchups: [played('2025-04-10')]},
        {id: 'hookers', matchups: [played('2025-04-17')]},
    ]};
    assert.equal(frameFreshness(league, 'pins').resultsThrough, '2025-04-10');
    assert.equal(frameFreshness(league).resultsThrough, '2025-04-17');
    assert.equal(frameFreshness(league, 'missing').resultsThrough, null);
    assert.equal(latestFrameResults({old: frameFreshness(league), current: {resultsThrough: '2026-10-29'}}), '2026-10-29');
});

test('loader freshness notifications are stable and API coverage uses sheet date, not import time', () => {
    let updates = 0;
    const unsubscribe = subscribeToFreshness(() => { updates++; });
    const league = {id: 'stable-loader-test', season: '2026 - 27', teams: [{id: 'pins', matchups: [played('2026-10-29')]}]};
    recordFrameFreshness(league);
    const first = freshnessSnapshot();
    recordFrameFreshness(league);
    assert.equal(freshnessSnapshot(), first);
    assert.equal(updates, 1);
    recordApiFreshness({status: 'ready', generatedAt: '2026-11-07T17:49:27.866Z', league: {date: '11/05/2026', season: 'Fall / Winter 2026–27'}});
    assert.equal(freshnessSnapshot().api.resultsThrough, '2026-11-05');
    const current = freshnessSnapshot();
    recordApiFreshness({status: 'pending', league: {date: '11/12/2026'}});
    assert.equal(freshnessSnapshot(), current);
    unsubscribe();
});
