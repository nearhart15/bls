import {useId, useMemo, useState} from "react";
import {ArrowRight, Bullseye, Search, Trophy} from "react-bootstrap-icons";
import {Link} from "react-router";

import type {PlayerListEntry} from "../../../data/player/player-aggregate";
import {type DataSource, useDataSource} from "../data-source";
import {usePlayerIndexData} from "../player/use-player-index-data";
import {readStorage, writeStorage} from "../safe-storage";
import {bowlerSeasonPreview, bowlerTeamNames, currentBowlerSeason, findBowlers} from "./bowler-launchpad-data";

const averageFormat = new Intl.NumberFormat("en-US", {minimumFractionDigits: 1, maximumFractionDigits: 1});

function BowlerFinder({source}: {source: DataSource}) {
    const {data, isLoading, error} = usePlayerIndexData(source);
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState(() => readStorage(`bls-home-bowler-${source}`));
    const inputId = useId();
    const resultsId = useId();
    const players = useMemo(() => findBowlers(data ?? [], query), [data, query]);
    const season = currentBowlerSeason(data ?? []);
    const selected = data?.find(player => player.id === selectedId) ?? findBowlers(data ?? [], "")[0];
    const stats = selected ? bowlerSeasonPreview(selected, season) : null;
    const selectedTeams = selected ? bowlerTeamNames(selected, season).join(" · ") : "";

    function choose(player: PlayerListEntry) {
        setSelectedId(player.id);
        writeStorage(`bls-home-bowler-${source}`, player.id);
    }

    return (
        <section className="bls-launchpad" aria-labelledby="launchpad-title">
            <div className="bls-launchpad-intro">
                <div className="bls-launchpad-eyebrow"><span/> Pins Go Boom! & friends</div>
                <h1 id="launchpad-title">Your game.<br/><span>Front and center.</span></h1>
                <p className="bls-launchpad-copy">Every score tells a story. Find yours.</p>

                <form className="bls-bowler-finder" role="search" onSubmit={event => {
                    event.preventDefault();
                    if (players[0]) choose(players[0]);
                }}>
                    <label htmlFor={inputId}>Find your bowler</label>
                    <div className="bls-bowler-search">
                        <Search aria-hidden="true"/>
                        <input id={inputId} type="search" autoComplete="off" value={query}
                            placeholder="Search name or team…" aria-controls={resultsId}
                            onChange={event => { setQuery(event.target.value); }}/>
                    </div>
                    <div id={resultsId} className="bls-bowler-results" aria-busy={isLoading}>
                        {isLoading ? <p role="status">Finding your league’s bowlers…</p>
                            : error ? <p role="status">Bowler search is unavailable. <Link to="/player">Try the player directory <ArrowRight/></Link></p>
                            : players.length === 0 ? <p role="status">{query.trim() ? `No bowlers match “${query}”. Try a name or team.` : "No bowlers are available for this source yet."}</p>
                            : <>
                                <p className="bls-bowler-results-label" role="status">{query.trim() ? `${players.length} ${players.length === 1 ? "bowler" : "bowlers"} found` : "Start with a familiar face"}</p>
                                <div className="bls-bowler-choices">
                                    {players.slice(0, 4).map(player => <button key={player.id} type="button"
                                        className="bls-bowler-choice" aria-pressed={selected?.id === player.id}
                                        onClick={() => { choose(player); }}>
                                        <span className="bls-bowler-initial" aria-hidden="true">{player.name.trim().slice(0, 1)}</span>
                                        <span className="bls-bowler-choice-text"><strong>{player.name}</strong><small>{bowlerTeamNames(player).join(" · ") || "League bowler"}</small></span>
                                        <ArrowRight aria-hidden="true"/>
                                    </button>)}
                                </div>
                                {players.length > 4 && <Link className="bls-bowler-directory" to="/player">Explore all bowlers <ArrowRight aria-hidden="true"/></Link>}
                            </>}
                    </div>
                </form>
            </div>

            <div className="bls-bowler-pass" aria-label="Bowler season preview" aria-live="polite" aria-atomic="true">
                <div className="bls-bowler-pass-top"><span><Bullseye aria-hidden="true"/> Season snapshot</span><span className="bls-bowler-pass-mark" aria-hidden="true">BLS / 01</span></div>
                {selected && stats && !isLoading && !error ? <>
                    <div className="bls-bowler-identity">
                        <span className="bls-bowler-monogram" aria-hidden="true">{selected.name.trim().slice(0, 1)}</span>
                        <span className="bls-bowler-scope">{source === "api" ? "Current league sheet" : "BinBin season"}{season ? ` · ${season}` : ""}</span>
                        <h2>{selected.name}</h2>
                        <p>{selectedTeams || "No team recorded this season"}</p>
                    </div>
                    <dl className="bls-bowler-numbers">
                        <div className="bls-bowler-average"><dt>Season average</dt><dd>{stats.average != null && Number.isFinite(stats.average) ? averageFormat.format(stats.average) : "—"}</dd></div>
                        <div><dt>High game</dt><dd>{stats.games > 0 && stats.highGame > 0 ? stats.highGame : "—"}</dd></div>
                        <div><dt>Games bowled</dt><dd>{stats.games}</dd></div>
                    </dl>
                    {stats.games === 0 && <p className="bls-bowler-no-games">No games recorded this season. Your profile has the full story.</p>}
                    <Link className="bls-bowler-profile" to={`/player/${encodeURIComponent(selected.id)}`}>Open {selected.name}’s stats <ArrowRight aria-hidden="true"/></Link>
                    <p className="bls-bowler-pass-note">Choose a bowler once. Jump back in next visit.</p>
                </> : <div className="bls-bowler-pass-empty"><Trophy aria-hidden="true"/><h2>Your next bragging right starts here.</h2><p>Pick a bowler to see their season at a glance.</p><Link to="/player">Explore the player directory <ArrowRight aria-hidden="true"/></Link></div>}
            </div>
            <nav className="bls-launchpad-shortcuts" aria-label="Explore bowling stats">
                <Link to="/beer-league"><Trophy aria-hidden="true"/><span>League standings</span><ArrowRight aria-hidden="true"/></Link>
                <Link to="/player/compare"><span className="bls-launchpad-vs" aria-hidden="true">VS</span><span>Settle the rivalry</span><ArrowRight aria-hidden="true"/></Link>
            </nav>
        </section>
    );
}

export default function BowlerLaunchpad() {
    const {source} = useDataSource();
    return <BowlerFinder key={source} source={source}/>;
}
