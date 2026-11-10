const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const {recommendRivals, resolveRivalry, buildRivalryPath} = load('src/pages/components/comparison/rivalry-data.ts');
const player = (id, name, average = 180, games = 9) => ({id, name, average, games});

test('rivals rank observed average gaps with stable name and ID ties without mutating inputs', () => {
    const rows = [player('a','Anchor',180), player('z','Zoe',182), player('amy-2','Amy',178), player('amy-1','Amy',182), player('near','Near',180.5)];
    const before = rows.slice();
    assert.deepEqual(recommendRivals(rows,'a').map(({id,gap}) => ({id,gap})), [{id:'near',gap:0.5},{id:'amy-1',gap:2},{id:'amy-2',gap:2}]);
    assert.deepEqual(rows,before);
    assert.ok(rows.every(row => !Object.hasOwn(row,'gap')));
    assert.deepEqual(recommendRivals(rows,'a',1).map(row => row.id), ['near']);
});
test('rivals exclude self, unplayed games, and unavailable or nonfinite averages', () => {
    const rows = [player('a','Anchor'), player('a','Duplicate anchor',181), player('zero','Unplayed',180,0), player('negative','Negative games',180,-1), player('unknown','Unknown',null), player('nan','NaN',NaN), player('infinite','Infinite',Infinity), player('valid','Valid',0)];
    assert.deepEqual(recommendRivals(rows,'a').map(row => row.id), ['valid']);
    for (const id of ['unknown','missing','zero']) assert.deepEqual(recommendRivals(rows,id), []);
});
test('URL selections win over remembered defaults while manual unknown averages remain comparable', () => {
    const rows = [player('nick','Nick'), player('saved','Saved'), player('requested','Requested',null), player('b','Opponent',null)];
    const result = resolveRivalry(rows,'requested','b','saved');
    assert.equal(result.a.id,'requested');
    assert.equal(result.b.id,'b');
    assert.deepEqual(result.suggestions,[]);
    assert.equal(resolveRivalry(rows,'stale','b','saved').a.id,'saved');
});
test('stale and identical IDs fall back to favorites and nearest distinct opponents', () => {
    const rows = [player('alphabetical','Amy',170), player('nick','Nick',180), player('near','Zoe',181), player('unplayed','Brian',180,0)];
    const result = resolveRivalry(rows,'wrong-source-id','nick','unplayed');
    assert.equal(result.a.id,'nick');
    assert.equal(result.b.id,'near');
    assert.equal(result.suggestions[0].id,'near');
    assert.equal(resolveRivalry([player('z','Zoe'),player('a','Amy')],null,null,null).a.id,'a');
});
test('empty, single-player, and unknown-average rosters have honest selections', () => {
    for (const rows of [[],[player('z','Unplayed',180,0)]]) {
        const result = resolveRivalry(rows,'a','b','a');
        assert.equal(result.a,undefined);
        assert.equal(result.b,undefined);
        assert.deepEqual(result.suggestions,[]);
    }
    const single = resolveRivalry([player('a','Only',null)],'a','a',null);
    assert.equal(single.a.id,'a');
    assert.equal(single.b,undefined);
    assert.deepEqual(single.suggestions,[]);
    const unknown = resolveRivalry([player('a','Amy',null),player('b','Ben',null)],null,null,null);
    assert.equal(unknown.a.id,'a');
    assert.equal(unknown.b.id,'b');
});
test('comparison links round-trip opaque IDs, source, and selected season scope', () => {
    const a='api-name/one?x=2&b=wrong#player', b='José + two';
    const url = new URL(buildRivalryPath('api',a,b,{mode:'season',season:'2026 - 27',leagueId:'league/&id=one'}),'https://example.test');
    assert.equal(url.pathname,'/player/compare');
    for (const [key,value] of Object.entries({source:'api',a,b,mode:'season',season:'2026 - 27',leagueId:'league/&id=one'})) assert.equal(url.searchParams.get(key),value);
    assert.equal(url.hash,'');
    const career = new URL(buildRivalryPath('frame','a',undefined,{mode:'career',season:'old',leagueId:'old'}),'https://example.test');
    assert.equal(career.searchParams.get('mode'),'career');
    for (const key of ['b','season','leagueId']) assert.equal(career.searchParams.has(key),false);
});
