import {fetchJson} from "../utils/fetch-json";
import type {PlayerAppearanceSlice, PlayerListEntry, PlayerListSeasonSlice} from "./player-aggregate";

interface ApiPlayer {
    name: string;
    average: number;
    handicap: number;
    pins: number;
    games: number;
    highGame: number;
    highSeries: number;
    highHandicapGame?: number;
    highHandicapSeries?: number;
    weekScores?: number[];
    weekTotal?: number;
    weekHandicapTotal?: number;
}

interface ApiTeam { number: number; name: string; players: ApiPlayer[]; }
interface ApiLeagueData { status: "pending" | "ready"; league?: {name: string; date: string | null; season: string | null}; teams: ApiTeam[]; substitutes?: ApiPlayer[]; }

export interface ApiDerivedStats {
    handicap: number;
    highHandicapGame: number;
    highHandicapSeries: number;
    latestGames: number[];
    latestSeries: number | null;
    latestHandicapSeries: number | null;
    latestAverage: number | null;
    latestHighGame: number | null;
    latestLowGame: number | null;
    seriesCount: number;
    averageSeries: number | null;
    known200Games: number;
    known600Series: number;
    known700Series: number;
    known800Series: number;
}

export type ApiPlayerListEntry = PlayerListEntry & {apiStats: ApiDerivedStats};
export function apiStats(player: PlayerListEntry): ApiDerivedStats | undefined { return (player as Partial<ApiPlayerListEntry>).apiStats; }

function slug(value: string): string { return value.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function seasonLabel(data: ApiLeagueData): string { return data.league?.season?.trim() || data.league?.date?.slice(-4) || String(new Date().getFullYear()); }
function calendarYear(data: ApiLeagueData): string { const match = data.league?.date?.match(/(\d{4})$/); return match?.[1] ?? String(new Date().getFullYear()); }

function derived(player: ApiPlayer): ApiDerivedStats {
    const latestGames = (player.weekScores ?? []).filter((score) => Number.isFinite(score) && score >= 0);
    const latestSeries = player.weekTotal ?? (latestGames.length > 0 ? latestGames.reduce((sum, score) => sum + score, 0) : null);
    const completeSeries = Math.floor(player.games / 3);
    return {
        handicap: player.handicap ?? 0,
        highHandicapGame: player.highHandicapGame ?? 0,
        highHandicapSeries: player.highHandicapSeries ?? 0,
        latestGames,
        latestSeries,
        latestHandicapSeries: player.weekHandicapTotal ?? null,
        latestAverage: latestGames.length > 0 ? latestGames.reduce((sum, score) => sum + score, 0) / latestGames.length : null,
        latestHighGame: latestGames.length > 0 ? Math.max(...latestGames) : null,
        latestLowGame: latestGames.length > 0 ? Math.min(...latestGames) : null,
        seriesCount: completeSeries,
        averageSeries: completeSeries > 0 && player.games % 3 === 0 ? player.pins / completeSeries : (player.average > 0 ? player.average * 3 : null),
        // The league sheet only exposes the latest individual games plus season highs. These are guaranteed minimums, never invented season totals.
        known200Games: Math.max(latestGames.filter((score) => score >= 200).length, player.highGame >= 200 ? 1 : 0),
        known600Series: Math.max(latestSeries != null && latestSeries >= 600 ? 1 : 0, player.highSeries >= 600 ? 1 : 0),
        known700Series: Math.max(latestSeries != null && latestSeries >= 700 ? 1 : 0, player.highSeries >= 700 ? 1 : 0),
        known800Series: Math.max(latestSeries != null && latestSeries >= 800 ? 1 : 0, player.highSeries >= 800 ? 1 : 0),
    };
}

function slice(player: ApiPlayer, season: string): PlayerListSeasonSlice {
    const d = derived(player);
    return {season, average:player.games>0?player.average:null, games:player.games, pinfall:player.pins, highGame:player.highGame, highSeries:player.highSeries, games200:d.known200Games, games300:player.highGame===300?1:0, series600:d.known600Series, series800:d.known800Series, cleanGames:0, hungCount:0, turkeyCount:0, firstBall:null, strikePct:null, sparePct:null, singlePinPct:null, openPct:null, splitPct:null, strikeToSparePct:null, singlePinPickup:null, lowGame:null, lowSeries:null, seriesCount:d.seriesCount, ratingDelta:null, ratingGameCount:0};
}

function entry(player: ApiPlayer, team: ApiTeam | null, data: ApiLeagueData, index: number): ApiPlayerListEntry {
    const season=seasonLabel(data), year=calendarYear(data), leagueId="beer-league-api", teamId=team?`beer-team-${team.number}`:"beer-subs", teamName=team?.name??"Substitutes", seasonSlice=slice(player,season), calendarSlice=slice(player,year), d=derived(player);
    const appearance:PlayerAppearanceSlice={...seasonSlice,season,leagueId,leagueName:data.league?.name??"Beer League",teamId,teamName,calendarSlices:[{...calendarSlice,season:year,leagueId,leagueName:data.league?.name??"Beer League",teamId,teamName}]};
    return {id:`api-${team?.number??"sub"}-${slug(player.name)}-${index}`,name:player.name,average:player.games>0?player.average:null,games:player.games,pinfall:player.pins,highGame:player.highGame,highSeries:player.highSeries,games200:d.known200Games,seasonSlices:[seasonSlice],calendarSlices:[calendarSlice],appearanceSlices:[appearance],ratingDelta:null,ratingGameCount:0,weekAverages:d.latestAverage!=null?[d.latestAverage]:undefined,weekSeries:d.latestSeries!=null?[d.latestSeries]:undefined,apiStats:d};
}

export async function apiPlayerListFetcher(): Promise<PlayerListEntry[]> {
    const data=await fetchJson(`${import.meta.env.BASE_URL}data/beer-league.json`) as unknown as ApiLeagueData; if(data.status!=="ready")throw new Error("API data is not ready yet.");
    const rows:ApiPlayerListEntry[]=[]; for(const team of data.teams)team.players.forEach((player,index)=>rows.push(entry(player,team,data,index))); (data.substitutes??[]).forEach((player,index)=>rows.push(entry(player,null,data,index))); return rows;
}
