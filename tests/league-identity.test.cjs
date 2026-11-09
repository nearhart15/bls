const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment');
const load = require('./load-source.cjs');
const {reconcileLeagueMetadata} = load('src/data/league/league-metadata.ts');
const {matchupComparisonUrl, apiComparisonIssue} = load('src/data/league/league-comparison.ts');
const {leagueDetailsFetcher} = load('src/data/league/league-api.ts');

function leagueFixture(id = '2627-fall-beer') {
  return {
    id,
    bowlingDays: {startDate: moment('2025-09-03')},
    teams: [
      {id: `${id}-18`, number: 18, name: 'Pins Go Boom!', matchups: [{week: 1, scheduledDate: moment('2026-09-03'), bowlDate: moment('2026-08-30')}, {week: 10, scheduledDate: moment('2026-11-05')}]},
      {id: `${id}-23`, number: 23, name: 'Hookers & Bowl', matchups: [{week: 1, scheduledDate: moment('2026-09-03')}, {week: 10, scheduledDate: moment('2026-11-05')}]},
    ],
    otherTeams: [{id: `${id}-24`, number: 24, name: 'Pin N Juice'}],
  };
}

test('index identity and unanimous scheduled week one correct copied metadata without using pre-bowl dates', () => {
  const league = leagueFixture();
  league.id = '2627-summer-beer';
  reconcileLeagueMetadata(league, '2627-fall-beer');
  assert.equal(league.id, '2627-fall-beer');
  assert.equal(league.bowlingDays.startDate.format('YYYY-MM-DD'), '2026-09-03');
  assert.notEqual(league.bowlingDays.startDate, league.teams[0].matchups[0].scheduledDate);
  const url = new URL(matchupComparisonUrl(league, league.teams[0], {opponent: {teamId: '2627-fall-beer-23'}}), 'https://example.test');
  assert.equal(url.searchParams.get('league'), '2627-fall-beer');
  assert.equal(url.searchParams.get('source'), 'frame');
  assert.equal(url.searchParams.get('a'), '2627-fall-beer-18');
  assert.equal(url.searchParams.get('b'), '2627-fall-beer-23');
});

test('a different league document is rejected instead of relabelled', () => {
  const league = leagueFixture('2526-summer-beer');
  assert.throws(() => reconcileLeagueMetadata(league, '2627-fall-beer'), /does not match/);
  assert.equal(league.id, '2526-summer-beer');
});

test('missing, duplicate or conflicting week-one dates never invent a corrected start date', () => {
  for (const mutate of [
    league => { league.teams[1].matchups = []; },
    league => { league.teams[1].matchups[0].scheduledDate = undefined; },
    league => { league.teams[1].matchups[0].scheduledDate = moment('2026-09-10'); },
    league => { league.teams[0].matchups.push({...league.teams[0].matchups[0]}); },
  ]) {
    const league = leagueFixture();
    mutate(league);
    reconcileLeagueMetadata(league, league.id);
    assert.equal(league.bowlingDays.startDate.format('YYYY-MM-DD'), '2025-09-03');
  }
});

test('untracked-opponent comparison links retain their originating league', () => {
  const league = leagueFixture('2526-fall-beer');
  const url = new URL(matchupComparisonUrl(league, league.teams[0], {opponent: {teamId: '2526-fall-beer-24'}}), 'https://example.test');
  assert.equal(url.searchParams.get('source'), 'api');
  assert.equal(url.searchParams.get('league'), '2526-fall-beer');
  assert.equal(url.searchParams.get('a'), '18');
  assert.equal(url.searchParams.get('b'), '24');
  assert.equal(matchupComparisonUrl(league, league.teams[0], {opponent: {teamId: 'PENDING'}}), null);
  assert.equal(matchupComparisonUrl(league, league.teams[0], {opponent: {teamId: '2526-fall-beer-24', vacant: true}}), null);
});

test('historical team numbers cannot resolve to current teams or current statistics', () => {
  const historical = leagueFixture('2526-fall-beer');
  for (const team of historical.teams) for (const matchup of team.matchups) matchup.scheduledDate.subtract(1, 'year');
  historical.teams[0].number = 23;
  historical.otherTeams[0].name = 'Keep It 100';
  const sheet = {league: {date: '11/05/2026'}, standings: [{number: 23, name: 'Hookers & Bowl'}, {number: 24, name: 'Pin N Juice'}]};
  assert.match(apiComparisonIssue(sheet, historical, ...sheet.standings), /not covered/);
});

test('current API comparisons require both matching schedule and matching team identities', () => {
  const league = leagueFixture();
  const sheet = {league: {date: '11/05/2026'}, standings: [{number: 23, name: 'Hookers and Bowl'}, {number: 24, name: 'Pin N Juice'}]};
  assert.equal(apiComparisonIssue(sheet, league, ...sheet.standings), null);
  assert.match(apiComparisonIssue(sheet, league, {number: 23, name: 'Unrelated Team'}, sheet.standings[1]), /do not match/);
  assert.match(apiComparisonIssue(sheet, league, undefined, sheet.standings[1]), /do not match/);
  assert.match(apiComparisonIssue({...sheet, league: {date: 'invalid'}}, league, ...sheet.standings), /not covered/);
});

test('league fetcher applies index identity before returning loaded schedules', async () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  global.window = {location: {href: 'http://localhost/bls/'}};
  const data = {
    id: '2627-summer-beer', name: 'Fall League', season: '2026-27',
    'bowling-days': {'games-per-week': 3, 'start-date': '2025-09-03'},
    'scoring-rules': {lineup: 1, roster: 1, hdcp: {type: 'NONE'}},
    teams: [{id: '2627-fall-beer-18', number: 18, name: 'Pins Go Boom!', matchups: [
      {week: 1, 'scheduled-date': '2026-09-03', 'matchup-type': 'REGULAR-DIVISION', lanes: [1, 2]},
    ]}],
  };
  global.fetch = async () => new Response(JSON.stringify(data), {headers: {'content-type': 'application/json'}});
  try {
    const actual = await leagueDetailsFetcher('league.json', '2627-fall-beer');
    assert.equal(actual.id, '2627-fall-beer');
    assert.equal(actual.bowlingDays.startDate.format('YYYY-MM-DD'), '2026-09-03');
  } finally {
    global.fetch = originalFetch;
    global.window = originalWindow;
  }
});
