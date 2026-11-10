import type {AvailableLeagues} from "./league-info";

/** One catalogue traversal for roster aggregation and news, retaining source order. */
export function* leagueEntries(catalogue: AvailableLeagues) {
    for (const season of catalogue.seasons) for (const league of season.leagues) {
        if (league.hasData() && league.dataLoc && league.id) yield {season, league, leagueId: league.id, dataLoc: league.dataLoc};
    }
}
