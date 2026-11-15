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
    return {team, league, leagueOngoing: true};
}

function render(props) {
    const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(TeamMatchNight, props)));
    return new JSDOM(markup);
}

test('team briefing shows recorded points without displaying pin totals', t => {
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
        assert.doesNotMatch(result.textContent, /Credited scratch|With handicap/);
    } finally { dom.window.close(); }
    match.opponent.scores = new OpponentTeamScore();
    match.opponent.scores.games = [new MatchupGameScore()];
    dom = render(props);
    try {
        const result = dom.window.document.querySelector('.bls-match-night-result');
        assert.match(result.textContent, /0 \/ 0Points won \/ lost/);
        assert.doesNotMatch(result.textContent, /Points not yet available/);
        assert.doesNotMatch(result.textContent, /Credited scratch|With handicap/);
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
        assert.equal(dom.window.document.querySelector('.bls-match-night-fixture a'), null);
    } finally { dom.window.close(); }
});

test('pending frame rank uses the dated division standing for the same team and season', t => {
    const cache = load('src/pages/components/cache/data-loader.tsx');
    const {beerSheetFetcher} = load('src/data/league/beer-sheet.ts');
    const sheet = {
        league: {date: '11/05/2026'},
        standings: [{number: 18, name: 'Pins Go Boom!', place: 3, division: 'Tastes Great!'}],
    };
    const fetcher = t.mock.method(cache, 'useCachedFetcher', fetch => {
        assert.equal(fetch, beerSheetFetcher);
        return {data: sheet};
    });
    const match = new LeagueMatchup();
    match.scheduledDate = moment('2026-11-05');
    const props = fixture([match]);
    props.team.currentRank = 'PENDING';
    props.league.completed = true;

    function displayedRank(rankNote) {
        const dom = render(props);
        try {
            const value = dom.window.document.querySelector('.bls-match-night-standing > div:nth-child(2) dd');
            assert.equal(value.querySelector('.visually-hidden')?.textContent, rankNote);
            value.querySelector('.visually-hidden')?.remove();
            return value.textContent.trim();
        } finally {
            dom.window.close();
        }
    }

    assert.equal(displayedRank(' in Tastes Great! division as of Nov 5, 2026'), '3');
    sheet.standings[0].name = 'Another team';
    assert.equal(displayedRank(), '—');
    sheet.standings[0].name = 'Pins Go Boom!';
    match.scheduledDate = moment('2025-11-06');
    assert.equal(displayedRank(), '—');
    match.scheduledDate = moment('2026-11-05');
    props.leagueOngoing = false;
    assert.equal(displayedRank(), '—');
    props.team.currentRank = '2';
    assert.equal(displayedRank(), '2');
    assert.equal(fetcher.mock.callCount(), 3);
});

test('scoreboard shows every week on demand and returns to the selected week', async () => {
    const {createTestDom} = require('./dom-fixture.cjs');
    const {createRoot} = require('react-dom/client');
    const Scoreboard = load('src/pages/components/league/league-team-matchup.tsx').default;
    const {dom, restoreDom} = createTestDom();
    dom.window.scrollTo = () => {};
    const container = dom.window.document.getElementById('root');
    const root = createRoot(container);
    const {team, league} = fixture([1, 2, 3].map(week => Object.assign(new LeagueMatchup(), {
        week, scheduledDate: moment().startOf('day').add(week - 2, 'days'),
    })));
    const cards = () => [...container.querySelectorAll('.bls-matchup-week-header')]
        .map(header => header.firstElementChild.firstElementChild.textContent);
    const click = async button => React.act(async () => button.click());
    try {
        await React.act(async () => root.render(React.createElement(MemoryRouter, null,
            React.createElement(Scoreboard, {teamDetails: team, leagueDetails: league}))));
        assert.deepEqual(cards(), ['WK 02']);
        await click(container.querySelector('.bls-scoreboard-weeks button'));
        assert.deepEqual(cards(), ['WK 01']);
        await click(container.querySelector('.bls-scoreboard-actions button'));
        assert.deepEqual(cards(), ['WK 01', 'WK 02', 'WK 03']);
        await click(container.querySelector('.bls-scoreboard-actions button'));
        assert.deepEqual(cards(), ['WK 01']);
    } finally {
        await React.act(async () => root.unmount());
        restoreDom();
    }
});
