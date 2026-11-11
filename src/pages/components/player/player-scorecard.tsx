import {useId, type FC} from "react";
import {Link} from "react-router";
import "../../../sass/player-scorecard.scss";

interface PlayerScorecardProps {
    name: string;
    source: string;
    context: string;
    rivalryPath: string;
    recordsLabel: string;
    records: {label: string; value: string}[];
    latest: {
        label: string;
        context: string;
        games: {label: string; score: number | null}[];
        total: number | null;
        average: number | null;
        handicapTotal?: number | null;
    } | null;
}

const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});

const PlayerScorecard: FC<PlayerScorecardProps> = ({
    name, source, context, rivalryPath, recordsLabel, records, latest,
}) => {
    const titleId = useId();
    const recordedGames = latest?.games.filter(game => game.score != null).length ?? 0;
    return (
        <section className="bls-player-scorecard" aria-labelledby={titleId}>
            <div className="bls-player-scorecard-topline">
                <span><i aria-hidden="true" /> The player card</span>
                <span>{source}</span>
            </div>
            <div className="bls-player-scorecard-main">
                <div className="bls-player-scorecard-identity">
                    <span className="bls-player-scorecard-eyebrow">Know your game.</span>
                    <h1 id={titleId}>{name}</h1>
                    <p>{context}</p>
                    <div className="bls-player-scorecard-actions">
                        <Link to={rivalryPath} className="bls-player-scorecard-rival">
                            Find a rival <span aria-hidden="true">↗</span>
                        </Link>
                        <Link to="/player" className="bls-player-scorecard-back">All players <span aria-hidden="true">→</span></Link>
                    </div>
                </div>
                <div className="bls-player-scorecard-board">
                    <div className="bls-player-scorecard-board-heading">
                        <h2>{latest?.label ?? "Your next score starts here"}</h2>
                        <span className="bls-player-scorecard-mark" aria-hidden="true">X</span>
                    </div>
                    {latest ? <>
                        <p className="bls-player-scorecard-board-context">{latest.context}</p>
                        <div className="bls-player-scorecard-total">
                            <strong>{latest.total != null ? numberFormat.format(latest.total) : "—"}</strong>
                            <span>Scratch<br />total</span>
                        </div>
                        <dl className="bls-player-scorecard-games">
                            {latest.games.map(game => (
                                <div key={game.label}>
                                    <dt>{game.label}</dt>
                                    <dd>{game.score != null ? numberFormat.format(game.score) : <><span aria-hidden="true">—</span><span className="visually-hidden">Not recorded</span></>}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="bls-player-scorecard-board-footer">
                            <span>{recordedGames} recorded {recordedGames === 1 ? "game" : "games"}{latest.average != null ? " · " + numberFormat.format(latest.average) + " avg" : ""}</span>
                            {latest.handicapTotal != null && <span>{numberFormat.format(latest.handicapTotal)} with handicap</span>}
                        </div>
                    </> : <p className="bls-player-scorecard-empty">No recent game scores are available. Explore the recorded stats below.</p>}
                </div>
            </div>
            <div className="bls-player-scorecard-records">
                <p>{recordsLabel}</p>
                <dl>
                    {records.map(record => <div key={record.label}><dt>{record.label}</dt><dd>{record.value}</dd></div>)}
                </dl>
            </div>
        </section>
    );
};

export default PlayerScorecard;
