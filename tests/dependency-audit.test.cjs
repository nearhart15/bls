const test = require('node:test');
const assert = require('node:assert/strict');

function fixture() {
    return {
        report: {auditReportVersion: 2, vulnerabilities: {
            picomatch: {severity: 'high', nodes: ['node_modules/picomatch'], via: [{
                name: 'picomatch', url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
            }]},
            vite: {severity: 'high', nodes: ['node_modules/vite'], via: ['picomatch']},
        }},
        lock: {packages: {
            'node_modules/picomatch': {version: '4.0.7', dev: true},
            'node_modules/vite': {version: '8.3.5', dev: true},
        }},
    };
}

test('audit exception covers only the pinned development advisory and its development dependents', async () => {
    const {auditFindings} = await import('../scripts/audit-dependencies.mjs');
    const {report, lock} = fixture();
    assert.deepEqual(auditFindings(report, lock), {blocked: [], excepted: ['picomatch', 'vite']});
    lock.packages['node_modules/picomatch'].dev = false;
    assert.deepEqual(auditFindings(report, lock).blocked, ['picomatch', 'vite']);
});

test('new advisories, versions, production dependents and missing metadata keep blocking', async () => {
    const {auditFindings} = await import('../scripts/audit-dependencies.mjs');
    for (const mutate of [
        ({report}) => report.vulnerabilities.picomatch.via.push({name: 'picomatch', url: 'another-advisory'}),
        ({lock}) => lock.packages['node_modules/picomatch'].version = '4.0.8',
        ({lock}) => delete lock.packages['node_modules/picomatch'],
    ]) {
        const data = fixture();
        mutate(data);
        assert.deepEqual(auditFindings(data.report, data.lock).blocked, ['picomatch', 'vite']);
    }
    const {report, lock} = fixture();
    lock.packages['node_modules/vite'].dev = false;
    assert.deepEqual(auditFindings(report, lock).blocked, ['vite']);
    report.vulnerabilities.vite.via = ['vite'];
    assert.deepEqual(auditFindings(report, lock).blocked, ['vite']);
    assert.throws(() => auditFindings({error: {}}, lock), /invalid report/);
});
