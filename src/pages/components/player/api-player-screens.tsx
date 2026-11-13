import PlayerScorecard from "./player-scorecard";
import {buildRivalryPath} from "../comparison/rivalry-data";
import {LeaderboardPodium} from "./leaderboard-podium";
import {TeamFilter} from "../filters/team-filter";
import {SortHeader} from "../sort-header";
import {Suspense, lazy, type FC, useCallback, useMemo, useState} from "react";
import {Link} from "react-router";
import {Alert, Badge, Card, CardBody, Col, Form, Row, Table} from "react-bootstrap";
import type {PlayerListEntry} from "../../../data/player/player-aggregate";
import {apiStats} from "../../../data/player/api-player-data";
import {
    API_PLAYER_HISTORY_CACHE_CATEGORY,
    API_PLAYER_HISTORY_INDEX_CACHE_CATEGORY,
    apiHistoricalPlayerFetcher,
    apiPlayerHistoryIndexFetcher,
    findHistoricalPlayer,
    type ApiHistoricalPlayerResult,
    type ApiPlayerHistoryIndexFile,
} from "../../../data/player/api-player-history";
import {
    API_PLAYER_TIMEFRAME_OPTIONS,
    pointsForApiPlayerTimeframe,
    summarizeApiPlayerHistory,
    type ApiPlayerTimeframe,
    type ApiPlayerTimeframeSummary,
} from "../../../data/player/api-player-timeframe";
import ErrorDisplay from "../error-display";
import {useCachedFetcher} from "../cache/data-loader";
import Loader from "../loader";
import {usePlayerIndexData} from "./use-player-index-data";
const ApiPlayerHistoryCharts = lazy(() => import("./api-player-history-charts"));

