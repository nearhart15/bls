const assert = require("node:assert/strict");
const test = require("node:test");
const {pathToFileURL} = require("node:url");
const path = require("node:path");

const importer = import(pathToFileURL(path.resolve(__dirname, "../scripts/backfill-beer-league-history.mjs")).href);

test("historical Beer League sheets are kept only when Pins Go Boom is present", async () => {
    const {hasQualifyingTeam} = await importer;

    assert.equal(hasQualifyingTeam({
        standings: [{name: "Pins Go Boom!"}],
        teams: [],
    }), true);

    assert.equal(hasQualifyingTeam({
        standings: [],
        teams: [{name: "Pins Go Boom"}],
    }), true);

    assert.equal(hasQualifyingTeam({
        standings: [{name: "Bourbon Achiever"}],
        teams: [{name: "Lads of Leisure"}],
    }), false);
});
