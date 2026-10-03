const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');
const {renderToStaticMarkup} = require('react-dom/server');
const {MemoryRouter} = require('react-router');
const {JSDOM} = require('jsdom');
const moment = require('moment');
const load = require('./load-source.cjs');
const leagueApi = load('src/data/league/league-api.ts');
const playerApi = load('src/data/player/player-api.ts');
const model = load('src/data/league/league-matchup.ts');
const {TrackedLeagueTeam} = load('src/data/league/league-team-details.ts');
const {buildFullPlayerList, aggregatePlayerData} = load('src/data/player/player-aggregate.ts');
const {useIsNarrow, useBreakpoint} = load('src/pages/components/use-viewport.ts');
const LeagueTeamMatchup = load('src/pages/components/league/league-team-matchup.tsx').default;
const MatchupDetailsDisplay = load('src/pages/components/league/league-team-matchup-details.tsx').default;
const {BS_BP_XS, BS_BP_LG} = load('src/pages/components/ui-utils.tsx');

function makeTeam(id, date, scores, player = 'p') {
    const team = Object.assign(new TrackedLeagueTeam(), {
        id, name: id, number: 1, roster: [{id: player, name: 'Bowler'}],
    });
    const playerScore = Object.assign(new model.LeagueTeamPlayerScore(), {
        player, enteringAverage: 180,
        games: scores.map(score => Object.assign(new model.TeamPlayerGameScore(), {
            scratchScore: score, effectiveScratchScore: score,
        })),
    });
    playerScore.series.scratchScore = scores.reduce((sum, score) => sum + score, 0);
    playerScore.series.average = playerScore.series.scratchScore / scores.length;
    const teamScores = Object.assign(new model.LeagueTeamScore(), {
        playerScores: [playerScore], games: playerScore.games,
    });
    const matchup = Object.assign(new model.LeagueMatchup(), {
        week: 1, bowlDate: moment(date), scheduledDate: moment(date), lanes: [1, 2], scores: teamScores,
    });
    team.matchups = [matchup];
    return team;
}

test('aggregation preserves roster-only players, team and calendar boundaries, ratings, and latest dates', async t => {
    const teams = [
        makeTeam('first-team', '2025-12-31', [180, 200, 220]),
        makeTeam('second-team', '2026-01-07', [100, 120, 140]),
        makeTeam('roster-only-team', '2026-01-14', [150, 150, 150], 'new'),
    ];
    t.mock.method(playerApi, 'playerListFetcher', async () => ({players: [{id: 'p', name: 'p'}, {id: 'idle', name: 'Idle'}]}));
    t.mock.method(leagueApi, 'leagueInfoListFetcher', async () => ({seasons: [{season: '2025-26', leagues: [
        {id: 'league', name: 'League', dataLoc: 'league.json', hasData: () => true},
    ]}]}));
    t.mock.method(leagueApi, 'leagueDetailsFetcher', async () => ({teams}));

    const players = await buildFullPlayerList();
    assert.deepEqual(players.map(player => player.id), ['p', 'new', 'idle']);
    assert.deepEqual(players.warnings, []);
    const player = players[0];
    assert.equal(player.name, 'Bowler');
    assert.equal(player.games, 6);
    assert.equal(player.pinfall, 960);
    assert.equal(player.average, 160);
    assert.equal(player.ratingDelta, -20);
    assert.equal(player.ratingGameCount, 6);
    assert.equal(player.lastBowled.format('YYYY-MM-DD'), '2026-01-07');
    assert.deepEqual(player.appearanceSlices.map(slice => [slice.teamId, slice.games, slice.pinfall]), [
        ['first-team', 3, 600], ['second-team', 3, 360],
    ]);
    assert.deepEqual(player.calendarSlices.map(slice => [slice.season, slice.pinfall]), [['2025', 600], ['2026', 360]]);
    assert.deepEqual(player.weekSeries, [600, 360]);
    assert.equal(players[2].average, null);

    const detail = await aggregatePlayerData('p');
    assert.equal(detail.seasonStats[0].leagues, 1);
    assert.equal(detail.careerStats.gameStats.count, 6);
    assert.equal(detail.appearanceSlicesFull[0].calendarStats['2025'].pinfall, 600);
    assert.equal(detail.appearanceSlicesFull[1].calendarStats['2026'].pinfall, 360);
    await assert.rejects(aggregatePlayerData('unknown'), /Player not found/);
});

