const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {createTestDom} = require('./dom-fixture.cjs');
const load = require('./load-source.cjs');

test('a first-name-only BinBin profile matches its A.B.C. identity by frame ID', () => {
    const {findApiPlayerForFrameProfile} = load('src/data/player/player-source-match.ts');
    const players = [{name: 'Nick Reed'}, {name: 'Nick Earhart'}, {name: 'José Soto'}];
    assert.equal(findApiPlayerForFrameProfile('ne1', 'Nick', players), players[1]);
    assert.equal(findApiPlayerForFrameProfile('another-nick', 'Nick', players), undefined);
    assert.equal(findApiPlayerForFrameProfile('js', 'Jose Soto', players), players[2]);
});

test('a failed route keeps the site menu visible and the next route can open', async t => {
    const {dom, restoreDom} = createTestDom();
    const {createRoot} = require('react-dom/client');
    const Boundary = load('src/pages/components/page-error-boundary.tsx').default;
    const container = dom.window.document.getElementById('root');
    const root = createRoot(container, {onCaughtError() {}});
    t.after(async () => {
        await React.act(async () => root.unmount());
        restoreDom();
    });

    function FailedProfile() { throw new Error('Profile render failed'); }
    const render = (page, content) => React.act(async () => {
        root.render(React.createElement(React.Fragment, null,
            React.createElement('nav', null, 'Site menu'),
            React.createElement(Boundary, {page}, content),
        ));
    });

    await render('profile', React.createElement(FailedProfile));
    assert.match(container.querySelector('nav').textContent, /Site menu/);
    assert.match(container.querySelector('[role="alert"]').textContent, /This page couldn’t open/);
    assert.equal(container.querySelector('button').textContent, 'Reload page');

    await render('players', React.createElement('h1', null, 'Players'));
    assert.equal(container.querySelector('h1').textContent, 'Players');
    assert.equal(container.querySelector('[role="alert"]'), null);
});