const numberFormat=Intl.NumberFormat("en-US",{maximumFractionDigits:1});
type ApiSort="average"|"games"|"pinfall"|"highGame"|"highSeries"|"handicap"|"highHandicapGame"|"highHandicapSeries"|"latestSeries"|"latestAverage"|"averageSeries"|"seriesCount"|"known200Games"|"known600Series"|"known700Series";
type ApiPlayerListSort="name"|"team"|ApiSort; type SortDir="asc"|"desc";
function teamName(p:PlayerListEntry){return p.appearanceSlices[0]?.teamName??"—";}
function value(p:PlayerListEntry,key:ApiSort):number{const d=apiStats(p);switch(key){case"average":case"games":case"pinfall":case"highGame":case"highSeries":return p[key]??0;case"handicap":return d?.handicap??0;case"highHandicapGame":return d?.highHandicapGame??0;case"highHandicapSeries":return d?.highHandicapSeries??0;case"latestSeries":return d?.latestSeries??0;case"latestAverage":return d?.latestAverage??0;case"averageSeries":return d?.averageSeries??0;case"seriesCount":return d?.seriesCount??0;case"known200Games":return d?.known200Games??0;case"known600Series":return d?.known600Series??0;case"known700Series":return d?.known700Series??0;}}
function compare(a:PlayerListEntry,b:PlayerListEntry,key:ApiPlayerListSort,dir:SortDir){const m=dir==="asc"?1:-1;let c=key==="name"?a.name.localeCompare(b.name):key==="team"?teamName(a).localeCompare(teamName(b)):value(a,key)-value(b,key);if(c===0)c=a.name.localeCompare(b.name);return c*m;}
export const ApiPlayerList:FC<{title?:string}>=({title="A.B.C. Player Stats"})=>{const{data,isLoading,error}=usePlayerIndexData("api");const[query,setQuery]=useState("");const[sort,setSort]=useState<ApiPlayerListSort>("average");const[sortDir,setSortDir]=useState<SortDir>("desc");const[selectedTeams,setSelectedTeams]=useState<string[]>([]);const teams=useMemo(()=>Array.from(new Set((data??[]).map(teamName))).sort((a,b)=>a.localeCompare(b)),[data]);const onSort=(k:ApiPlayerListSort)=>{if(k===sort)setSortDir(c=>c==="asc"?"desc":"asc");else{setSort(k);setSortDir(k==="name"||k==="team"?"asc":"desc");}};const players=useMemo(()=>{const q=query.trim().toLocaleLowerCase();const rows=(data??[]).filter(p=>selectedTeams.length===0||selectedTeams.includes(teamName(p))).filter(p=>!q||`${p.name} ${teamName(p)}`.toLocaleLowerCase().includes(q)).sort((a,b)=>compare(a,b,sort,sortDir));return rows;},[data,query,sort,sortDir,selectedTeams]);if(isLoading)return <Loader/>;if(error!=null)return <ErrorDisplay message="Error loading API player stats." error={error}/>;return <div><Card className="bls-profile-card"><CardBody className="d-flex flex-wrap gap-2 align-items-center justify-content-between"><div><strong>{title}</strong> <Badge bg="secondary" pill>{players.length} bowlers</Badge></div><div className="d-flex flex-wrap gap-2"><Form.Control size="sm" type="search" placeholder="Search bowler or team" value={query} onChange={e=>{setQuery(e.target.value);}} style={{maxWidth:240}}/><TeamFilter teams={teams} selected={selectedTeams} onChange={setSelectedTeams} idPrefix="api-team" size="sm"/></div></CardBody><div className="bls-api-mobile-sort"><Form.Select aria-label="Sort A.B.C. players by" value={sort} onChange={e=>{const key=e.target.value as ApiPlayerListSort;setSort(key);setSortDir(key==="name"||key==="team"?"asc":"desc");}}>{[["name","Bowler"],["team","Team"],["average","Average"],["handicap","Handicap"],["games","Games"],["pinfall","Pins"],["highGame","High game"],["highSeries","High series"],["latestSeries","Latest series"]].map(([key,label])=><option key={key} value={key}>{label}</option>)}</Form.Select><Form.Select aria-label="A.B.C. player sort order" value={sortDir} onChange={e=>{setSortDir(e.target.value as SortDir);}}><option value="desc">Descending</option><option value="asc">Ascending</option></Form.Select></div><div className="table-responsive"><Table hover size="sm" className="bls-api-player-table mb-0 align-middle"><thead><tr><th>#</th><SortHeader label="Bowler" sortKey="name" active={sort} dir={sortDir} onSort={onSort}/><SortHeader label="Team" sortKey="team" active={sort} dir={sortDir} onSort={onSort}/><SortHeader label="Avg" sortKey="average" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="Hdcp" sortKey="handicap" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="Games" sortKey="games" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="Pins" sortKey="pinfall" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="HG" sortKey="highGame" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="HS" sortKey="highSeries" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="Latest" sortKey="latestSeries" active={sort} dir={sortDir} onSort={onSort} className="text-end"/></tr></thead><tbody>{players.length===0&&<tr><td colSpan={10} className="text-center py-4">No bowlers match the filters.</td></tr>}{players.map((p,i)=><tr key={p.id}><td>{i+1}</td><td><Link className="bls-link fw-semibold" to={`/player/${p.id}`}>{p.name}</Link></td><td>{teamName(p)}</td><td className="text-end fw-semibold">{p.average!=null?numberFormat.format(p.average):"—"}</td><td className="text-end">{apiStats(p)?.handicap??"—"}</td><td className="text-end">{p.games||"—"}</td><td className="text-end">{p.pinfall.toLocaleString()}</td><td className="text-end">{p.highGame||"—"}</td><td className="text-end">{p.highSeries||"—"}</td><td className="text-end">{apiStats(p)?.latestSeries??"—"}</td></tr>)}</tbody></Table></div></Card></div>;};

interface DetailMetric{label:string;get:(p:PlayerListEntry)=>number|null;integer?:boolean;zeroIsMissing?:boolean}
const detailMetrics:DetailMetric[]=[
    {label:"Average",get:p=>p.average},
    {label:"Handicap",get:p=>apiStats(p)?.handicap??null,integer:true},
    {label:"Games",get:p=>p.games,integer:true},
    {label:"Series Bowled",get:p=>apiStats(p)?.seriesCount??null,integer:true},
    {label:"Pinfall",get:p=>p.pinfall,integer:true},
    {label:"Avg Series",get:p=>apiStats(p)?.averageSeries??null},
    {label:"High Game",get:p=>p.highGame,integer:true,zeroIsMissing:true},
    {label:"High Series",get:p=>p.highSeries,integer:true,zeroIsMissing:true},
    {label:"High Hdcp Game",get:p=>apiStats(p)?.highHandicapGame??null,integer:true,zeroIsMissing:true},
    {label:"High Hdcp Series",get:p=>apiStats(p)?.highHandicapSeries??null,integer:true,zeroIsMissing:true},
    {label:"Known 200+ Games",get:p=>apiStats(p)?.known200Games??null,integer:true},
    {label:"Known 600+ Series",get:p=>apiStats(p)?.known600Series??null,integer:true},
    {label:"Known 700+ Series",get:p=>apiStats(p)?.known700Series??null,integer:true},
];
function populationSummary(players:PlayerListEntry[],metric:DetailMetric){const values=players.map(metric.get).filter((v):v is number=>v!=null&&Number.isFinite(v)&&(!metric.zeroIsMissing||v>0));if(values.length===0)return null;const avg=values.reduce((sum,v)=>sum+v,0)/values.length;const variance=values.reduce((sum,v)=>sum+(v-avg)**2,0)/values.length;return{avg,sd:Math.sqrt(variance),n:values.length};}
function formatMetric(value:number,integer=false){return integer?Math.round(value).toLocaleString():numberFormat.format(value);}
function historicalMetricValue(summary:ApiPlayerTimeframeSummary,metric:DetailMetric):number|null{switch(metric.label){case"Average":return summary.average;case"Handicap":return summary.handicap;case"Games":return summary.games;case"Series Bowled":return summary.seriesCount;case"Pinfall":return summary.pinfall;case"Avg Series":return summary.averageSeries;case"High Game":return summary.highGame;case"High Series":return summary.highSeries;case"High Hdcp Game":return summary.highHandicapGame;case"High Hdcp Series":return summary.highHandicapSeries;case"Known 200+ Games":return summary.known200Games;case"Known 600+ Series":return summary.known600Series;case"Known 700+ Series":return summary.known700Series;default:return null;}}
function scopedMetricValue(player:PlayerListEntry,metric:DetailMetric,timeframe:ApiPlayerTimeframe,summary:ApiPlayerTimeframeSummary|null):number|null{if(timeframe==="this-season"||summary==null)return metric.get(player);return historicalMetricValue(summary,metric);}

export const ApiPlayerDetail:FC<{playerId:string}>=({playerId})=>{
    const{data,isLoading,error}=usePlayerIndexData("api");
    const p=data?.find(c=>c.id===playerId);
    const currentTeamName=p?.appearanceSlices[0]?.teamName;
    const[timeframe,setTimeframe]=useState<ApiPlayerTimeframe>("career");

    const indexFetcher=useCallback(()=>apiPlayerHistoryIndexFetcher(),[]);
    const{data:indexData,isLoading:indexLoading,error:indexError}=useCachedFetcher<ApiPlayerHistoryIndexFile>(
        indexFetcher,
        API_PLAYER_HISTORY_INDEX_CACHE_CATEGORY,
    );
    const historicalEntry=useMemo(
        ()=>indexData&&p?findHistoricalPlayer(indexData,p.name,currentTeamName):null,
        [indexData,p,currentTeamName],
    );
    const sourcePlayerId=historicalEntry?.sourcePlayerId??0;
    const historyFile=historicalEntry?.historyFile??(sourcePlayerId>0?`${sourcePlayerId}.json`:"");
    const playerHistoryFetcher=useCallback(async():Promise<ApiHistoricalPlayerResult>=>({
        player:historyFile?await apiHistoricalPlayerFetcher(historyFile):null,
    }),[historyFile]);
    const{data:historyData,isLoading:historyLoading,error:historyError}=useCachedFetcher<ApiHistoricalPlayerResult>(
        playerHistoryFetcher,
        API_PLAYER_HISTORY_CACHE_CATEGORY,
        historyFile,
    );
    const historical=historyData?.player??null;
    const historicalPoints=useMemo(
        ()=>historical?pointsForApiPlayerTimeframe(historical.history,timeframe):[],
        [historical,timeframe],
    );
    const historicalSummary=useMemo(
        ()=>historical?summarizeApiPlayerHistory(historicalPoints):null,
        [historical,historicalPoints],
    );

    if(isLoading)return <Loader/>;
    if(error!=null)return <ErrorDisplay message="Error loading API player stats." error={error}/>;
    if(!p)return <ErrorDisplay message={`Player not found in API data: ${playerId}`}/>;

    const a=p.appearanceSlices[0],d=apiStats(p),players=data??[];
    const timeframeLabel=API_PLAYER_TIMEFRAME_OPTIONS.find(option=>option.value===timeframe)?.label??"Career";
    const archiveStatus=indexLoading||historyLoading
        ?"Loading historical archive…"
        :indexError||historyError||!historical
            ?"Historical archive unavailable; current-season data is still available."
            :timeframe==="this-season"
                ?"Current published league sheet"
                :`${timeframeLabel} · ${historicalPoints.filter(point=>(point.weekGames??0)>0).length} recorded scoring weeks`;

    return <div className="container-md">
        {Boolean(indexError||historyError)&&<Alert variant="danger" className="py-2"><strong>Historical data error:</strong> Some archived player history could not be loaded. Current-season stats are still available.</Alert>}
        <PlayerScorecard
            name={p.name}
            source="A.B.C. Data"
            context={(a?.teamName ?? "Substitute") + " · " + (a?.leagueName ?? "Beer League")}
            rivalryPath={buildRivalryPath("api", p.id)}
            recordsLabel="Season records · current sheet"
            records={[
                {label: "Scratch average", value: p.average != null ? numberFormat.format(p.average) : "—"},
                {label: "Games bowled", value: p.games.toLocaleString()},
                {label: "High game", value: p.highGame > 0 ? p.highGame.toLocaleString() : "—"},
                {label: "High series", value: p.highSeries > 0 ? p.highSeries.toLocaleString() : "—"},
            ]}
            latest={d && d.latestGames.length > 0 ? {
                label: "Latest on the sheet",
                context: "Current published league sheet",
                games: d.latestGames.map((score, i) => ({label: "Score " + (i + 1), score})),
                total: d.latestSeries,
                average: d.latestAverage,
                handicapTotal: d.latestHandicapSeries,
            } : null}
        />
        <p className="small text-body-secondary mb-3">{archiveStatus}</p>
        {historical&&<Suspense fallback={<Loader/>}><ApiPlayerHistoryCharts
            historical={historical}
            importedWeeks={indexData?.importedWeeks??0}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
        /></Suspense>}
        <Row className="g-3 mb-3">
            {detailMetrics.map(metric=>{
                const raw=scopedMetricValue(p,metric,timeframe,historicalSummary);
                const summary=timeframe==="this-season"?populationSummary(players,metric):null;
                const display=raw==null||(metric.zeroIsMissing&&raw===0)?"—":formatMetric(raw,metric.integer);
                return <Col xs={6} md={4} key={metric.label}>
                    <Card className="h-100 bls-profile-card"><CardBody>
                        <div className="small text-body-secondary">{metric.label}</div>
                        <div className="fs-4 fw-semibold">{display}</div>
                        {summary&&<div className="small text-body-secondary mt-1" title={`Across ${summary.n} API bowlers with available data`}>League avg {formatMetric(summary.avg)} · SD {formatMetric(summary.sd)}</div>}
                    </CardBody></Card>
                </Col>;
            })}
        </Row>
    </div>;
};

const apiLeaderboardMetrics: {id: ApiSort; label: string}[] = [
    {id: "average", label: "Average"},
    {id: "handicap", label: "Handicap"},
    {id: "games", label: "Games"},
    {id: "pinfall", label: "Total pinfall"},
    {id: "seriesCount", label: "Series bowled"},
    {id: "averageSeries", label: "Average series"},
    {id: "highGame", label: "High game"},
    {id: "highSeries", label: "High series"},
    {id: "highHandicapGame", label: "High handicap game"},
    {id: "highHandicapSeries", label: "High handicap series"},
    {id: "latestAverage", label: "Latest series average"},
    {id: "latestSeries", label: "Latest series"},
    {id: "known200Games", label: "Known 200+ games"},
    {id: "known600Series", label: "Known 600+ series"},
    {id: "known700Series", label: "Known 700+ series"},
];

function apiLeaderboardValue(player: PlayerListEntry, stat: ApiSort): number | null {
    switch (stat) {
        case "average": case "games": case "pinfall": return player[stat];
        case "highGame": case "highSeries": return player[stat] || null;
        case "highHandicapGame": case "highHandicapSeries": return apiStats(player)?.[stat] || null;
        default: return apiStats(player)?.[stat] ?? null;
    }
}

export const ApiPlayerLeaderboard: FC = () => {
    const {data, isLoading, error} = usePlayerIndexData("api");
    const [stat, setStat] = useState<ApiSort>("average");
    const [minGames, setMinGames] = useState(1);
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const teams = useMemo(() => [...new Set((data ?? []).map(teamName))].sort((a, b) => a.localeCompare(b)), [data]);
    const entries = useMemo(() => (data ?? [])
        .filter(player => player.games >= minGames && (selectedTeams.length === 0 || selectedTeams.includes(teamName(player))))
        .flatMap(player => {
            const value = apiLeaderboardValue(player, stat);
            return value != null && Number.isFinite(value) ? [{id: player.id, name: player.name, games: player.games, team: teamName(player), value}] : [];
        })
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)), [data, minGames, selectedTeams, stat]);

    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading A.B.C. leaderboard." error={error} />;

    const filters = <div className="bls-podium-filter-grid">
        <Form.Group controlId="api-leaderboard-stat">
            <Form.Label>Stat</Form.Label>
            <Form.Select value={stat} onChange={event => { setStat(event.target.value as ApiSort); }}>
                {apiLeaderboardMetrics.map(metric => <option key={metric.id} value={metric.id}>{metric.label}</option>)}
            </Form.Select>
        </Form.Group>
        <Form.Group controlId="api-leaderboard-games">
            <Form.Label>Minimum games</Form.Label>
            <Form.Select value={minGames} onChange={event => { setMinGames(Number(event.target.value)); }}>
                {[1, 3, 6, 9, 12].map(n => <option key={n} value={n}>{n}+</option>)}
            </Form.Select>
        </Form.Group>
        <div role="group" aria-label="Teams">
            <span className="bls-podium-filter-label">Teams</span>
            <TeamFilter teams={teams} selected={selectedTeams} onChange={setSelectedTeams} idPrefix="api-leaderboard-team" fullWidth />
        </div>
    </div>;

    const metric = apiLeaderboardMetrics.find(metric => metric.id === stat)?.label ?? "Average";
    return <LeaderboardPodium entries={entries} metric={metric} scope="A.B.C. Data · Current sheet"
        filters={filters} formatValue={value => numberFormat.format(value)} />;
};
