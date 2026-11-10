import {type FC, useMemo, useState} from "react";
import {Badge, Card, CardBody, Table} from "react-bootstrap";
import type {PlayerPerformanceSession} from "../../../data/player/player-aggregate";
import {buildPracticePlan, comparePerformance} from "../../../data/player/performance-insights";

function dateLabel(date: string) {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {month:"short",day:"numeric",year:"numeric"});
}
function periodLabel(period: {date:string}[]) {
    return period.length ? `${dateLabel(period[period.length-1].date)} – ${dateLabel(period[0].date)}` : "No dated games";
}
function valueLabel(value: number | null, unit: string, id?: string) {
    return value == null ? "—" : `${value.toFixed(id === "firstBall" ? 2 : 1)}${unit === "pp" ? "%" : ""}`;
}
export const InsightsPanel: FC<{name:string;sessions:PlayerPerformanceSession[]}> = ({name,sessions}) => {
    const [windowSize,setWindowSize] = useState<number | "season">(6);
    const [leagueId,setLeagueId] = useState("all");
    const leagues = useMemo(() => [...new Map(sessions.map(s => windowSize === "season" ? [s.leagueName,s.leagueName] : [s.leagueId,s.season ? `${s.leagueName} · ${s.season}` : s.leagueName])).entries()].sort((a,b) => a[1].localeCompare(b[1])),[sessions,windowSize]);
    const comparison = useMemo(() => comparePerformance(sessions,windowSize,leagueId),[sessions,windowSize,leagueId]);
    const {recent,previous,recentStats,previousStats,enoughGames,metrics,trends,strengths} = comparison;
    const practicePlan = buildPracticePlan(comparison);
    return <div className="bls-insights">
        <Card className="bls-profile-card mb-3">
            <div className="bls-profile-card-head">Performance over time</div>
            <CardBody>
                <p>Compare {name}’s recent bowling with the preceding period. Advice follows changes in your own results.</p>
                <div className="bls-allstats-filters mb-3">
                    <label className="bls-allstats-filter"><span>Comparison window</span><select className="form-select form-select-sm" aria-label="Comparison window" value={windowSize} onChange={e=>{setWindowSize(e.target.value === "season" ? "season" : Number(e.target.value));setLeagueId("all");}}>
                        <option value="season">Latest season vs previous season</option><option value={3}>Latest 3 sessions vs previous 3</option><option value={6}>Latest 6 sessions vs previous 6</option><option value={12}>Latest 12 sessions vs previous 12</option>
                    </select></label>
                    <label className="bls-allstats-filter"><span>League</span><select className="form-select form-select-sm" aria-label="Insights league" value={leagueId} onChange={e=>{setLeagueId(e.target.value);}}><option value="all">All leagues</option>{leagues.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
                </div>
                <div className="row g-3">
                    <div className="col-sm-6"><strong>{comparison.seasonMode ? `Latest season (${comparison.recentSeason ?? "unavailable"}):` : "Recent:"} {recent.length} sessions · {recentStats.gameStats.count} games</strong><div className="small text-body-secondary">{periodLabel(recent)}</div></div>
                    <div className="col-sm-6"><strong>{comparison.seasonMode ? `Previous season (${comparison.previousSeason ?? "unavailable"}):` : "Previous:"} {previous.length} sessions · {previousStats.gameStats.count} games</strong><div className="small text-body-secondary">{periodLabel(previous)}</div></div>
                </div>
                <p className="small text-body-secondary mt-3 mb-0">A session includes all games on one bowling date. {comparison.seasonMode ? "Season comparisons use all dated games in your two latest available seasons. Different game counts are compared using averages and conversion rates. " : "Periods never overlap and end at the latest loaded result. "}{typeof windowSize === "number" && comparison.size < windowSize && "There are fewer dates available, so both periods use the same smaller number of sessions. "}{leagueId === "all" && "League and lane conditions may differ; select a league for a closer comparison."}</p>
            </CardBody>
        </Card>
        {!enoughGames && <Card className="bls-profile-card mb-3"><CardBody>More history is needed for reliable advice: at least two sessions and six games in each period. Available results are shown below without trend conclusions.</CardBody></Card>}
        <Card className="bls-profile-card mb-3">
            <div className="bls-profile-card-head">{comparison.seasonMode ? "Latest season vs previous season" : "Recent vs previous"}</div>
            <div className="table-responsive"><Table className="mb-0 align-middle"><thead><tr><th scope="col">Metric</th><th scope="col" className="text-end">Previous</th><th scope="col" className="text-end">Recent</th><th scope="col" className="text-end">Change</th></tr></thead><tbody>{metrics.map(metric=>{
                const trend=trends.find(t=>t.id===metric.id);
                return <tr key={metric.id}><th scope="row">{metric.label}</th><td className="text-end">{valueLabel(metric.previous,metric.unit,metric.id)}</td><td className="text-end">{valueLabel(metric.recent,metric.unit,metric.id)}</td><td className="text-end text-nowrap">{trend?<><span>{trend.delta>0?"+":""}{trend.delta.toFixed(metric.id === "firstBall" ? 2 : 1)} {metric.unit}</span><br/><Badge bg={trend.status==="improving"?"success":trend.status==="declining"?"warning":"secondary"} text={trend.status==="declining"?"dark":undefined}>{trend.status==="improving"?"Improving":trend.status==="declining"?"Needs attention":"Steady"}</Badge></>:"—"}</td></tr>;
            })}</tbody></Table></div>
            <CardBody className="small text-body-secondary">Percentage changes are percentage points (pp). Frame rates require complete frame data and at least 10 opportunities in each period; first-ball averages require 20 shots. A dash means the sample is too small or unavailable. Changes of 3 pins in average, 3 percentage points in rates, or 0.2 pins on the first ball guide the labels; these are practice signals, not statistical certainty.</CardBody>
        </Card>
        <Card className="bls-profile-card mb-3">
            <div className="bls-profile-card-head">What to work on next</div>
            <CardBody>
                {practicePlan.length ? <>
                    <p className="small text-body-secondary">Start with one focus in your next practice. These targets come from your own comparison periods; overlapping spare statistics are combined into one priority.</p>
                    <div className="row g-3">{practicePlan.map((item,index)=><div className="col-lg-6" key={item.id}>
                        <section className="border rounded-3 p-3 h-100" aria-label={item.title}>
                            <Badge bg={item.status === "Rebuild" ? "warning" : "primary"} text={item.status === "Rebuild" ? "dark" : undefined} className="mb-2">{index === 0 ? "Start here" : "Then work on"} · {item.status}</Badge>
                            <h2 className="h5">{item.title}</h2><p className="fw-semibold mb-2">{item.evidence}</p><p className="small text-body-secondary">{item.reason}</p>
                            <h3 className="h6">Next practice</h3><ol className="ps-3">{item.drill.map(step=><li className="mb-2" key={step}>{step}</li>)}</ol>
                            <h3 className="h6">Your target</h3><p>{item.goal}</p><p className="small text-body-secondary mb-0">{item.review}</p>
                        </section>
                    </div>)}</div>
                </>:<p className="mb-0">Build a useful baseline: log first-ball results and spare attempts for your next three sessions. Once both comparison periods contain at least two sessions and six games, this section will give you a specific drill and target.</p>}
            </CardBody>
        </Card>
        {strengths.length>0 && <Card className="bls-profile-card mb-3"><div className="bls-profile-card-head">What is improving</div><CardBody>{strengths.map(item=><p key={item.id} className="mb-2"><strong>{item.label}</strong>: {valueLabel(item.previous,item.unit,item.id)} → {valueLabel(item.recent,item.unit,item.id)}. {item.lowerIsBetter?"Fewer open frames":"Keep the routine that supports this progress"}.</p>)}</CardBody></Card>}
    </div>;
};
export default InsightsPanel;
