const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment');
const load = require('./load-source.cjs');

test('shoutouts use the latest played day that actually has notes', async () => {
  const api = load('src/data/league/league-api.ts');
  api.leagueInfoListFetcher = async () => ({
    seasons: [{
      season: '2026',
      leagues: [{id: 'league', name: 'League', dataLoc: 'league.json', hasData: () => true}],
    }],
  });
  api.leagueDetailsFetcher = async () => ({
    otherTeams: [],
    teams: [{
      id: 'team',
      name: 'Team',
      matchups: [
        {week: 1, bowlDate: moment('2026-09-08'), notes: [' Pat rolled 200! ']},
        {week: 2, bowlDate: moment('2026-09-15'), notes: []},
      ],
    }],
  });

  const {shoutOutsFromLastGameNotes} = load('src/data/news/shoutouts-from-notes.ts');
  const result = await shoutOutsFromLastGameNotes();

  assert.equal(result.length, 1);
  assert.equal(result[0].week, 1);
  assert.deepEqual(result[0].notes, ['Pat rolled 200!']);
});
