const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createTestDom} = require('./dom-fixture.cjs');
const load = require('./load-source.cjs');
const playerIndex = load('src/pages/components/player/use-player-index-data.ts');

function bowler(id, name, team) {
    const slice = {season: '2026 - 27', average: 190, games: 6, pinfall: 1140, highGame: 240, highSeries: 630, games200: 2};
    return {id, name, appearanceSlices: [{...slice, teamName: team}], seasonSlices: [slice]};
}

async function fixture(t, getResult) {
    const {dom, restoreDom} = createTestDom({url: 'https://example.test', pretendToBeVisual: true});
    const previousStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');
    Object.defineProperty(global, 'localStorage', {configurable: true, value: dom.window.localStorage});
    const {createRoot} = require('react-dom/client');
    const {MemoryRouter} = require('react-router');
    const {DataSourceProvider, useDataSource} = load('src/pages/components/data-source.tsx');
    const BowlerLaunchpad = load('src/pages/components/home/bowler-launchpad.tsx').default;
    t.mock.method(playerIndex, 'usePlayerIndexData', source => getResult(source));
    const container = dom.window.document.getElementById('root');
    let root;
    function Harness() {
        const {setSource} = useDataSource();
        return React.createElement(React.Fragment, null,
            React.createElement('button', {id: 'use-api', onClick: () => setSource('api')}, 'Use API'),
            React.createElement('button', {id: 'use-frame', onClick: () => setSource('frame')}, 'Use frame'),
            React.createElement(BowlerLaunchpad));
    }
    const render = async () => act(async () => {
        root ??= createRoot(container);
        root.render(React.createElement(MemoryRouter, null, React.createElement(DataSourceProvider, null, React.createElement(Harness))));
    });
    const unmount = async () => act(async () => { root?.unmount(); root = null; });
    t.after(async () => {
        await unmount();
        if (previousStorage) Object.defineProperty(global, 'localStorage', previousStorage);
        else delete global.localStorage;
        restoreDom();
    });
    await render();
    return {
        dom, container, render, unmount,
        click: async element => act(async () => element.click()),
        choices: () => [...container.querySelectorAll('.bls-bowler-choice')],
        profile: () => container.querySelector('.bls-bowler-profile'),
        search: async value => act(async () => {
            const input = container.querySelector('input[type="search"]');
            Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
            input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
        }),
    };
}

test('bowler selection persists per source and returns after remount without leaking across sources', async t => {
    const frame = [bowler('nick', 'Nick', 'Pins Go Boom!'), bowler('jose', 'José', 'Other Team')];
    const api = [bowler('api-amy', 'Amy', 'API Team'), bowler('api-lee', 'Lee', 'API Team')];
    const view = await fixture(t, source => ({data: source === 'api' ? api : frame, isLoading: false, error: null}));
    await view.click(view.choices().find(button => button.textContent.includes('José')));
    assert.equal(view.profile().getAttribute('href'), '/player/jose');
    assert.equal(view.dom.window.localStorage.getItem('bls-home-bowler-frame'), 'jose');
    await view.click(view.container.querySelector('#use-api'));
    assert.equal(view.profile().getAttribute('href'), '/player/api-amy');
    assert.equal(view.container.querySelector('.bls-bowler-pass').textContent.includes('José'), false);
    assert.equal(view.container.querySelector('a[href="/player/jose"]'), null);
    await view.click(view.choices().find(button => button.textContent.includes('Lee')));
    assert.equal(view.dom.window.localStorage.getItem('bls-home-bowler-api'), 'api-lee');
    await view.unmount();
    await view.render();
    assert.equal(view.profile().getAttribute('href'), '/player/api-lee');
    await view.click(view.container.querySelector('#use-frame'));
    assert.equal(view.profile().getAttribute('href'), '/player/jose');
    assert.equal(view.container.querySelector('a[href="/player/api-lee"]'), null);
});

test('search filters name and team context, submits the result, and explains an empty search', async t => {
    const entries = [bowler('nick', 'Nick', 'Pins Go Boom!'), bowler('jose', 'José', 'Other Team')];
    const view = await fixture(t, () => ({data: entries, isLoading: false, error: null}));
    await view.search('jose other');
    assert.deepEqual(view.choices().map(button => button.querySelector('strong').textContent), ['José']);
    await act(async () => view.container.querySelector('form').dispatchEvent(new view.dom.window.Event('submit', {bubbles: true, cancelable: true})));
    assert.equal(view.profile().getAttribute('href'), '/player/jose');
    await view.search('no such bowler');
    assert.equal(view.choices().length, 0);
    assert.match(view.container.querySelector('.bls-bowler-results').textContent, /No bowlers match/);
});

test('loading, failed, and empty source states preserve directory access without a stale profile link', async t => {
    let result = {data: null, isLoading: true, error: null};
    const view = await fixture(t, () => result);
    assert.match(view.container.querySelector('.bls-bowler-results').textContent, /Finding your league/);
    assert.equal(view.profile(), null);
    assert.ok(view.container.querySelector('.bls-bowler-pass a[href="/player"]'));
    result = {data: [bowler('stale', 'Stale', 'Old Team')], isLoading: false, error: new Error('Source unavailable')};
    await view.render();
    assert.match(view.container.querySelector('.bls-bowler-results').textContent, /Bowler search is unavailable/);
    assert.equal(view.profile(), null);
    assert.equal(view.container.querySelector('a[href="/player/stale"]'), null);
    result = {data: [], isLoading: false, error: null};
    await view.render();
    assert.match(view.container.querySelector('.bls-bowler-results').textContent, /No bowlers are available/);
    assert.equal(view.profile(), null);
});
