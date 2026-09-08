const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const {PlayerStats} = load('src/data/player/player-stats.ts');
const {TeamPlayerGameScore, LeagueTeamPlayerScore} = load('src/data/league/league-matchup.ts');
const {convertScore} = load('src/data/utils/bowling-input.ts');
const {calculatePlayerScores} = load('src/data/league/league-calculators.ts');
const {calculatePlayerStats} = load('src/data/player/player-stats-calculator.ts');

function math() {
  return load('src/data/player/handicap-guide-math.ts');
}

function framedGame(raw) {
  const game = Object.assign(new TeamPlayerGameScore(), {inFrames: convertScore(raw)});
  const playerScore = Object.assign(new LeagueTeamPlayerScore(), {games: [game]});
  calculatePlayerScores(playerScore, {calculateHandicap: () => 0}, {});
  return game;
}

function statsFor(games) {
  const stats = new PlayerStats();
  calculatePlayerStats([games], stats);
  return stats;
}

test('guide handicaps follow the league whole-average and whole-handicap rule', () => {
  const {handicapForAverage} = math();
  for (const [average, expected] of [
    [191.8, 17], [139.8, 63], [88.67, 109], [0, 189],
    [170, 36], [110, 90], [100, 99], [209, 0], [210, 0], [300, 0],
  ]) {
    assert.equal(handicapForAverage(average), expected, `average ${average}`);
  }
  assert.equal(handicapForAverage(139.8), handicapForAverage(140),
    'different averages can legitimately produce the same integer handicap');
});

test('every selectable whole handicap round-trips through its representative average', () => {
  const {MAX_HANDICAP, normalizeHandicap, handicapForAverage, averageForHandicap} = math();
  assert.equal(MAX_HANDICAP, 189);
  for (let handicap = 0; handicap <= MAX_HANDICAP; handicap++) {
    const average = averageForHandicap(handicap);
    assert.ok(Number.isInteger(average));
    assert.ok(average >= 0 && average <= 210);
    assert.equal(handicapForAverage(average), handicap, `handicap ${handicap}`);
    assert.equal(normalizeHandicap(handicap), handicap);
  }
  assert.equal(averageForHandicap(0), 210);
  assert.equal(averageForHandicap(189), 0);
});

test('slider values stay finite, whole and in range including selected low-average bowlers', () => {
  const {MAX_HANDICAP, normalizeHandicap, handicapForAverage} = math();
  for (const value of [NaN, Infinity, -Infinity]) assert.equal(normalizeHandicap(value), 0);
  assert.equal(normalizeHandicap(-10), 0);
  assert.equal(normalizeHandicap(200), MAX_HANDICAP);
  assert.equal(normalizeHandicap(17.49), 17);
  assert.equal(normalizeHandicap(17.5), 18);
  for (let average = 0; average <= 300; average += 0.25) {
    const selected = normalizeHandicap(handicapForAverage(average));
    assert.ok(Number.isInteger(selected));
    assert.ok(selected >= 0 && selected <= MAX_HANDICAP);
  }
  assert.equal(normalizeHandicap(handicapForAverage(88.67)), 109);
  assert.equal(normalizeHandicap(handicapForAverage(0)), 189);
});

test('projected scoring totals are internally consistent at ordinary and endpoint handicaps', () => {
  const {predictHandicapStats} = math();
  for (const [handicap, expected] of [
    [0, {hdcp: 0, avg: 210, hdcpGame: 210, series: 630, hdcpSeries: 630, pinfallFrame: 21}],
    [17, {hdcp: 17, avg: 191, hdcpGame: 208, series: 573, hdcpSeries: 624, pinfallFrame: 19.1}],
    [36, {hdcp: 36, avg: 170, hdcpGame: 206, series: 510, hdcpSeries: 618, pinfallFrame: 17}],
    [189, {hdcp: 189, avg: 0, hdcpGame: 189, series: 0, hdcpSeries: 567, pinfallFrame: 0}],
  ]) {
    const actual = predictHandicapStats(handicap);
    for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value, `${handicap}: ${key}`);
  }
  assert.equal(predictHandicapStats(17.5).hdcp, 18);
  assert.equal(predictHandicapStats(1000).hdcp, 189);
});

