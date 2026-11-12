const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {MemoryRouter} = require('react-router');
const {JSDOM} = require('jsdom');
const moment = require('moment');
const load = require('./load-source.cjs');
const TeamMatchNight = load('src/pages/components/league/team-match-night.tsx').default;
const {TrackedLeagueTeam} = load('src/data/league/league-team-details.ts');
const {LeagueDetails} = load('src/data/league/league-details.ts');
const {LeagueMatchup, LeagueTeamScore, OpponentTeam, OpponentTeamScore, MatchupGameScore} = load('src/data/league/league-matchup.ts');

function fixture(matchups) {
    const team = new TrackedLeagueTeam();
    Object.assign(team, {id: 'team-a', number: 18, name: 'Pins Go Boom!', matchups});
    const league = new LeagueDetails();
    Object.assign(league, {id: 'fall-2026', name: 'Fall League', teams: [team]});
    return {team, league};
}

function render(props) {
    const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(TeamMatchNight, props)));
    return new JSDOM(markup);
}

test('team briefing preserves recorded zero totals without presenting uncomputed points as a result', t => {
    t.mock.method(moment, 'now', () => Date.parse('2026-11-12T12:00:00Z'));
    const match = new LeagueMatchup();
    Object.assign(match, {week: 8, scheduledDate: moment('2026-10-22'), bowlDate: moment('2026-10-22'), scores: new LeagueTeamScore(), opponent: new OpponentTeam()});
    match.scores.games = [new MatchupGameScore()];
    const props = fixture([match]);
    let dom = render(props);
    try {
        const result = dom.window.document.querySelector('.bls-match-night-result');
        assert.match(result.textContent, /Points not yet available/);
        assert.doesNotMatch(result.textContent, /Points won \/ lost/);
        assert.deepEqual([...result.querySelectorAll('dd')].map(el => el.textContent), ['0', '0']);
    } finally { dom.window.close(); }
    match.opponent.scores = new OpponentTeamScore();
    match.opponent.scores.games = [new MatchupGameScore()];
    dom = render(props);
    try {
        const result = dom.window.document.querySelector('.bls-match-night-result');
        assert.match(result.textContent, /0 \/ 0Points won \/ lost/);
        assert.doesNotMatch(result.textContent, /Points not yet available/);
    } finally { dom.window.close(); }
});

test('team briefing distinguishes missing schedules, overdue results, and unassigned upcoming lanes', t => {
    t.mock.method(moment, 'now', () => Date.parse('2026-11-12T12:00:00Z'));
    const props = fixture([]);
    let dom = render(props);
    try {
        assert.match(dom.window.document.body.textContent, /No matchups are posted yet/);
        assert.equal(dom.window.document.querySelector('.bls-match-night-jump'), null);
    } finally { dom.window.close(); }
    const overdue = new LeagueMatchup();
    Object.assign(overdue, {week: 9, scheduledDate: moment('2026-10-29')});
    props.team.matchups = [overdue];
    dom = render(props);
    try {
        assert.match(dom.window.document.body.textContent, /No upcoming matchups scheduled/);
        assert.match(dom.window.document.body.textContent, /1 matchup awaiting results/);
        assert.doesNotMatch(dom.window.document.body.textContent, /No matchups are posted yet/);
        assert.ok(dom.window.document.querySelector('.bls-match-night-jump'));
    } finally { dom.window.close(); }
    const next = new LeagueMatchup();
    Object.assign(next, {week: 11, scheduledDate: moment('2026-11-12'), lanes: [0, 0]});
    props.team.matchups.push(next);
    dom = render(props);
    try {
        assert.match(dom.window.document.querySelector('.bls-match-night-fixture').textContent, /Up next/);
        assert.match(dom.window.document.querySelector('.bls-match-night-lanes').textContent, /To be assigned/);
        assert.match(dom.window.document.body.textContent, /Opponent to be determined/);
        assert.equal(dom.window.document.querySelector('.bls-match-night-opponent a'), null);
    } finally { dom.window.close(); }
});
