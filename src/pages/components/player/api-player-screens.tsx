import {Suspense, lazy, type FC, useCallback, useMemo, useState} from "react";
import {Link} from "react-router";
import {Alert, Badge, Card, CardBody, Col, Dropdown, Form, Row, Table} from "react-bootstrap";
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
const SortHeader:FC<{label:string;sortKey:ApiPlayerListSort;active:ApiPlayerListSort;dir:SortDir;onSort:(k:ApiPlayerListSort)=>void;className?:string}>=({label,sortKey,active,dir,onSort,className})=>{const selected=active===sortKey;return <th className={`bls-sortable-th ${className??""}${selected?" is-sorted":""}`} onClick={()=>{onSort(sortKey);}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSort(sortKey);}}} role="button" tabIndex={0} aria-sort={selected?(dir==="asc"?"ascending":"descending"):"none"}>{label}{selected?(dir==="asc"?" ▲":" ▼"):""}</th>;};
export const ApiPlayerList:FC<{title?:string;limit?:number}>=({title="API Player Stats",limit})=>{const{data,isLoading,error}=usePlayerIndexData();const[query,setQuery]=useState("");const[sort,setSort]=useState<ApiPlayerListSort>("average");const[sortDir,setSortDir]=useState<SortDir>("desc");const[selectedTeams,setSelectedTeams]=useState<string[]>([]);const teams=useMemo(()=>Array.from(new Set((data??[]).map(teamName))).sort((a,b)=>a.localeCompare(b)),[data]);const onSort=(k:ApiPlayerListSort)=>{if(k===sort)setSortDir(c=>c==="asc"?"desc":"asc");else{setSort(k);setSortDir(k==="name"||k==="team"?"asc":"desc");}};const toggleTeam=(t:string)=>{setSelectedTeams(c=>c.includes(t)?c.filter(n=>n!==t):[...c,t]);};const players=useMemo(()=>{const q=query.trim().toLocaleLowerCase();const rows=(data??[]).filter(p=>selectedTeams.length===0||selectedTeams.includes(teamName(p))).filter(p=>!q||`${p.name} ${teamName(p)}`.toLocaleLowerCase().includes(q)).sort((a,b)=>compare(a,b,sort,sortDir));return limit?rows.slice(0,limit):rows;},[data,query,sort,sortDir,selectedTeams,limit]);if(isLoading)return <Loader/>;if(error!=null)return <ErrorDisplay message="Error loading API player stats." error={error}/>;const teamLabel=selectedTeams.length===0?"All teams":selectedTeams.length===1?selectedTeams[0]:`${selectedTeams.length} teams`;return <div><Card className="bls-profile-card"><CardBody className="d-flex flex-wrap gap-2 align-items-center justify-content-between"><div><strong>{title}</strong> <Badge bg="secondary" pill>{players.length} bowlers</Badge></div><div className="d-flex flex-wrap gap-2"><Form.Control size="sm" type="search" placeholder="Search bowler or team" value={query} onChange={e=>{setQuery(e.target.value);}} style={{maxWidth:240}}/><Dropdown autoClose="outside"><Dropdown.Toggle size="sm" variant="outline-secondary">{teamLabel}</Dropdown.Toggle><Dropdown.Menu style={{maxHeight:320,overflowY:"auto",minWidth:220}}><Dropdown.Header>Teams</Dropdown.Header><Dropdown.Item as="button" onClick={()=>{setSelectedTeams([]);}} active={selectedTeams.length===0}>All teams</Dropdown.Item><Dropdown.Divider/>{teams.map(t=><div className="px-3 py-1" key={t}><Form.Check type="checkbox" id={`api-team-${t.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}`} label={t} checked={selectedTeams.includes(t)} onChange={()=>{toggleTeam(t);}}/></div>)}</Dropdown.Menu></Dropdown></div></CardBody><div className="table-responsive"><Table hover size="sm" className="mb-0 align-middle"><thead><tr><th>#</th><SortHeader label="Bowler" sortKey="name" active={sort} dir={sortDir} onSort={onSort}/><SortHeader label="Team" sortKey="team" active={sort} dir={sortDir} onSort={onSort}/><SortHeader label="Avg" sortKey="average" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="Hdcp" sortKey="handicap" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="Games" sortKey="games" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="Pins" sortKey="pinfall" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="HG" sortKey="highGame" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="HS" sortKey="highSeries" active={sort} dir={sortDir} onSort={onSort} className="text-end"/><SortHeader label="Latest" sortKey="latestSeries" active={sort} dir={sortDir} onSort={onSort} className="text-end"/></tr></thead><tbody>{players.length===0&&<tr><td colSpan={10} className="text-center py-4">No bowlers match the filters.</td></tr>}{players.map((p,i)=><tr key={p.id}><td>{i+1}</td><td><Link className="bls-link fw-semibold" to={`/player/${p.id}`}>{p.name}</Link></td><td>{teamName(p)}</td><td className="text-end fw-semibold">{p.average!=null?numberFormat.format(p.average):"—"}</td><td className="text-end">{apiStats(p)?.handicap??"—"}</td><td className="text-end">{p.games||"—"}</td><td className="text-end">{p.pinfall.toLocaleString()}</td><td className="text-end">{p.highGame||"—"}</td><td className="text-end">{p.highSeries||"—"}</td><td className="text-end">{apiStats(p)?.latestSeries??"—"}</td></tr>)}</tbody></Table></div></Card></div>;};

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
    const{data,isLoading,error}=usePlayerIndexData();
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
    const playerHistoryFetcher=useCallback(async():Promise<ApiHistoricalPlayerResult>=>({
        player:sourcePlayerId>0?await apiHistoricalPlayerFetcher(sourcePlayerId):null,
    }),[sourcePlayerId]);
    const{data:historyData,isLoading:historyLoading,error:historyError}=useCachedFetcher<ApiHistoricalPlayerResult>(
        playerHistoryFetcher,
        API_PLAYER_HISTORY_CACHE_CATEGORY,
        String(sourcePlayerId),
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
        <div className="bls-compare-hero mb-3">
            <span className="bls-hero-kicker">API Player</span>
            <h1>{p.name}</h1>
            <div className="text-body-secondary">{a?.teamName??"Substitute"} · {a?.leagueName??"Beer League"}</div>
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mt-3">
                <div className="small text-body-secondary">{archiveStatus}</div>
                <div style={{minWidth:190}}>
                    <Form.Label className="small mb-1" htmlFor="api-player-timeframe">Time frame</Form.Label>
                    <Form.Select
                        id="api-player-timeframe"
                        size="sm"
                        value={timeframe}
                        onChange={e=>{setTimeframe(e.target.value as ApiPlayerTimeframe);}}
                    >
                        {API_PLAYER_TIMEFRAME_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
                    </Form.Select>
                </div>
            </div>
        </div>
        {d&&d.latestGames.length>0&&<Card className="bls-profile-card mb-3">
            <CardBody>
                <h5>Latest Series <span className="text-body-secondary fw-normal small">(Current Sheet)</span></h5>
                <Row className="g-2">{d.latestGames.map((score,i)=><Col xs={4} key={i}><div className="bls-stat-tile"><div className="bls-stat-label">Game {i+1}</div><div className="bls-stat-value">{score}</div></div></Col>)}</Row>
                <div className="mt-3 d-flex flex-wrap gap-4">
                    <span><strong>Scratch:</strong> {d.latestSeries??"—"}</span>
                    <span><strong>Average:</strong> {d.latestAverage!=null?numberFormat.format(d.latestAverage):"—"}</span>
                    <span><strong>Low:</strong> {d.latestLowGame??"—"}</span>
                    <span><strong>High:</strong> {d.latestHighGame??"—"}</span>
                    <span><strong>Hdcp Series:</strong> {d.latestHandicapSeries??"—"}</span>
                </div>
            </CardBody>
        </Card>}
        {historical&&<Suspense fallback={<Loader/>}><ApiPlayerHistoryCharts
            historical={historical}
            importedWeeks={indexData?.importedWeeks??0}
            timeframe={timeframe}
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

export const ApiPlayerLeaderboard:FC=()=>{const{data,isLoading,error}=usePlayerIndexData();const[stat,setStat]=useState<ApiSort>("average");const[minGames,setMinGames]=useState(1);const[selectedTeams,setSelectedTeams]=useState<string[]>([]);const teams=useMemo(()=>Array.from(new Set((data??[]).map(teamName))).sort((a,b)=>a.localeCompare(b)),[data]);const toggleTeam=(t:string)=>{setSelectedTeams(c=>c.includes(t)?c.filter(n=>n!==t):[...c,t]);};const ranked=useMemo(()=>(data??[]).filter(p=>p.games>=minGames).filter(p=>selectedTeams.length===0||selectedTeams.includes(teamName(p))).sort((a,b)=>value(b,stat)-value(a,stat)||a.name.localeCompare(b.name)),[data,stat,minGames,selectedTeams]);if(isLoading)return <Loader/>;if(error!=null)return <ErrorDisplay message="Error loading API leaderboard." error={error}/>;const options:[ApiSort,string][]=[["average","Average"],["handicap","Handicap"],["games","Games"],["pinfall","Total pinfall"],["seriesCount","Series bowled"],["averageSeries","Average series"],["highGame","High game"],["highSeries","High series"],["highHandicapGame","High handicap game"],["highHandicapSeries","High handicap series"],["latestAverage","Latest series average"],["latestSeries","Latest series"],["known200Games","Known 200+ games"],["known600Series","Known 600+ series"],["known700Series","Known 700+ series"]];const teamLabel=selectedTeams.length===0?"All teams":selectedTeams.length===1?selectedTeams[0]:`${selectedTeams.length} teams`;return <div className="container-md"><div className="bls-compare-hero mb-3"><span className="bls-hero-kicker">API Data</span><h1>Leaderboard</h1></div><Card className="bls-profile-card bls-dropdown-card mb-3"><CardBody><Row className="g-3"><Col md={4}><Form.Label>Stat</Form.Label><Form.Select value={stat} onChange={e=>{setStat(e.target.value as ApiSort);}}>{options.map(([k,l])=><option key={k} value={k}>{l}</option>)}</Form.Select></Col><Col md={4}><Form.Label>Minimum games</Form.Label><Form.Select value={minGames} onChange={e=>{setMinGames(Number(e.target.value));}}>{[1,3,6,9,12].map(g=><option key={g} value={g}>{g}+</option>)}</Form.Select></Col><Col md={4}><Form.Label>Teams</Form.Label><Dropdown autoClose="outside"><Dropdown.Toggle variant="outline-secondary" className="w-100 text-start">{teamLabel}</Dropdown.Toggle><Dropdown.Menu style={{maxHeight:320,overflowY:"auto",minWidth:220}}><Dropdown.Header>Teams</Dropdown.Header><Dropdown.Item as="button" onClick={()=>{setSelectedTeams([]);}} active={selectedTeams.length===0}>All teams</Dropdown.Item><Dropdown.Divider/>{teams.map(t=><div className="px-3 py-1" key={t}><Form.Check type="checkbox" id={`api-leaderboard-team-${t.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}`} label={t} checked={selectedTeams.includes(t)} onChange={()=>{toggleTeam(t);}}/></div>)}</Dropdown.Menu></Dropdown></Col></Row></CardBody></Card><Card className="bls-profile-card"><div className="table-responsive"><Table hover className="mb-0"><thead><tr><th>#</th><th>Bowler</th><th>Team</th><th className="text-end">Value</th></tr></thead><tbody>{ranked.length===0&&<tr><td colSpan={4} className="text-center py-4">No bowlers match the selected teams and minimum games.</td></tr>}{ranked.map((p,i)=><tr key={p.id}><td>{i+1}</td><td><Link className="bls-link fw-semibold" to={`/player/${p.id}`}>{p.name}</Link></td><td>{teamName(p)}</td><td className="text-end fw-semibold">{["average","averageSeries","latestAverage"].includes(stat)?numberFormat.format(value(p,stat)):value(p,stat).toLocaleString()}</td></tr>)}</tbody></Table></div></Card></div>;};

export const ApiPlayerCompare:FC=()=> <Alert variant="secondary">Player Compare uses Frame Data because its detailed comparison categories require frame-level scoring.</Alert>;