test('unsupported low-average estimates and unreachable pace milestones are unavailable', () => {
  const {predictHandicapStats} = math();
  const low = predictHandicapStats(109);
  assert.equal(low.avg, 88);
  for (const key of [
    'strike', 'spare', 'single', 'open', 'split', 'firstBall', 'clean',
    'hung', 'turkey', 'twoHundred', 'threeHundred', 'sixHundred',
    'sd', 'highGame', 'marksGame', 'ballsGame',
    'frames50', 'balls50', 'frames100', 'balls100',
    'frames150', 'balls150', 'frames200', 'balls200',
  ]) assert.equal(low[key], undefined, key);

  const average150 = predictHandicapStats(54);
  assert.equal(average150.avg, 150);
  assert.equal(average150.frames150, 10);
  assert.equal(average150.frames200, undefined);
  assert.equal(average150.balls200, undefined);
  assert.equal(average150.hung, 0.18);
  assert.equal(average150.turkey, 0.04);
});

test('zero observed statistics remain visible while missing observations remain unavailable', () => {
  const {actualHandicapStats} = math();
  const empty = actualHandicapStats(new PlayerStats());
  for (const key of ['avg', 'hdcp', 'sd', 'highGame', 'firstBall', 'ballsGame', 'clean', 'hung', 'turkey']) {
    assert.equal(empty[key], undefined, key);
  }
  const zeros = actualHandicapStats(statsFor([framedGame('--'.repeat(10))]));
  assert.equal(zeros.avg, 0);
  assert.equal(zeros.hdcp, 189);
  assert.equal(zeros.sd, 0);
  assert.equal(zeros.highGame, 0);
  assert.equal(zeros.firstBall, 0);
  assert.equal(zeros.clean, 0);
  assert.equal(zeros.hung, 0);
  assert.equal(zeros.turkey, 0);
  assert.equal(zeros.ballsGame, 20);

  const scoreOnly = actualHandicapStats(statsFor([
    Object.assign(new TeamPlayerGameScore(), {scratchScore: 150}),
  ]));
  assert.equal(scoreOnly.avg, 150);
  assert.equal(scoreOnly.sd, 0);
  assert.equal(scoreOnly.highGame, 150);
  for (const key of ['firstBall', 'ballsGame', 'strike', 'spare', 'open', 'clean', 'hung', 'turkey']) {
    assert.equal(scoreOnly[key], undefined, key);
  }
});

test('observed balls and event rates use frame-covered games rather than all scored games', () => {
  const {actualHandicapStats} = math();
  const stats = statsFor([
    framedGame('X'.repeat(12)),
    Object.assign(new TeamPlayerGameScore(), {scratchScore: 150}),
  ]);
  stats.hungCount = 1;
  stats.turkeyCount = 1;
  assert.equal(stats.gameStats.count, 2);
  assert.equal(stats.firstBallCount, 10);
  const actual = actualHandicapStats(stats);
  assert.equal(actual.avg, 225);
  assert.equal(actual.hdcp, 0);
  assert.equal(actual.highGame, 300);
  assert.equal(actual.clean, 100);
  assert.equal(actual.ballsGame, 12);
  assert.equal(actual.hung, 1);
  assert.equal(actual.turkey, 1);
  assert.equal(actual.games, 2);
  assert.equal(actual.completeSeries, 1);
  assert.equal(actual.frameGames, 1);
  assert.equal(actual.frameCoverage, 50);
  assert.equal(actual.lowGame, 150);
  assert.equal(actual.highGame, 300);
  assert.equal(actual.lowSeries, 450);
  assert.equal(actual.highSeries, 450);
  assert.equal(actual.gameOneAverage, 300);
  assert.equal(actual.gameTwoAverage, 150);
});

test('a tenth-frame strike stays closed and clean when its fill balls miss pins', () => {
  const game = framedGame('X'.repeat(10) + '9-');
  const stats = statsFor([game]);
  assert.equal(game.scratchScore, 288);
  assert.equal(stats.cleanGames, 1);
  assert.equal(stats.opens.numerator, 0);
  assert.equal(stats.opens.denominator, 10);
});

test('vacant lineup slots do not suppress hung-frame tracking', () => {
  const {setCrossPlayerFrameAttributes} = load('src/data/league/league-calculators.ts');
  const strikeGame = framedGame('X'.repeat(12));
  const hungGame = framedGame('--'.repeat(10));
  const vacantGame = Object.assign(new TeamPlayerGameScore(), {vacant: true});
  const matchup = {
    scores: {
      games: [{}],
      playerScores: [strikeGame, hungGame, vacantGame].map(game => ({games: [game]})),
    },
  };
  setCrossPlayerFrameAttributes(matchup);
  assert.equal(hungGame.frames.filter(frame => frame.attributes.includes('Hung')).length, 10);
});
