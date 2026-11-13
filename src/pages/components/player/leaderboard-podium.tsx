import {type ReactNode, useId} from "react";
import {Link} from "react-router";
import "../../../sass/leaderboard-podium.scss";

export interface LeaderboardEntry {
    id: string;
    name: string;
    games: number;
    team?: string;
    value: number;
}

interface Props {
    entries: LeaderboardEntry[];
    metric: string;
    scope: string;
    formatValue: (value: number) => string;
    filters: ReactNode;
    lowerIsBetter?: boolean;
}

function rankEntries(entries: LeaderboardEntry[]) {
    const ranked: (LeaderboardEntry & {rank: number})[] = [];
    for (const entry of entries) {
        const previous = ranked[ranked.length - 1];
        const rank = previous?.value === entry.value ? previous.rank : ranked.length + 1;
        ranked.push({...entry, rank});
    }
    return ranked;
}

export function LeaderboardPodium({entries, metric, scope, formatValue, filters, lowerIsBetter}: Props) {
    const resultsId = useId();
    const ranked = rankEntries(entries);

    return <div className="bls-podium">
        <header className="bls-podium-header">
            <div>
                <h1>Leaderboard</h1>
                <p>{scope}</p>
            </div>
            <button type="button" onClick={() => {
                document.getElementById(resultsId)?.focus();
            }}>Full rankings <span aria-hidden="true">↓</span></button>
        </header>
        <div className="bls-podium-filters">{filters}</div>
        {ranked.length > 0 && <section className="bls-podium-stage" aria-label={metric + " leaders"}>
            <div className="bls-podium-stage-label">
                <h2>{metric}</h2>
                {lowerIsBetter && <span>Lower is better</span>}
            </div>
            <ol className="bls-podium-places">
                {ranked.slice(0, 3).map(entry => <li key={entry.id} data-place={entry.rank}>
                    <Link to={"/player/" + entry.id}>
                        <span className="bls-podium-place">Rank {entry.rank}</span>
                        <strong className="bls-podium-value">{formatValue(entry.value)}</strong>
                        <span className="bls-podium-name">{entry.name}<span aria-hidden="true"> ↗</span></span>
                        <span className="bls-podium-games">{entry.games.toLocaleString()} {entry.games === 1 ? "game" : "games"}</span>
                    </Link>
                </li>)}
            </ol>
        </section>}
        <section className="bls-podium-results" aria-labelledby={resultsId}>
            <div className="bls-podium-results-header">
                <h2 id={resultsId} tabIndex={-1}>Full rankings</h2>
                <span role="status">{ranked.length.toLocaleString()} {ranked.length === 1 ? "bowler" : "bowlers"}</span>
            </div>
            {ranked.length === 0 ? <p className="bls-podium-empty">No bowlers match the selected filters.</p> : <table>
                <thead><tr><th scope="col">Rank</th><th scope="col">Bowler</th><th scope="col">Games</th><th scope="col">{metric}</th></tr></thead>
                <tbody>
                    {ranked.map(entry => <tr key={entry.id}>
                        <td>{entry.rank}</td>
                        <th scope="row"><Link to={"/player/" + entry.id}>{entry.name}</Link>
                            {entry.team && <span className="bls-podium-team">{entry.team}</span>}
                        </th>
                        <td>{entry.games.toLocaleString()}</td>
                        <td>{formatValue(entry.value)}</td>
                    </tr>)}
                </tbody>
            </table>}
        </section>
    </div>;
}
