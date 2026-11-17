const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = require('./load-source.cjs');
const {hasLowerHandicap} = load('src/data/league/handicap.ts');

test('roster row edge highlights only a known, lower handicap', () => {
    assert.equal(hasLowerHandicap(25, 65), true);
    assert.equal(hasLowerHandicap(65, 25), false);
    assert.equal(hasLowerHandicap(25, 25), false);
    assert.equal(hasLowerHandicap(0, 20), true);
    assert.equal(hasLowerHandicap(null, 20), false);
    assert.equal(hasLowerHandicap(20, undefined), false);
    assert.equal(hasLowerHandicap(Number.NaN, 20), false);
});

test('both team comparison roster cards display league handicap instead of rating', () => {
    const screens = [
        ['src/pages/team-compare.tsx', 'player.playerStats?.leagueHandicap'],
        ['src/pages/components/league/api-team-compare.tsx', 'player.handicap'],
    ];
    for (const [file, handicapField] of screens) {
        const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
        assert.match(source, /<th className="text-end">Handicap<\/th>/, file);
        assert.ok(source.includes(handicapField), file);
        assert.match(source, /hasLowerHandicap\(handicap, opponentHandicap\)/, file);
        assert.doesNotMatch(source, /<th className="text-end">(?:Player )?Rating<\/th>/, file);
        assert.match(source, /lower-handicap edge highlighted/, file);
    }
});
