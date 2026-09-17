import {type FC, useEffect, useState} from "react";
import {Badge, Card, CardBody, Col, Row} from "react-bootstrap";
import {GeoAltFill} from "react-bootstrap-icons";

import {leagueDetailsFetcher, leagueInfoListFetcher} from "../../../data/league/league-api";

const HOME_TEAMS = ["Pins Go Boom!", "Hookers and Bowl"];

interface LaneAssignment {
    team: string;
    opponent: string;
    lanes: number[];
    week: number;
}

function normalize(value: string | undefined): string {
    return (value ?? "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function isHomeTeam(name: string | undefined): boolean {
    const normalized = normalize(name);
    return HOME_TEAMS.some((team) => normalize(team) === normalized);
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
                const leagues = leagueList.seasons.flatMap((season) => season.leagues).filter((league) => league.ongoing && league.hasData());
                const details = await Promise.all(leagues.map(async (league) => leagueDetailsFetcher(league.dataLoc!)));
                const rows: LaneAssignment[] = [];
                const seen = new Set<string>();
                for (const league of details) {
                    for (const team of league.teams) {
                        if (!isHomeTeam(team.name)) continue;
                        for (const matchup of team.matchups) {
                            if (matchup.scheduledDate?.format("YYYY-MM-DD") !== today || matchup.lanes.length === 0) continue;
                            const opponentTeam = league.otherTeams.find((candidate) => candidate.id === matchup.opponent?.teamId)
                                ?? league.teams.find((candidate) => candidate.id === matchup.opponent?.teamId);
                            const key = `${normalize(team.name)}-${matchup.week}`;
                            if (seen.has(key)) continue;
                            seen.add(key);
                            rows.push({
                                team: team.name ?? "Team",
                                opponent: opponentTeam?.name ?? "Opponent TBD",
                                lanes: matchup.lanes,
                                week: matchup.week,
                            });
                        }
                    }
                }
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
                        </Col>
                    ))}
                </Row>
            </CardBody>
        </Card>
    );
};

export default TodaysLanes;
