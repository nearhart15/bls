const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const load = require('./load-source.cjs');
const {leagueDetailsFetcher} = load('src/data/league/league-api.ts');

function fixture() {
  return {
    league: {
      id: '2627-test', name: 'Test League', season: '2026-27',
      'bowling-days': {'games-per-week': 3},
      'scoring-rules': {
        lineup: 1, roster: 1,
        hdcp: {type: 'PCT_AVG_TO_TGT', 'pct-avg-to-tgt-config': {target: 210, 'pct-to-target': 90}},
        'point-scoring': {
          'matchup-point-scoring-rule': 'PPG_PPS',
          'ppg-pps-matchup-point-scoring-config': {
            'points-per-game': 1, 'points-per-series': 1,
            'points-per-game-on-tie': 0.5, 'points-per-series-on-tie': 0.5,
          },
        },
      },
      teams: [{id: '2627-test-18', 'data-loc': 'team.json'}],
      'other-teams': [{id: '2627-test-24', number: 24, name: 'Known Opponent', division: '2'}],
    },
    team: {
      id: '2627-test-18', number: 18, name: 'Tracked Team', division: '1',
      roster: [{id: 'player-1', name: 'Bowler', status: 'REGULAR'}],
      matchups: [{
        week: 1, 'scheduled-date': '2026-09-03', 'bowl-date': '2026-09-03',
        'matchup-type': 'REGULAR-DIVISION', lanes: [1, 2],
        scores: {'player-scores': [{
          player: 'player-1', 'entering-average': 150,
          games: [100, 150, 200].map(score => ({'scratch-score': score})),
        }]},
        opponent: {
          'team-id': '2627-test-24', 'entering-rank': '5', hdcp: 10,
          scores: {games: [150, 180, 200].map(score => ({'scratch-score': score}))},
        },
      }],
    },
  };
}

function pendingRound(week = 14) {
  const date = week === 14 ? '2026-12-10' : '2026-12-17';
  return {
    week, 'scheduled-date': date, 'bowl-date': date,
    'matchup-type': 'POSITION-INTRA-DIVISION', 'entering-rank': 'PENDING',
    lanes: [0, 0], scores: {},
    opponent: {
      'team-id': 'PENDING', 'entering-rank': 'PENDING', hdcp: 0,
      vacant: false, absent: false, 'pre-post-bowl': false, scores: {},
    },
  };
}

async function fetchFixture(data) {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  global.window = {location: {href: 'http://localhost/bls/'}};
  global.fetch = async url => {
    const file = new URL(url).pathname.split('/').pop();
    const body = file === 'league.json' ? data.league : file === 'team.json' ? data.team : undefined;
    return new Response(JSON.stringify(body ?? {}), {status: body ? 200 : 404});
  };
  try {
    return await leagueDetailsFetcher('league.json');
  } finally {
    global.fetch = originalFetch;
    global.window = originalWindow;
  }
}

function recordedStatistics(league) {
  const team = league.teams[0];
  return JSON.parse(JSON.stringify({
    team: team.teamStats, points: team.pointsWonLost,
    player: team.roster[0].playerStats,
    recordedMatchup: team.matchups[0].scores,
    recordedOpponent: team.matchups[0].opponent.scores,
    recordedPoints: team.matchups[0].pointsWonLost,
    accolades: league.leagueAccolades,
  }));
}

test('empty known and PENDING scheduled matchups do not change recorded scores or points', async () => {
  const baseline = await fetchFixture(fixture());
  const data = fixture();
  const knownUpcoming = pendingRound();
  knownUpcoming.week = 13;
  knownUpcoming['scheduled-date'] = knownUpcoming['bowl-date'] = '2026-12-03';
  knownUpcoming.opponent['team-id'] = '2627-test-24';
  data.team.matchups.push(knownUpcoming, pendingRound(), pendingRound(15));
  const actual = await fetchFixture(data);
  assert.equal(actual.teams[0].matchups.length, 4);
  assert.deepEqual(baseline.teams[0].pointsWonLost, [3, 1]);
  assert.equal(baseline.teams[0].teamStats.lowSeries, 450);
  assert.deepEqual(recordedStatistics(actual), recordedStatistics(baseline));
  for (const matchup of actual.teams[0].matchups.slice(1)) {
    assert.deepEqual(matchup.pointsWonLost, [0, 0]);
    assert.equal(matchup.scores?.games.length ?? 0, 0);
    assert.equal(matchup.opponent.scores?.games.length ?? 0, 0);
  }
});

test('unknown concrete opponent IDs and any recorded PENDING games still reject', async () => {
  const unknown = fixture();
  const unknownRound = pendingRound();
  unknownRound.opponent['team-id'] = '2627-test-missing';
  unknown.team.matchups.push(unknownRound);
  await assert.rejects(fetchFixture(unknown), /Unknown opponent team/);

  for (const variant of ['player-games', 'team-games', 'opponent-games']) {
    const data = fixture();
    const round = pendingRound();
    if (variant === 'player-games') round.scores = structuredClone(data.team.matchups[0].scores);
    if (variant === 'team-games') round.scores = {games: [{'scratch-score': 0}]};
    if (variant === 'opponent-games') round.opponent.scores = {games: [{'scratch-score': 0}]};
    data.team.matchups.push(round);
    await assert.rejects(fetchFixture(data), /opponent|PENDING|pending/, variant);
  }
});

