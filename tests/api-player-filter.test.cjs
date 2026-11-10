const {createTestDom} = require('./dom-fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');
const {MemoryRouter} = require('react-router');

const load = require('./load-source.cjs');
const playerIndex = load('src/pages/components/player/use-player-index-data.ts');

test('API directory team selection filters players and All teams restores them', async t => {
    const {dom, restoreDom} = createTestDom({url: 'https://example.test', pretendToBeVisual: true});
    // Bootstrap captures DOM availability when its modules are first loaded.
    const {ApiPlayerList} = load('src/pages/components/player/api-player-screens.tsx');
    const data = [['Amy', 'Team A'], ['Ben', 'Team B'], ['Cal', 'Team A']].map(([name, team], index) => ({
        id: name, name, average: 200 - index, games: 3, pinfall: 600, highGame: 220, highSeries: 600,
        appearanceSlices: [{teamName: team}],
    }));
    t.mock.method(playerIndex, 'usePlayerIndexData', () => ({data, isLoading: false, error: null}));
    const container = dom.window.document.getElementById('root');
    const root = createRoot(container);
    const names = () => [...container.querySelectorAll('tbody tr td:nth-child(2)')].map(cell => cell.textContent);
    const click = async element => act(async () => element.click());
    try {
        await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(ApiPlayerList))));
        assert.deepEqual(names(), ['Amy', 'Ben', 'Cal']);
        await click(container.querySelector('.dropdown-toggle'));
        const team = container.querySelector('#api-team-team-a');
        assert.ok(team);
        await click(team);
        assert.equal(team.checked, true);
        assert.deepEqual(names(), ['Amy', 'Cal']);
        assert.equal(container.querySelector('.dropdown-toggle').textContent, 'Team A');
        await click([...container.querySelectorAll('.dropdown-item')].find(item => item.textContent === 'All teams'));
        assert.deepEqual(names(), ['Amy', 'Ben', 'Cal']);
        assert.equal(team.checked, false);
    } finally {
        await act(async () => root.unmount());
        restoreDom();
    }
});
