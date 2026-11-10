import {useId, useMemo, useRef, useState} from "react";
import {ArrowLeftRight, ArrowRight, Check2, Copy, LightningChargeFill} from "react-bootstrap-icons";
import {useSearchParams} from "react-router";
import type {DataSource} from "../data-source";
import {readStorage} from "../safe-storage";
import {buildRivalryPath, resolveRivalry, type RivalBowler} from "./rivalry-data";

interface Scope {mode: "career" | "season"; season?: string; leagueId?: string}
const numberFormat = new Intl.NumberFormat("en-US", {maximumFractionDigits: 1});

export function useRivalryMatchup(rows: RivalBowler[], source: DataSource, scope?: Scope) {
    const [params, setParams] = useSearchParams();
    const [savedId] = useState(() => readStorage("bls-home-bowler-" + source));
    const requestedA = params.get("a"), requestedB = params.get("b");
    const pair = useMemo(() => resolveRivalry(rows, requestedA, requestedB, savedId), [rows, requestedA, requestedB, savedId]);
    const sharePath = buildRivalryPath(source, pair.a?.id ?? "", pair.b?.id, scope);
    function update(a: string, b?: string) {
        const path = buildRivalryPath(source, a, b, scope);
        setParams(new URLSearchParams(path.split("?")[1]), {replace: true});
    }
    function choose(side: "a" | "b", id: string) {
        if (side === "a") {
            const next = resolveRivalry(rows, id, null, null);
            update(next.a?.id ?? "", next.b?.id);
        } else if (pair.a && id !== pair.a.id && rows.some(row => row.id === id && row.games > 0)) {
            update(pair.a.id, id);
        }
    }
    function swap() { if (pair.a && pair.b) update(pair.b.id, pair.a.id); }
    const selectionAdjusted = Boolean(rows.length && ((requestedA && requestedA !== pair.a?.id) || (requestedB && requestedB !== pair.b?.id)));
    return {...pair, choose, swap, sharePath, selectionAdjusted};
}

export default function RivalryStudio({source, scopeLabel, rows, matchup}: {
    source: DataSource; scopeLabel: string; rows: RivalBowler[];
    matchup: ReturnType<typeof useRivalryMatchup>;
}) {
    const {a, b, suggestions, choose, swap, sharePath} = matchup;
    const fieldId = useId();
    const linkInput = useRef<HTMLInputElement>(null);
    const [copyState, setCopyState] = useState<{path: string; result: "copied" | "manual"} | null>(null);
    const currentCopy = copyState && copyState.path === sharePath ? copyState.result : null;
    const shareUrl = window.location.origin + window.location.pathname + "#" + sharePath;
    async function copyLink() {
        try {
            if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
            await navigator.clipboard.writeText(shareUrl);
            setCopyState({path: sharePath, result: "copied"});
        } catch { setCopyState({path: sharePath, result: "manual"}); }
    }
    return <section className="bls-rivalry-studio" aria-labelledby={fieldId + "-title"}>
        <header className="bls-rivalry-header">
            <div><span className="bls-rivalry-kicker"><LightningChargeFill aria-hidden="true"/> Head to head, without the guesswork</span>
                <h1 id={fieldId + "-title"}>Rivalry Studio<span aria-hidden="true">.</span></h1>
                <p>Pick a bowler. Find a rival. Let the numbers talk.</p></div>
            <span className="bls-rivalry-source">{source === "api" ? "A.B.C. Data" : "BinBin Data"}<small>{scopeLabel}</small></span>
        </header>
        <div className="bls-rivalry-pickers">
            <div><label htmlFor={fieldId + "-a"}>Your bowler</label>
                <select id={fieldId + "-a"} value={a?.id ?? ""} disabled={!a} onChange={event => { choose("a", event.target.value); }}>
                    {!a && <option value="">No recorded games in this scope</option>}
                    {rows.filter(row => row.games > 0).map(row => <option value={row.id} key={row.id}>{row.name}{row.teamName ? " · " + row.teamName : ""}</option>)}
                </select></div>
            <button className="bls-rivalry-swap" type="button" aria-label="Swap bowlers" disabled={!a || !b} onClick={swap}><ArrowLeftRight aria-hidden="true"/></button>
            <div><label htmlFor={fieldId + "-b"}>The challenger</label>
                <select id={fieldId + "-b"} value={b?.id ?? ""} disabled={!b} onChange={event => { choose("b", event.target.value); }}>
                    {!b && <option value="">Another bowler needs recorded games</option>}
                    {rows.filter(row => row.games > 0).map(row => <option value={row.id} key={row.id} disabled={row.id === a?.id}>{row.name}{row.teamName ? " · " + row.teamName : ""}</option>)}
                </select></div>
        </div>
        {matchup.selectionAdjusted && <p className="bls-rivalry-method" role="status">Some linked bowlers are unavailable in this scope. Showing an available matchup.</p>}
        {a && suggestions.length > 0 ? <div className="bls-rivalry-suggestions">
            <div className="bls-rivalry-section-heading"><h2>Close averages. Good company.</h2><p>Suggested rivals for {a.name}, using the same scope.</p></div>
            <div className="bls-rivalry-options">{suggestions.map(rival => <button type="button" key={rival.id} aria-label={"Compare " + a.name + " with " + rival.name}
                aria-pressed={b?.id === rival.id} className="bls-rivalry-option" onClick={() => { choose("b", rival.id); }}>
                <span className="bls-rivalry-rival-name">{rival.name}<ArrowRight aria-hidden="true"/></span>
                <span className="bls-rivalry-team">{rival.teamName || "League bowler"}</span>
                <strong>{numberFormat.format(rival.average!)}<small> average</small></strong>
                <span className="bls-rivalry-gap">{numberFormat.format(rival.gap)} pins apart <span>· {rival.games} games</span></span>
            </button>)}</div>
            <p className="bls-rivalry-method">Based on recorded averages, not a prediction. Game counts show the sample behind each number.</p>
        </div> : <p className="bls-rivalry-method" role="status">{a ? rows.filter(row => row.games > 0).length < 2 ? "A comparison needs two bowlers with recorded games in this scope." : "Not enough recorded averages to suggest a rival in this scope. You can still choose another bowler." : source === "api" ? "The current league sheet has no bowlers with recorded games yet." : "No recorded games in this scope yet. Choose another season or league below."}</p>}
        {a && b && <div className="bls-rivalry-share">
            <p><strong>{a.name} <span>vs.</span> {b.name}</strong><small>Your detailed comparison is ready below.</small></p>
            <button type="button" onClick={() => { void copyLink(); }}>{currentCopy === "copied" ? <Check2 aria-hidden="true"/> : <Copy aria-hidden="true"/>}{currentCopy === "copied" ? "Link copied" : "Copy matchup link"}</button>
            {currentCopy === "manual" && <div className="bls-rivalry-manual-link"><label htmlFor={fieldId + "-link"}>Select and copy the matchup link below.</label><input ref={linkInput} id={fieldId + "-link"} aria-label="Matchup link" readOnly value={shareUrl} onFocus={() => { linkInput.current?.select(); }}/></div>}
            <span className="visually-hidden" role="status">{currentCopy === "copied" ? "Link copied" : currentCopy === "manual" ? "Select and copy the matchup link below." : ""}</span>
        </div>}
    </section>;
}
