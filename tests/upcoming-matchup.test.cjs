const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment');
const load = require('./load-source.cjs');
const {matchupSchedule} = load('src/pages/components/league/league-matchup-schedule.ts');

function matchup(date, options = {}) {
    return {
        scheduledDate: date ? moment(date, moment.ISO_8601, true) : undefined,
        scores: options.recorded ? {playerScores: [{}], games: []} : options.teamOnly ? {playerScores: [], games: [{}]} : undefined,
        bowlDate: options.bowlDate ? moment(options.bowlDate) : undefined,
    };
}

test('overdue unentered weeks do not displace the next scheduled matchup', () => {
    const latest = matchup('2026-10-22', {recorded: true});
    const overdueOct = matchup('2026-10-29');
    const overdueNov = matchup('2026-11-05');
    const next = matchup('2026-11-12');
    const input = [next, overdueNov, latest, overdueOct];
    const {nextMatchup, pendingMatchups, lastMatchup} = matchupSchedule(input, moment('2026-11-09T14:30'));
    assert.equal(nextMatchup, next);
    assert.deepEqual(pendingMatchups, [overdueOct, overdueNov]);
    assert.equal(lastMatchup, latest);
    assert.deepEqual(input, [next, overdueNov, latest, overdueOct], 'selection must not reorder source data');
});

test('today stays upcoming throughout the calendar day and becomes pending tomorrow', () => {
    const today = matchup('2026-11-12');
    assert.equal(matchupSchedule([today], moment('2026-11-12T23:59:59')).nextMatchup, today);
    assert.deepEqual(matchupSchedule([today], moment('2026-11-12T23:59:59')).pendingMatchups, []);
    assert.equal(matchupSchedule([today], moment('2026-11-13T00:00:00')).nextMatchup, null);
    assert.deepEqual(matchupSchedule([today], moment('2026-11-13T00:00:00')).pendingMatchups, [today]);
});

test('scored and prebowled future matchups are excluded from upcoming and pending', () => {
    const prebowled = matchup('2026-11-12', {recorded: true, bowlDate: '2026-11-08'});
    const teamTotalsOnly = matchup('2026-11-19', {teamOnly: true, bowlDate: '2026-11-07'});
    const next = matchup('2026-12-03');
    const result = matchupSchedule([teamTotalsOnly, next, prebowled], moment('2026-11-09'));
    assert.equal(result.nextMatchup, next);
    assert.deepEqual(result.pendingMatchups, []);
    assert.equal(result.lastMatchup, prebowled, 'latest results use actual bowl date when available');
});

test('finished seasons have no upcoming matchup, with overdue results reported separately', () => {
    const done = matchup('2026-10-22', {recorded: true});
    const overdue = matchup('2026-10-29');
    assert.equal(matchupSchedule([done], moment('2026-11-09')).nextMatchup, null);
    const result = matchupSchedule([done, overdue], moment('2026-11-09'));
    assert.equal(result.nextMatchup, null);
    assert.deepEqual(result.pendingMatchups, [overdue]);
    assert.equal(result.lastMatchup, done);
});

test('missing and invalid schedule dates cannot become next or pending', () => {
    const next = matchup('2026-11-12');
    const result = matchupSchedule([matchup(), matchup('not-a-date'), next], moment('2026-11-09'));
    assert.equal(result.nextMatchup, next);
    assert.deepEqual(result.pendingMatchups, []);
    assert.equal(result.lastMatchup, null);
    assert.deepEqual(matchupSchedule([], moment('2026-11-09')), {nextMatchup: null, pendingMatchups: [], lastMatchup: null});
});
