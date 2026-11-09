const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');
const {MemoryRouter} = require('react-router');
const {JSDOM} = require('jsdom');
const load = require('./load-source.cjs');
const dataLoader = load('src/pages/components/cache/data-loader.tsx');
const PlayerList = load('src/pages/components/player/player-list.tsx').default;
const {ThemeProvider} = load('src/pages/components/theme.tsx');

test('phone sorting changes both cards and table without pinning favorites above the chosen metric', async t => {
    const dom = new JSDOM('<div id="root"></div>', {url: 'https://example.test', pretendToBeVisual: true});
    const previous = {window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT};
    global.window = dom.window;
    global.document = dom.window.document;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    dom.window.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
    const data = [
        {id: 'nick', name: 'Nick', average: 190, games: 18, pinfall: 3420, highGame: 270, highSeries: 650, games200: 7},
        {id: 'brian', name: 'Brian', average: 200, games: 21, pinfall: 4200, highGame: 250, highSeries: 690, games200: 12},
        {id: 'other', name: 'Aaron', average: 210, games: 24, pinfall: 5040, highGame: 260, highSeries: 710, games200: 13},
    ].map(player => ({...player, seasonSlices: [], calendarSlices: []}));
    t.mock.method(dataLoader, 'useCachedFetcher', () => ({data, isLoading: false, error: null}));
    const container = dom.window.document.getElementById('root');
    const root = createRoot(container);
    const cards = () => [...container.querySelectorAll('.bls-player-card-name')].map(element => element.textContent);
    const rows = () => [...container.querySelectorAll('tbody tr td:nth-child(2)')].map(element => element.textContent);
    const change = async (select, value) => act(async () => {
        select.value = value;
        select.dispatchEvent(new dom.window.Event('change', {bubbles: true}));
    });
    try {
        await act(async () => root.render(React.createElement(MemoryRouter, null,
            React.createElement(ThemeProvider, null,
                React.createElement(PlayerList, {defaultScope: 'career', lockScope: true, showTrend: false, showRating: false})
            )
        )));
        const [metric, direction] = container.querySelectorAll('.bls-player-mobile-sort select');
        assert.equal(metric.value, 'default');
        assert.equal(direction.disabled, true);
        assert.ok(container.querySelector(`label[for="${metric.id}"]`));
        await change(metric, 'games');
        assert.equal(direction.value, 'desc');
        assert.deepEqual(cards(), ['Aaron', 'Brian', 'Nick']);
        await change(metric, 'average');
        assert.deepEqual(cards(), ['Aaron', 'Brian', 'Nick']);
        assert.deepEqual(rows(), cards());
        await change(direction, 'asc');
        assert.deepEqual(cards(), ['Nick', 'Brian', 'Aaron']);
        assert.deepEqual(rows(), cards());
        await change(metric, 'highGame');
        assert.deepEqual(cards(), ['Nick', 'Aaron', 'Brian']);
        await change(metric, 'games');
        assert.deepEqual(cards(), ['Aaron', 'Brian', 'Nick']);
        await change(metric, 'name');
        assert.deepEqual(cards(), ['Aaron', 'Brian', 'Nick']);
        assert.equal(direction.value, 'asc');
        await change(metric, 'default');
        assert.equal(direction.disabled, true);
        assert.equal(cards()[0], 'Nick');
        assert.deepEqual(rows(), cards());
    } finally {
        await act(async () => root.unmount());
        dom.window.close();
        global.window = previous.window;
        global.document = previous.document;
        global.IS_REACT_ACT_ENVIRONMENT = previous.act;
    }
});
