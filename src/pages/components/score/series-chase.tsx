import {useId, useState} from "react";
import {ArrowClockwise, ArrowRight, Bullseye, Check2Circle, LightningChargeFill} from "react-bootstrap-icons";
import {calculateSeriesChase} from "./series-chase-math";

const numberFormat = new Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const TARGETS = [500, 600, 700, 800];

export default function SeriesChase() {
    const id = useId();
    const [target, setTarget] = useState("600");
    const [games, setGames] = useState(["", "", ""]);
    const plan = calculateSeriesChase(target, games);
    const result = plan.status === "invalid" ? null : plan;
    function changeGame(index: number, value: string) {
        setGames(previous => previous.map((score, slot) => slot === index ? value : score));
    }
    const isPace = result?.status === "ready" || result?.status === "chasing";
    const statusLabel = !result ? "Check your scores" : result.status === "secured" ? "Target reached" : result.status === "missed" ? "Series complete" : result.status === "out-of-reach" ? "Your new ceiling" : result.remaining === 1 ? "Your last-game target" : "Your required pace";
    const mainValue = result ? isPace ? numberFormat.format(result.pace ?? 0) : String(result.status === "out-of-reach" ? result.ceiling : result.total) : "—";

    return <section className="bls-series-chase" aria-labelledby={id + "-title"}>
        <header className="bls-chase-header">
            <span className="bls-chase-kicker"><LightningChargeFill aria-hidden="true"/> A plan for league night</span>
            <h1 id={id + "-title"}>Series Chase<span>.</span></h1>
            <p>Three games. One target. Make the next game count.</p>
            <span className="bls-chase-scope">3-game scratch series</span>
        </header>
        <div className="bls-chase-workspace">
            <div className="bls-chase-inputs">
                <fieldset className="bls-chase-targets">
                    <legend>What are you chasing?</legend>
                    <div className="bls-chase-presets">{TARGETS.map(value => <button key={value} type="button" aria-pressed={target === String(value)} onClick={() => { setTarget(String(value)); }}>{value}</button>)}</div>
                    <label htmlFor={id + "-target"}>Series target <span>1–900 pins</span></label>
                    <input id={id + "-target"} className="bls-chase-target-input" type="text" inputMode="numeric" maxLength={3} value={target}
                        aria-invalid={Boolean(plan.errors.target)} aria-describedby={plan.errors.target ? id + "-target-error" : undefined}
                        onChange={event => { setTarget(event.target.value); }}/>
                    {plan.errors.target && <p className="bls-chase-error" id={id + "-target-error"}>{plan.errors.target}</p>}
                </fieldset>
                <fieldset className="bls-chase-games">
                    <legend>Your scores so far</legend>
                    <p id={id + "-score-help"}>Enter completed games in order. Leave unplayed games blank. Scratch scores only, 0–300.</p>
                    {games.map((score, index) => <div className="bls-chase-game" key={index}>
                        <span className="bls-chase-game-index" aria-hidden="true">0{index + 1}</span>
                        <label htmlFor={id + "-game-" + index}>Game {index + 1} score</label>
                        <input id={id + "-game-" + index} type="text" inputMode="numeric" maxLength={3} placeholder="Not played" value={score}
                            aria-invalid={Boolean(plan.errors.games[index])} aria-describedby={id + "-score-help" + (plan.errors.games[index] ? " " + id + "-game-error-" + index : "")}
                            onChange={event => { changeGame(index, event.target.value); }}/>
                        {plan.errors.games[index] && <p className="bls-chase-error" id={id + "-game-error-" + index}>{plan.errors.games[index]}</p>}
                    </div>)}
                </fieldset>
                <button className="bls-chase-reset" type="button" onClick={() => { setGames(["", "", ""]); }}><ArrowClockwise aria-hidden="true"/> Reset scores</button>
            </div>
            <aside className="bls-chase-result" data-status={plan.status} aria-label="Series plan" aria-live="polite" aria-atomic="true">
                <div className="bls-chase-result-top"><span><Bullseye aria-hidden="true"/> Your path to {result?.target ?? "the target"}</span><span>{result ? result.completed + " / 3 complete" : "3 games"}</span></div>
                <div className="bls-chase-readout">
                    <span className="bls-chase-status">{result?.status === "secured" && <Check2Circle aria-hidden="true"/>}{statusLabel}</span>
                    <strong className="bls-chase-number">{mainValue}</strong>
                    <span className="bls-chase-unit">{!result ? "Fix the highlighted inputs to continue." : isPace ? result.remaining === 1 ? "pins in Game 3" : result.completed === 0 ? "average per game" : "average per remaining game" : result.status === "out-of-reach" ? "maximum possible series" : "scratch pins recorded"}</span>
                </div>
                {result ? <>
                    <p className="bls-chase-explanation">{result.status === "secured" ? "You reached at least " + result.target + ". " + (result.remaining ? "Every next pin builds on it." : "That target is in the books.")
                        : result.status === "missed" ? "You finished " + result.pinsNeeded + " pins short of " + result.target + ". Start a new chase whenever you’re ready."
                        : result.status === "out-of-reach" ? "The " + result.target + " target is beyond this series’ current maximum. There’s still a finish to chase."
                        : result.pinsNeeded + " more pins across " + result.remaining + (result.remaining === 1 ? " game" : " games") + " to reach at least " + result.target + "."}</p>
                    <div className="bls-chase-progress-label"><span>{result.total} recorded</span><span>{result.target} target</span></div>
                    <progress max={result.target} value={Math.min(result.total, result.target)} aria-label="Progress toward series target">{Math.round(result.progress)}%</progress>
                    {isPace && <div className="bls-chase-finish">
                        <h2>One way to get there</h2>
                        <ol>{result.finish.map((score, index) => <li key={index}><span>Game {result.completed + index + 1}</span><strong>{score}</strong></li>)}</ol>
                        <p>Any combination totaling at least {result.pinsNeeded} more pins works.</p>
                    </div>}
                    <dl className="bls-chase-facts">
                        <div><dt>Possible series ceiling</dt><dd>{result.ceiling}</dd></div>
                        {result.minNext != null && result.remaining > 1 ? <div><dt>Minimum next game to stay in reach</dt><dd>{result.minNext}</dd></div> : <div><dt>Games completed</dt><dd>{result.completed}<small> / 3</small></dd></div>}
                    </dl>
                    {result.minNext != null && result.remaining > 1 && isPace && <p className="bls-chase-floor-note">At least {result.minNext} next game keeps the target reachable with up to 300 in each later game.</p>}
                    {result.status === "out-of-reach" && result.remaining > 0 && <button className="bls-chase-retarget" type="button" onClick={() => { setTarget(String(result.ceiling)); }}>Chase {result.ceiling} instead <ArrowRight aria-hidden="true"/></button>}
                </> : <p className="bls-chase-explanation">Use whole game totals from 0 to 300 and a target from 1 to 900. Blank games remain unplayed.</p>}
            </aside>
        </div>
    </section>;
}
