const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {createRoot} = require('react-dom/client');
const {createTestDom} = require('./dom-fixture.cjs');
const load = require('./load-source.cjs');
const Attendance = load('src/pages/components/league/pam-attendance.tsx').default;

test('a local entry persists across visits, stays scoped to its week, and can be cleared', async () => {
    const {dom, restoreDom} = createTestDom({url: 'https://example.test/'});
    const original = Object.getOwnPropertyDescriptor(global, 'localStorage');
    Object.defineProperty(global, 'localStorage', {configurable: true, value: dom.window.localStorage});
    const container = dom.window.document.getElementById('root');
    const root = createRoot(container);
    const render = (week, leagueId = 'test-league') => React.act(async () => root.render(
        React.createElement(Attendance, {key: leagueId + week, leagueId, week})));
    const click = selector => React.act(async () => container.querySelector(selector).click());
    const change = (selector, value) => React.act(async () => {
        const input = container.querySelector(selector);
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, value);
        input.dispatchEvent(new dom.window.Event('change', {bubbles: true}));
        input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
    });
    const save = () => React.act(async () => container.querySelector('form')
        .dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true})));
    const label = () => container.querySelector('dd button').textContent;
    try {
        await render(1);
        assert.equal(label(), 'Not recorded');
        await click('dd button');
        await change('select', 'present');
        await save();
        assert.equal(label(), 'Present');
        await click('dd button');
        await change('input[type=time]', '20:15');
        await save();
        assert.equal(label(), 'Present · 8:15 PM');

        await render(2);
        assert.equal(label(), 'Not recorded');
        await render(1, 'other-season');
        assert.equal(label(), 'Not recorded');
        await render(1);
        assert.equal(label(), 'Present · 8:15 PM');
        await click('dd button');
        await change('select', 'absent');
        assert.equal(container.querySelector('input[type=time]'), null);
        await save();
        assert.equal(label(), 'Absent');
        await click('dd button');
        await change('select', '');
        await save();
        assert.equal(label(), 'Not recorded');
        assert.equal(dom.window.localStorage.length, 0);
    } finally {
        await React.act(async () => root.unmount());
        if (original) Object.defineProperty(global, 'localStorage', original);
        else delete global.localStorage;
        restoreDom();
    }
});