test('recorded zero-score games remain real games when empty schedules are normalized', async () => {
  const data = fixture();
  data.league['scoring-rules'].hdcp = {type: 'NONE'};
  const matchup = data.team.matchups[0];
  matchup.scores['player-scores'][0]['entering-average'] = 0;
  matchup.scores['player-scores'][0].games = [0, 0, 0].map(score => ({'scratch-score': score}));
  matchup.opponent.hdcp = 0;
  matchup.opponent.scores.games = [0, 0, 0].map(score => ({'scratch-score': score}));
  data.team.matchups.push(pendingRound());
  const league = await fetchFixture(data);
  const team = league.teams[0];
  assert.equal(team.roster[0].playerStats.gameStats.count, 3);
  assert.equal(team.matchups[0].scores.games.length, 3);
  assert.equal(team.matchups[0].opponent.scores.games.length, 3);
  assert.deepEqual(team.pointsWonLost, [2, 2]);
});

test('allowing pending opponents preserves player and score validation', async () => {
  const cases = [
    ['unknown player', data => {data.team.matchups[0].scores['player-scores'][0].player = 'missing';}, /Unknown or duplicate player/],
    ['duplicate player', data => {data.team.matchups[0].scores['player-scores'].push(structuredClone(data.team.matchups[0].scores['player-scores'][0]));}, /Unknown or duplicate player/],
    ['incomplete series', data => {data.team.matchups[0].scores['player-scores'][0].games.pop();}, /Incomplete matchup/],
    ['out-of-range game', data => {data.team.matchups[0].scores['player-scores'][0].games[0]['scratch-score'] = 301;}, /scratch score/],
    ['invalid frames', data => {data.team.matchups[0].scores['player-scores'][0].games[0].frames = [['87', '/']];}, /frame|ball/i],
  ];
  for (const [name, mutate, pattern] of cases) {
    const data = fixture();
    data.team.matchups.push(pendingRound());
    mutate(data);
    await assert.rejects(fetchFixture(data), pattern, name);
  }
});

test('opponent display resolves both tracked teams and other-team metadata', async () => {
  const {opponentDisplay} = load('src/data/league/opponent-display.ts');
  const league = await fetchFixture(fixture());
  assert.deepEqual(opponentDisplay(league, {teamId: '2627-test-18', enteringRank: '2'}), {
    name: 'Tracked Team', number: 18, division: '1', enteringRank: '2',
  });
  assert.deepEqual(opponentDisplay(league, {teamId: '2627-test-24', enteringRank: '5'}), {
    name: 'Known Opponent', number: 24, division: '2', enteringRank: '5',
  });
});

test('pending, missing, vacant and absent opponents have honest display labels', async () => {
  const {opponentDisplay} = load('src/data/league/opponent-display.ts');
  const league = await fetchFixture(fixture());
  const pending = opponentDisplay(league, {teamId: 'PENDING', enteringRank: 'PENDING'});
  assert.equal(pending.name, 'Opponent to be determined');
  assert.equal(pending.number, undefined);
  assert.equal(pending.enteringRank, undefined);
  for (const opponent of [undefined, {}, {teamId: ''}, {teamId: '2627-test-missing'}]) {
    const display = opponentDisplay(league, opponent);
    assert.ok(display.name.trim().length > 0);
    assert.equal(display.number, undefined);
    assert.doesNotMatch(display.name, /undefined|null/);
  }
  assert.ok(opponentDisplay(null, {teamId: '2627-test-24'}).name.trim().length > 0);
  const vacant = opponentDisplay(league, {vacant: true});
  assert.match(vacant.name, /vacant/i);
  assert.equal(vacant.number, undefined);
  const absent = opponentDisplay(league, {absent: true});
  assert.match(absent.name, /absent/i);
  assert.equal(absent.number, undefined);
  assert.equal(opponentDisplay(league, {teamId: '2627-test-24', absent: true}).name, 'Known Opponent');
  assert.equal(opponentDisplay(league, {teamId: '2627-test-24', enteringRank: 'PENDING'}).enteringRank, undefined);
});

test('opponent names remain plain text that React safely escapes', async () => {
  const {opponentDisplay} = load('src/data/league/opponent-display.ts');
  const data = fixture();
  const name = '<img src=x onerror=alert(1)> & Bowl';
  data.league['other-teams'][0].name = name;
  const league = await fetchFixture(data);
  const display = opponentDisplay(league, {teamId: '2627-test-24'});
  assert.equal(display.name, name);
  const html = renderToStaticMarkup(React.createElement('span', null, display.name));
  assert.equal(html, '<span>&lt;img src=x onerror=alert(1)&gt; &amp; Bowl</span>');
});
