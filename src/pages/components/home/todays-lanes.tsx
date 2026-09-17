import {type FC, useEffect, useState} from "react";
import {Badge, Card, CardBody, Col, Row} from "react-bootstrap";
import {GeoAltFill} from "react-bootstrap-icons";
import {Link} from "react-router";

import {leagueDetailsFetcher, leagueInfoListFetcher} from "../../../data/league/league-api";

const HOME_TEAMS = ["Pins Go Boom!", "Hookers and Bowl"];

interface LaneAssignment {
    leagueId: string;
    teamId: string;
    team: string;
    opponent: string;
    lanes: number[];
    week: number;
}

function normalize(value: string | undefined): string {
    return (value ?? "").toLocaleLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

function isHomeTeam(name: string | undefined): boolean {
    const normalized = normalize(name);
    return HOME_TEAMS.some((team) => normalize(team) === normalized);
}

function homeTeamOrder(name: string): number {
    const normalized = normalize(name);
    const index = HOME_TEAMS.findIndex((team) => normalize(team) === normalized);
    return index === -1 ? HOME_TEAMS.length : index;
}

function localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const TodaysLanes: FC = () => {
    const [assignments, setAssignments] = useState<LaneAssignment[]>([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const today = localDateKey(new Date());
                const leagueList = await leagueInfoListFetcher();
                const leagues = leagueList.seasons
                    .flatMap((season) => season.leagues)
                    .filter((league) => league.hasData() && (league.ongoing || league.teams.some((team) => isHomeTeam(team.name))));
                const details = await Promise.all(leagues.map(async (league) => leagueDetailsFetcher(league.dataLoc!)));
                const rows: LaneAssignment[] = [];
                const seen = new Set<string>();
                for (const league of details) {
                    if (!league.id) continue;
                    for (const team of league.teams) {
                        if (!isHomeTeam(team.name) || !team.id) continue;
                        for (const matchup of team.matchups) {
                            if (matchup.scheduledDate?.format("YYYY-MM-DD") !== today || matchup.lanes.length === 0) continue;
                            const opponentTeam = league.otherTeams.find((candidate) => candidate.id === matchup.opponent?.teamId)
                                ?? league.teams.find((candidate) => candidate.id === matchup.opponent?.teamId);
                            const key = `${normalize(team.name)}-${matchup.week}`;
                            if (seen.has(key)) continue;
                            seen.add(key);
                            rows.push({
                                leagueId: league.id,
                                teamId: team.id,
                                team: team.name ?? "Team",
                                opponent: opponentTeam?.name ?? "Opponent TBD",
                                lanes: matchup.lanes,
                                week: matchup.week,
                            });
                        }
                    }
                }
                rows.sort((a, b) => homeTeamOrder(a.team) - homeTeamOrder(b.team));
                if (!cancelled) setAssignments(rows);
            } catch {
                if (!cancelled) setAssignments([]);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, []);

    if (assignments.length === 0) return null;

    return (
        <Card className="bls-profile-card mb-3 border-primary">
            <CardBody>
                <div className="d-flex align-items-center gap-2 mb-3">
                    <GeoAltFill className="text-primary" />
                    <div>
                        <div className="text-uppercase small text-primary fw-semibold">Bowling Today</div>
                        <h2 className="h4 mb-0">Tonight's Lanes</h2>
                    </div>
                </div>
                <Row className="g-2">
                    {assignments.map((assignment) => (
                        <Col md={6} key={`${assignment.team}-${assignment.week}`}>
                            <Link
                                className="text-reset text-decoration-none d-block h-100"
                                to={`/league/${encodeURIComponent(assignment.leagueId)}/${encodeURIComponent(assignment.teamId)}`}
                                aria-label={`Open ${assignment.team} team league data`}
                            >
                                <div className="rounded border p-3 h-100 d-flex justify-content-between align-items-center gap-3">
                                    <div>
                                        <div className="fw-bold fs-5">{assignment.team}</div>
                                        <div className="text-body-secondary small">Week {assignment.week} vs. {assignment.opponent}</div>
                                    </div>
                                    <div className="text-end flex-shrink-0">
                                        <div className="small text-body-secondary">LANES</div>
                                        <Badge bg="primary" className="fs-5">{assignment.lanes.map((lane) => String(lane).padStart(2, "0")).join(" – ")}</Badge>
                                    </div>
                                </div>
                            </Link>
                        </Col>
                    ))}
                </Row>
            </CardBody>
        </Card>
    );
};

export default TodaysLanes;
