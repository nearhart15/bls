import {metricCounts, type MetricCounts} from "./metric-counts";
/*
 * Player cross-league aggregation © 2026
 */

import {leagueDetailsFetcher, leagueInfoListFetcher} from "../league/league-api";
import type {LeaguePlayerStats} from "../league/league-team-details";
import type {TeamPlayerGameScore} from "../league/league-matchup";
import {PlayerStats} from "./player-stats";
import {calculatePlayerStats} from "./player-stats-calculator";
import {playerListFetcher} from "./player-api";
import {PlayerInfo} from "./player-info";
import moment from "moment";

export interface PlayerLeagueAppearance {
    season: string;
    leagueId: string;
    leagueName: string;
    teamId: string;
    teamName: string;
    teamNumber: number;
    status: string;
    stats?: LeaguePlayerStats;
}

export interface PlayerSeasonStats {
    season: string;
    leagues: number;
    games: number;
    average: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    cleanGames: number;
    hungCount: number;
    turkeyCount: number;
}

export interface PlayerSliceStats {
    season?: string;
    leagueId?: string;
    leagueName?: string;
    teamId?: string;
    lastBowled?: number;
    calendarStats?: Record<string, PlayerStats>;
    stats: PlayerStats;
}

export interface AggregatedPlayerData {
    warnings?: string[];
    player: PlayerInfo;
    appearances: PlayerLeagueAppearance[];
    careerStats: PlayerStats;
    seasonStats: PlayerSeasonStats[];
    seasonSlicesFull: PlayerSliceStats[];
    appearanceSlicesFull: PlayerSliceStats[];
}

export interface PlayerListSeasonSlice {
    metrics?: MetricCounts;
    season: string;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    games300: number;
    series600: number;
    series800: number;
    cleanGames: number;
    hungCount: number;
    turkeyCount: number;
    firstBall: number | null;
    strikePct: number | null;
    sparePct: number | null;
    singlePinPct: number | null;
    openPct: number | null;
    splitPct: number | null;
    strikeToSparePct: number | null;
    singlePinPickup: number | null;
    lowGame: number | null;
    lowSeries: number | null;
    seriesCount: number;
    ratingDelta?: number | null;
    ratingGameCount?: number;
}

export interface PlayerAppearanceSlice {
    metrics?: MetricCounts;
    calendarSlices?: PlayerAppearanceSlice[];
    season: string;
    leagueId: string;
    leagueName: string;
    teamId: string;
    teamName: string;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    games300: number;
    series600: number;
    series800: number;
    cleanGames: number;
    hungCount: number;
    turkeyCount: number;
    firstBall: number | null;
    strikePct: number | null;
    sparePct: number | null;
    singlePinPct: number | null;
    openPct: number | null;
    splitPct: number | null;
    strikeToSparePct: number | null;
    singlePinPickup: number | null;
    lowGame: number | null;
    lowSeries: number | null;
    seriesCount: number;
    ratingDelta?: number | null;
    ratingGameCount?: number;
}

export interface ApiDerivedPlayerStats {
    handicap: number;
    highHandicapGame: number;
    highHandicapSeries: number;
    latestGames: number[];
    latestSeries: number | null;
    latestHandicapSeries: number | null;
    latestGameAverage: number | null;
    latestHighGame: number | null;
    latestLowGame: number | null;
    seriesCount: number;
    averageSeries: number | null;
    known200Games: number;
    known600Series: number;
    known700Series: number;
    known800Series: number;
}

export interface PlayerListEntry {
    id: string;
    name: string;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    seasonSlices: PlayerListSeasonSlice[];
    calendarSlices: PlayerListSeasonSlice[];
    appearanceSlices: PlayerAppearanceSlice[];
    ratingDelta?: number | null;
    ratingGameCount?: number;
    weekAverages?: number[];
    weekSeries?: number[];
    lastBowled?: moment.Moment;
    apiStats?: ApiDerivedPlayerStats;
}

export const PLAYER_DETAIL_CACHE_CATEGORY = "player-detail-v4-frame-pace";
export const PLAYER_INDEX_CACHE_CATEGORY = "player-index-v9-scoped-rating";

interface RatingSample {
    season: string;
    year: string;
    leagueKey: string;
    delta: number;
}

interface RosterScanResult {
    warnings: string[];
    dates: Map<TeamPlayerGameScore[], string>;
    playerMap: Map<string, {name: string; lastBowled?: moment.Moment}>;
    seriesByPlayerSeason: Map<string, Map<string, TeamPlayerGameScore[][]>>;
    seriesByPlayer: Map<string, TeamPlayerGameScore[][]>;
    seriesByPlayerLeague: Map<string, Map<string, TeamPlayerGameScore[][]>>;
}

// Rest of this module is unchanged below this point.
