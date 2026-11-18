import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// This static site's build tools use checked-in glob patterns. Picomatch has no
// upstream patch for this advisory. Restrict the exception to its exact locked
// development version and dependency chains containing no other advisories.
const advisoryUrl = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const blockingSeverities = new Set(['moderate', 'high', 'critical']);

export function auditFindings(report, lock) {
    if (report.error || report.auditReportVersion !== 2 || !report.vulnerabilities || !lock.packages) {
        throw new Error('Dependency audit returned an invalid report or lockfile');
    }
    const findings = report.vulnerabilities;
    function isBuildOnlyException(name, ancestors = new Set()) {
        const finding = findings[name];
        if (!finding || ancestors.has(name) || !finding.nodes?.length || !finding.via?.length) return false;
        if (!finding.nodes.every(node => lock.packages[node]?.dev === true)) return false;
        const next = new Set([...ancestors, name]);
        return finding.via.every(cause => {
            if (typeof cause === 'string') return isBuildOnlyException(cause, next);
            return name === 'picomatch' && cause.name === 'picomatch' && cause.url === advisoryUrl
                && finding.nodes.every(node => lock.packages[node].version === '4.0.7');
        });
    }
    const blocked = [];
    const excepted = [];
    for (const [name, finding] of Object.entries(findings)) {
        if (!blockingSeverities.has(finding.severity)) continue;
        if (isBuildOnlyException(name)) excepted.push(name);
        else blocked.push(name);
    }
    return {blocked, excepted};
}

function main() {
    const result = spawnSync('npm', ['audit', '--json', '--audit-level=moderate'], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
        maxBuffer: 10 * 1024 * 1024,
    });
    if (result.error || result.signal || ![0, 1].includes(result.status)) {
        throw new Error(result.error?.message || result.stderr || 'Dependency audit failed to run');
    }
    const report = JSON.parse(result.stdout);
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const {blocked, excepted} = auditFindings(report, lock);
    if (excepted.length) {
        console.warn(`::warning::Build-only Picomatch 4.0.7 exception for ${advisoryUrl}. Affected development packages: ${excepted.join(', ')}. Remove this exception when an upstream fix is released.`);
    }
    if (blocked.length) {
        console.error(JSON.stringify(report, null, 2));
        console.error(`Dependency audit blocked: ${blocked.join(', ')}`);
        process.exitCode = 1;
    } else {
        console.log('Dependency audit passed with all non-excepted moderate-or-higher findings blocked.');
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
