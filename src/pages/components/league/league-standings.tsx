import {useId, useState, type ReactNode} from "react";
import {Card, Table} from "react-bootstrap";
import {Link} from "react-router";
import {normalizePlayerName, type BeerPlayer, type BeerStanding, type BeerTeam} from "../../../data/league/beer-sheet";

interface StandingsProps {
    standings: BeerStanding[];
    teams: BeerTeam[];
    sheetDate?: string | null;
    renderPlayerName: (teamNumber: number, player: BeerPlayer) => ReactNode;
}

const points = new Intl.NumberFormat("en-US", {maximumFractionDigits: 2});
const divisionName = (division: string | null) => division || "No division listed";

export default function LeagueStandings({standings, teams, sheetDate, renderPlayerName}: StandingsProps) {
    const id = useId();
    const [teamNumber, setTeamNumber] = useState<number>();
    const grouped = new Map<string | null, BeerStanding[]>();
    for (const row of standings) {
        const division = row.division || null;
        const rows = grouped.get(division) ?? [];
        rows.push(row);
        grouped.set(division, rows);
    }
    const divisions = [...grouped].map(([name, rows]) => ({name, rows: rows.sort((a, b) => a.place - b.place)}));
    if (divisions.length === 0) return <p className="text-body-secondary" role="status">Standings are unavailable for this sheet.</p>;

    const selected = standings.find(row => row.number === teamNumber)
        ?? standings.find(row => normalizePlayerName(row.name) === "pinsgoboom")
        ?? divisions[0].rows[0];
    const divisionIndex = divisions.findIndex(division => division.rows.includes(selected));
    const division = divisions[divisionIndex];
    const leader = division.rows[0];
    const gap = leader.won - selected.won;
    const opponent = division.rows.find(row => row.number !== selected.number);
    const comparison = sheetDate && opponent ? "/team/compare?" + new URLSearchParams({
        source: "api", a: String(selected.number), b: String(opponent.number), sheet: sheetDate,
    }).toString() : null;
    const roster = teams.find(team => team.number === selected.number)?.players ?? [];
    const maxPoints = Math.max(1, ...division.rows.map(row => row.won));
    const leaders = division.rows.slice(0, 6);
    const chartRows = leaders.includes(selected) ? leaders : [...leaders, selected];

    let gapText = "Division leader";
    if (selected.number !== leader.number) {
        if (gap === 0) gapText = "Level on points with " + leader.name;
        else if (gap > 0) gapText = points.format(gap) + " points behind " + leader.name;
        else gapText = points.format(-gap) + " more points won than " + leader.name;
    }

    return <section aria-labelledby={id + "-title"} className="bls-standings">
        <div className="bls-standings-header">
            <h2 id={id + "-title"}>Division standings</h2>
            <div className="bls-standing-controls">
                <label>
                    Division
                    <select className="form-select" aria-label="Division" value={divisionIndex} onChange={event => {
                        const next = divisions[Number(event.target.value)];
                        if (next) setTeamNumber(next.rows[0].number);
                    }}>
                        {divisions.map(({name}, index) => <option key={index} value={index}>{divisionName(name)}</option>)}
                    </select>
                </label>
                <label>
                    Team
                    <select className="form-select" aria-label="Team" value={selected.number} onChange={event => {
                        setTeamNumber(Number(event.target.value));
                    }}>
                        {division.rows.map(row => <option key={row.number} value={row.number}>{row.name}</option>)}
                    </select>
                </label>
            </div>
        </div>
        <div className="bls-standing-layout">
            <div className="bls-standing-team">
                <div aria-live="polite" aria-atomic="true">
                    <div className="bls-standing-rank"><span>#{selected.place}</span><span>{divisionName(division.name)}</span></div>
                    <h3>{selected.name}</h3>
                    <p className="bls-standing-gap">{gapText}</p>
                </div>
                <dl className="bls-standing-metrics">
                    <div><dt>Points won</dt><dd>{points.format(selected.won)}</dd></div>
                    <div><dt>Points lost</dt><dd>{points.format(selected.lost)}</dd></div>
                    <div><dt>Team average</dt><dd>{points.format(selected.average)}</dd></div>
                </dl>
                {comparison && opponent && <Link className="bls-standing-compare" to={comparison}>Compare with {opponent.name}<span aria-hidden="true">→</span></Link>}
                {roster.length > 0 && <details className="bls-standing-roster">
                    <summary>Roster ({roster.length})</summary>
                    <ul>{roster.map((player, index) => <li key={index}>
                        {renderPlayerName(selected.number, player)}
                        <span>{player.games > 0 ? points.format(player.average) + " avg" : "No games"}</span>
                    </li>)}</ul>
                </details>}
            </div>
            <div className="bls-standing-chart">
                <div className="bls-standing-chart-title"><h3>Division leaders</h3><span>Points won</span></div>
                <ol aria-label="Published division ranks">
                    {chartRows.map(row => <li key={row.number} className={leaders.includes(row) ? undefined : "bls-standing-outside-leaders"}>
                        <button className="bls-standing-row" type="button" aria-pressed={row.number === selected.number} onClick={() => {
                            setTeamNumber(row.number);
                        }}>
                            <span className="bls-standing-row-rank">#{row.place}</span>
                            <span className="bls-standing-row-team">
                                <span>{row.name}</span>
                                <span className="bls-standing-track" aria-hidden="true">
                                    <span style={{width: Math.max(0, row.won / maxPoints * 100) + "%"}}/>
                                </span>
                            </span>
                            <strong>{points.format(row.won)}</strong>
                        </button>
                    </li>)}
                </ol>
            </div>
        </div>
        <details className="bls-standing-full">
            <summary>Full standings tables</summary>
            {divisions.map(({name, rows}) => <Card className="mt-3" key={name ?? ""}>
                <Card.Header as="h3" className="fs-6 fw-semibold">{divisionName(name)} standings</Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive" tabIndex={0} role="region" aria-label={divisionName(name) + " standings table"}>
                        <Table className="mb-0 align-middle">
                            <thead><tr>
                                <th scope="col">Place</th><th scope="col">Team</th>
                                <th scope="col" className="text-end">W</th><th scope="col" className="text-end">L</th>
                                <th scope="col" className="text-end">Avg</th><th scope="col" className="text-end">HDCP</th>
                                <th scope="col" className="text-end">Scratch pins</th>
                                <th scope="col" className="text-end">High game</th>
                                <th scope="col" className="text-end">High series</th>
                            </tr></thead>
                            <tbody>{rows.map(row => <tr key={row.number}>
                                <td>{row.place}</td><th scope="row">#{row.number} {row.name}</th>
                                <td className="text-end">{row.won}</td><td className="text-end">{row.lost}</td>
                                <td className="text-end">{row.average}</td><td className="text-end">{row.handicap}</td>
                                <td className="text-end">{row.scratchPins.toLocaleString()}</td>
                                <td className="text-end">{row.highScratchGame}</td><td className="text-end">{row.highScratchSeries}</td>
                            </tr>)}</tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>)}
        </details>
    </section>;
}
