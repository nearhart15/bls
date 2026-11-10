const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const root = path.resolve(__dirname,'..');
const workflow = name => YAML.parse(fs.readFileSync(path.join(root,'.github/workflows',name),'utf8'));

test('one Pages publisher consumes validated output and keeps preview in the same artifact', () => {
    const check = workflow('check.yml');
    assert.deepEqual(check.on.push.branches,['main','beer-league-pdf-import-test']);
    assert.deepEqual(check.jobs.check.strategy.matrix.os,['ubuntu-latest','windows-latest']);
    assert.deepEqual(check.jobs.deploy.needs,['check','audit']);
    assert.equal(check.jobs.deploy.uses,'./.github/workflows/deploy-pages.yml');
    assert.match(check.jobs.deploy.if,/github.event_name != 'pull_request'/);
    assert.equal(check.jobs.deploy.if, "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'");
    const request = check.jobs['request-production-publication'];
    assert.deepEqual(request.needs,['check','audit']);
    assert.equal(request.permissions.actions,'write');
    assert.match(request.if,/refs\/heads\/beer-league-pdf-import-test/);
    assert.equal(request.steps[0].run,'gh workflow run check.yml --ref main');
    assert.ok(check.jobs.check.steps.some(step=>step.run==='node scripts/assemble-pages.ts'));
    const publish = workflow('deploy-pages.yml');
    assert.ok('workflow_call' in publish.on);
    assert.equal(publish.concurrency.group,'pages');
    const publishers = fs.readdirSync(path.join(root,'.github/workflows')).filter(file=>fs.readFileSync(path.join(root,'.github/workflows',file),'utf8').includes('uses: actions/deploy-pages@'));
    assert.deepEqual(publishers,['deploy-pages.yml']);
});

test('data writers use one change-aware commit dispatcher and backfills are explicit operations', () => {
    for(const file of ['import-beer-league.yml','backfill-beer-history.yml','backfill-leaguesecretary-history.yml']) {
        const value=workflow(file),job=Object.values(value.jobs)[0];
        assert.equal(job.permissions.actions,'write');
        assert.ok(job.steps.some(step=>step.run?.startsWith('node scripts/commit-import.mjs')));
        assert.ok(job.steps.filter(step=>step.uses?.startsWith('actions/checkout@')).every(step=>step.with.ref==='main'));
        if(file.startsWith('backfill')) assert.equal(value.on.push,undefined);
    }
});


test('all workflow YAML is syntactically valid and checkout paths keep build provenance explicit', () => {
    for (const file of fs.readdirSync(path.join(root,'.github/workflows'))) if (/\.ya?ml$/.test(file)) assert.ok(workflow(file).jobs,file);
    const check = workflow('check.yml');
    assert.equal(check.jobs.check.defaults.run['working-directory'],'source');
    assert.equal(check.jobs.check.steps.find(step=>step.name==='Upload the validated Pages artifact').with.path,'source/_site');
    assert.ok(workflow('security-audit.yml').on.schedule);
});
