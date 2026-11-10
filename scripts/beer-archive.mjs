import { readTextIfPresent } from "./import-utils.mjs";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
export function archiveBeerSnapshot(
  parsed,
  bytes,
  historyDirectory,
  { historicalBackfill = false, skipInvalidWeek = false } = {},
) {
  const week = parsed.league.week;
  if (!Number.isInteger(week) || week < 1) {
    if (skipInvalidWeek) return { created: false, path: null };
    throw new Error("Cannot archive standings without a valid week number.");
  }
  const season = (parsed.league.season ?? "season")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const dir = resolve(historyDirectory, season);
  mkdirSync(dir, { recursive: true });
  const prefix = `week-${String(week).padStart(2, "0")}`;
  const hash = createHash("sha256").update(bytes).digest("hex");
  let revision = 1;
  while (true) {
    const jsonPath = join(
      dir,
      revision === 1 ? `${prefix}.json` : `${prefix}-r${revision}.json`,
    );
    const existingText = readTextIfPresent(jsonPath);
    if (existingText === null) break;
    const existing = JSON.parse(existingText);
    if (existing.archive?.pdfSha256 === hash) {
      console.log(`Historical snapshot already archived: ${jsonPath}`);
      return { created: false, path: jsonPath };
    }
    revision += 1;
  }
  const base = revision === 1 ? prefix : `${prefix}-r${revision}`;
  const jsonPath = join(dir, `${base}.json`),
    pdfArchive = join(dir, `${base}.pdf`);
  const snapshot = {
    ...parsed,
    archive: {
      week,
      revision,
      pdfSha256: hash,
      pdfFile: `${base}.pdf`,
      archivedAt: new Date().toISOString(),
      ...(historicalBackfill ? { historicalBackfill: true } : {}),
    },
  };
  writeFileSync(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
    flag: "wx",
  });
  writeFileSync(pdfArchive, bytes, { flag: "wx" });
  const indexPath = join(resolve(historyDirectory), "index.json");
  let index = { snapshots: [] };
  const indexText = readTextIfPresent(indexPath);
  if (indexText !== null) index = JSON.parse(indexText);
  index.snapshots = (index.snapshots ?? []).filter(
    (x) =>
      !(
        x.season === parsed.league.season &&
        x.week === week &&
        x.revision === revision
      ),
  );
  index.snapshots.push({
    season: parsed.league.season,
    week,
    revision,
    date: parsed.league.date,
    json: `${season}/${base}.json`,
    pdf: `${season}/${base}.pdf`,
    pdfSha256: hash,
  });
  index.snapshots.sort(
    (a, b) =>
      String(a.season).localeCompare(String(b.season)) ||
      a.week - b.week ||
      a.revision - b.revision,
  );
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  console.log(
    `Archived immutable Week ${week} revision ${revision}: ${jsonPath}`,
  );
  return { created: true, path: jsonPath };
}
