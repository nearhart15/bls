const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const load = require('./load-source.cjs');

function tempWorkspace(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bls-consolidation-'));
    t.after(() => {
        assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(dir).startsWith('bls-consolidation-'));
        fs.rmSync(dir, {recursive: true, force: true});
    });
    return dir;
}

test('clearing shared loads prevents a pending old result from replacing fresh data', async () => {
    const {sharedLoad} = load('src/data/utils/shared-load.ts');
    const {applicationCache} = load('src/data/utils/cache.ts');
    let release;
    const old = sharedLoad('example', 'key', () => new Promise(resolve => {release = resolve;}));
    applicationCache.clear();
    const fresh = await sharedLoad('example', 'key', async () => ({value: 'fresh'}));
    release({value: 'old'});
    await old;
    assert.equal(await sharedLoad('example', 'key', async () => {throw Error('cached data expected');}), fresh);
});

test('partial shared results are retried rather than cached as complete', async () => {
    const {sharedLoad} = load('src/data/utils/shared-load.ts');
    let calls = 0;
    const fetcher = async () => ({warnings: calls++ === 0 ? ['offline league'] : [], value: calls});
    assert.equal((await sharedLoad('partial', 'key', fetcher)).value, 1);
    assert.equal((await sharedLoad('partial', 'key', fetcher)).value, 2);
    assert.equal((await sharedLoad('partial', 'key', fetcher)).value, 2);
});

test('deployment packaging retains runtime history and excludes source snapshots without deleting originals', t => {
    const dir = tempWorkspace(t), source = path.join(dir, 'public'), destination = path.join(dir, 'dist');
    const files = ['theme-init.js', 'data/beer-league.json', 'data/beer-league-history/week.pdf', 'data/leaguesecretary-beer-history/fall-2025/week-01.json', 'data/leaguesecretary-beer-history/index.json', 'data/leaguesecretary-beer-history/player-history-index.json', 'data/leaguesecretary-beer-history/league-week-history.json', 'data/leaguesecretary-beer-history/players/pat.json'];
    for (const file of files) {fs.mkdirSync(path.dirname(path.join(source, file)), {recursive:true});fs.writeFileSync(path.join(source, file), file);}
    load('scripts/public-assets.ts').copyRuntimeAssets(source, destination);
    for (const file of files) {
        assert.equal(fs.readFileSync(path.join(source,file),'utf8'),file);
        const excluded = file.includes('beer-league-history/week') || file.includes('/fall-2025/') || file.endsWith('/index.json');
        assert.equal(fs.existsSync(path.join(destination,file)), !excluded, file);
    }
});

test('archive writer preserves revisions and reports duplicate imports as unchanged', async t => {
    const {archiveBeerSnapshot} = await import('../scripts/beer-archive.mjs');
    const dir = tempWorkspace(t), parsed = {league:{week:1,season:'Fall 2026',date:'09/03/2026'},standings:[],teams:[]};
    const first = archiveBeerSnapshot(parsed, Buffer.from('%PDF-original'), dir);
    assert.equal(first.created, true);
    assert.equal(archiveBeerSnapshot(parsed, Buffer.from('%PDF-original'), dir).created, false);
    const revised = archiveBeerSnapshot(parsed, Buffer.from('%PDF-revised'), dir, {historicalBackfill:true});
    assert.equal(revised.created, true);
    assert.notEqual(first.path, revised.path);
    assert.equal(JSON.parse(fs.readFileSync(revised.path)).archive.historicalBackfill, true);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'index.json'))).snapshots.length, 2);
    assert.throws(()=>archiveBeerSnapshot({league:{week:0}},Buffer.alloc(0),dir), /valid week/);
});

test('comparison bars handle lower-is-better, zero, ties and missing values consistently', () => {
    const {ComparisonBar} = load('src/pages/components/comparison/comparison-ui.tsx');
    const render = props => renderToStaticMarkup(React.createElement(ComparisonBar, {label:'Score',format:value=>String(value),...props}));
    const low = render({valueA:20,valueB:80,lowerIsBetter:true});
    assert.match(low,/width:80%/);
    assert.match(low,/bls-fifa-val is-lead/);
    assert.match(render({valueA:0,valueB:20,lowerIsBetter:true}),/width:100%/);
    assert.match(render({valueA:null,valueB:20}),/width:50%/);
    assert.match(render({valueA:20,valueB:20}),/width:50%/);
});


test('derived cache entries expire with their oldest source instead of extending freshness', () => {
    const {Cache, inheritDataExpiry} = load('src/data/utils/cache.ts');
    const cache = new Cache(), source = {};
    const original = Date.now;
    let now = 1000000;
    Date.now = () => now;
    try {
        cache.put('source','key',source);
        now += 800000;
        cache.put('derived','key',inheritDataExpiry({value:1},[source]));
        assert.ok(cache.get('derived','key'));
        now += 100000;
        assert.equal(cache.get('derived','key'),null);
    } finally { Date.now = original; }
});


test('shared strike analysis preserves complete runs and tenth-frame milestone locations', () => {
    const {buildFrames, analyzeStrikes, isCleanGame} = load('src/data/league/frame-scoring.ts');
    const {convertScore} = load('src/data/utils/bowling-input.ts');
    const perfect = analyzeStrikes(buildFrames(convertScore('X'.repeat(12))));
    assert.deepEqual([...perfect.streaks], [[12,1]]);
    assert.deepEqual([...perfect.turkeyFrames], [3]);
    assert.deepEqual([...perfect.perfectFrames], [10]);
    const tenth = analyzeStrikes(buildFrames(convertScore('9-'.repeat(9)+'XXX')));
    assert.deepEqual([...tenth.streaks], [[3,1]]);
    assert.deepEqual([...tenth.turkeyFrames], [10]);
    assert.equal(isCleanGame(buildFrames(convertScore('9/'.repeat(9)+'X-9'))),true);
});
