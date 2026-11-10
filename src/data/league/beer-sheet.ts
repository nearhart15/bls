import {fetchJson} from "../utils/fetch-json";
import {sharedLoad} from "../utils/shared-load";
import {recordApiFreshness} from "../utils/source-freshness";

export interface BeerStanding{division:string|null;place:number;number:number;name:string;won:number;lost:number;average:number;handicap:number;pinsWithHandicap:number;scratchPins:number;highHandicapGame:number;highHandicapSeries:number;highScratchGame:number;highScratchSeries:number}
export interface BeerPlayer{name:string;average:number;handicap:number;pins:number;games:number;highGame:number;highSeries:number;highHandicapGame?:number;highHandicapSeries?:number;weekScoresRaw:string[];status?:"REGULAR"|"SUBSTITUTE";weekHandicapTotal?:number|null;weekScores:(number|null)[];weekTotal:number|null}
export interface BeerTeam{division?:string|null;place?:number;number:number;name:string;won?:number;lost?:number;average?:number;handicap?:number;players:BeerPlayer[]}
export interface BeerLeagueData{status:"pending"|"ready";message?:string;generatedAt:string|null;source?:{directoryUrl:string;leaguePageUrl:string|null;pdfUrl:string|null};league?:{name:string;date:string|null;week:number|null;totalWeeks:number|null;day:string;time:string|null;season:string|null};standings:BeerStanding[];teams:BeerTeam[];substitutes?:BeerPlayer[]}

export function normalizePlayerName(name: string): string { return name.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, ""); }
export function apiPlayerId(teamNumber: number | null, name: string, index: number): string {
    const slug = name.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `api-${teamNumber ?? "sub"}-${slug}-${index}`;
}
export function beerSheetFetcher(): Promise<BeerLeagueData> {
    return sharedLoad("beer-sheet", "current", async () => {
        const data = await fetchJson(`${import.meta.env.BASE_URL}data/beer-league.json`) as unknown as BeerLeagueData;
        if (data.status !== "ready" || !Array.isArray(data.teams) || !Array.isArray(data.standings)) throw new Error("Beer League data is not ready or is malformed.");
        recordApiFreshness(data);
        return data;
    });
}