function mount(t) {
    const dom = new JSDOM('<div id="root"></div>', {pretendToBeVisual: true});
    const previous = {window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT};
    global.window = dom.window;
    global.document = dom.window.document;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = dom.window.document.getElementById('root');
    const root = createRoot(container);
    t.after(async () => {
        await act(async () => root.unmount());
        dom.window.close();
        global.window = previous.window;
        global.document = previous.document;
        global.IS_REACT_ACT_ENVIRONMENT = previous.act;
    });
    return {root, container, window: dom.window};
}

test('viewport hooks update across width changes and unsubscribe on query changes and unmount', async t => {
    const {root, container, window} = mount(t);
    const queries = new Map();
    window.matchMedia = query => {
        if (!queries.has(query)) queries.set(query, {
            matches: true, listeners: new Set(),
            addEventListener(_event, listener) { this.listeners.add(listener); },
            removeEventListener(_event, listener) { this.listeners.delete(listener); },
        });
        return queries.get(query);
    };
    window.innerWidth = 500;
    function Probe({maxWidth = 767}) {
        return React.createElement('span', null, `${useIsNarrow(maxWidth)}:${useBreakpoint().name}`);
    }
    await act(async () => root.render(React.createElement(Probe)));
    assert.equal(container.textContent, 'true:xs');
    const initial = queries.get('(max-width: 767px)');
    assert.equal(initial.listeners.size, 1);
    await act(async () => {
        initial.matches = false;
        initial.listeners.forEach(listener => listener());
        window.innerWidth = 1200;
        window.dispatchEvent(new window.Event('resize'));
    });
    assert.equal(container.textContent, 'false:xl');
    await act(async () => root.render(React.createElement(Probe, {maxWidth: 575})));
    assert.equal(initial.listeners.size, 0);
    assert.equal(container.textContent, 'true:xl');
    await act(async () => root.render(null));
    assert.equal(queries.get('(max-width: 575px)').listeners.size, 0);
});

test('frame details immediately reflect missing frame data and blind games', () => {
    const team = makeTeam('team', '2020-01-01', [150]);
    const props = {leagueDetails: null, teamDetails: team, matchup: team.matchups[0], currentBreakpoint: BS_BP_XS};
    const render = () => renderToStaticMarkup(React.createElement(MemoryRouter, null,
        React.createElement(MatchupDetailsDisplay, props)));
    assert.doesNotMatch(render(), /bls-player-frame-row/);
    team.matchups[0].scores.playerScores[0].games[0].blind = true;
    assert.match(render(), /bls-player-frame-row/);
});

test('matchup details reset when switching teams with the same week number', async t => {
    const {root, container, window} = mount(t);
    const render = teamDetails => React.createElement(MemoryRouter, null, React.createElement(LeagueTeamMatchup, {
        leagueDetails: null, teamDetails, currentBreakpoint: BS_BP_LG, leagueDetailsLoading: false,
    }));
    await act(async () => root.render(render(makeTeam('first', '2020-01-01', [180]))));
    const toggle = () => container.querySelector('.bls-details-toggle');
    assert.equal(toggle().textContent, 'Game Details');
    await act(async () => toggle().dispatchEvent(new window.MouseEvent('click', {bubbles: true})));
    assert.equal(toggle().textContent, 'Hide Game Details');
    await act(async () => root.render(render(makeTeam('second', '2020-01-01', [220]))));
    assert.equal(toggle().textContent, 'Game Details');
    assert.match(container.textContent, /second/);
    assert.doesNotMatch(container.textContent, /first/);
});
