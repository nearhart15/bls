import {readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";
import {gzipSync} from "node:zlib";

const distDir = "dist";
const assetsDir = join(distDir, "assets");
const html = readFileSync(join(distDir, "index.html"), "utf8");
const assetFiles = readdirSync(assetsDir);

function assetFromHtml(pattern, label) {
    const match = html.match(pattern);
    if (!match) throw new Error(`Could not locate ${label} in dist/index.html`);
    return join(assetsDir, match[1]);
}

function kib(bytes) {
    return bytes / 1024;
}

function check(label, file, maxRawKiB, maxGzipKiB) {
    const content = readFileSync(file);
    const raw = kib(content.byteLength);
    const gzip = kib(gzipSync(content).byteLength);
    console.log(`${label}: ${raw.toFixed(1)} KiB raw / ${gzip.toFixed(1)} KiB gzip`);
    if (raw > maxRawKiB) throw new Error(`${label} exceeds raw budget: ${raw.toFixed(1)} > ${maxRawKiB} KiB`);
    if (gzip > maxGzipKiB) throw new Error(`${label} exceeds gzip budget: ${gzip.toFixed(1)} > ${maxGzipKiB} KiB`);
}

const entryJs = assetFromHtml(/<script[^>]+src="[^"]*\/assets\/([^"]+\.js)"/i, "entry JavaScript");
const entryCss = assetFromHtml(/<link[^>]+href="[^"]*\/assets\/([^"]+\.css)"/i, "entry stylesheet");
const apexName = assetFiles.find(name => /^apexcharts-.*\.js$/i.test(name));
if (!apexName) throw new Error("Could not locate the ApexCharts lazy chunk");

check("Initial JavaScript", entryJs, 300, 95);
check("Initial CSS", entryCss, 300, 45);
check("ApexCharts lazy chunk", join(assetsDir, apexName), 650, 180);

const entryName = entryJs.split(/[\\/]/).at(-1);
const otherJs = assetFiles
    .filter(name => name.endsWith(".js") && name !== apexName && name !== entryName)
    .map(name => ({name, bytes: readFileSync(join(assetsDir, name)).byteLength}))
    .sort((a, b) => b.bytes - a.bytes);
if (otherJs[0]) {
    const largest = kib(otherJs[0].bytes);
    console.log(`Largest other lazy chunk: ${otherJs[0].name} (${largest.toFixed(1)} KiB raw)`);
    if (largest > 150) throw new Error(`Lazy chunk exceeds 150 KiB budget: ${otherJs[0].name}`);
}
