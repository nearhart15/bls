const {createTestDom} = require('./dom-fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');

const fs = require('node:fs');
const path = require('node:path');
const load = require('./load-source.cjs');
const LeagueRosterPerformanceTable = load('src/pages/components/league/league-roster-performance-table.tsx').default;
const {ThemeProvider} = load('src/pages/components/theme.tsx');

test('bowler row and name clicks keep the selection in sync with the detail panel', async () => {
    const {dom, restoreDom} = createTestDom({url: 'https://example.test', pretendToBeVisual: true});
    dom.window.matchMedia = () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
    });

    const container = dom.window.document.getElementById('root');
    const root = createRoot(container);
    const teamDetails = {
        id: 'team',
        name: 'Pins Go Boom!',
        matchups: [],
        roster: [
            {id: 'nick', name: 'Nick', status: 'REGULAR'},
            {id: 'brian', name: 'Brian', status: 'REGULAR'},
        ],
    };

    function Screen() {
        const [selected, setSelected] = React.useState(undefined);
        return React.createElement(ThemeProvider, null,
            React.createElement(LeagueRosterPerformanceTable, {
                teamDetails,
                selectedPlayerId: selected,
                onSelectPlayer: setSelected,
            }),
            React.createElement('div', {id: 'details'}, selected || 'closed'),
            React.createElement('button', {id: 'close', onClick: () => setSelected(undefined)}, 'Close details')
        );
    }

    try {
        await act(async () => root.render(React.createElement(Screen)));
        const rows = () => [...container.querySelectorAll('.bls-perf-table tbody tr')];
        const highlighted = () => rows().filter(row => row.classList.contains('bls-perf-selected'));
        assert.equal(highlighted().length, 0);
        assert.equal(container.querySelector('.bls-perf-table').classList.contains('table-hover'), false);

        // A cell outside the bowler's name must open that bowler's stats.
        await act(async () => rows()[0].querySelectorAll('td')[2].dispatchEvent(
            new dom.window.MouseEvent('click', {bubbles: true})
        ));
        assert.equal(container.querySelector('#details').textContent, 'nick');
        assert.equal(highlighted().length, 1);
        assert.match(highlighted()[0].textContent, /Nick/);

        // A name click must move the highlight; it cannot leave two selected rows.
        await act(async () => rows()[1].querySelector('.bls-bowler-select').dispatchEvent(
            new dom.window.MouseEvent('click', {bubbles: true})
        ));
        assert.equal(container.querySelector('#details').textContent, 'brian');
        assert.equal(highlighted().length, 1);
        assert.match(highlighted()[0].textContent, /Brian/);
        assert.equal(rows()[1].querySelector('.bls-bowler-select').getAttribute('aria-expanded'), 'true');
        assert.equal(rows()[0].querySelector('.bls-bowler-select').getAttribute('aria-expanded'), 'false');

        // Buttons inside other cells (e.g. the rating explanation) must not select a row.
        const ratingButton = dom.window.document.createElement('button');
        rows()[0].lastElementChild.append(ratingButton);
        await act(async () => ratingButton.dispatchEvent(
            new dom.window.MouseEvent('click', {bubbles: true})
        ));
        assert.equal(container.querySelector('#details').textContent, 'brian');

        await act(async () => container.querySelector('#close').dispatchEvent(
            new dom.window.MouseEvent('click', {bubbles: true})
        ));
        assert.equal(container.querySelector('#details').textContent, 'closed');
        assert.equal(highlighted().length, 0);
    } finally {
        await act(async () => root.unmount());
        restoreDom();
    }
});

test('only selected rows receive the bowler selection shading', () => {
    const styles = fs.readFileSync(path.resolve(__dirname, '../src/sass/_perf-table.scss'), 'utf8');
    assert.match(styles, /tr\.bls-perf-selected > td\s*\{[^}]*--bs-table-bg-state:\s*var\(--bls-accent-soft\)/);
    assert.doesNotMatch(styles, /:hover\b/);
});
