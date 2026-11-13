/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode contrast fixes © 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {FC, ReactNode} from "react";

import moment from "moment";

import {Card} from "react-bootstrap";
import TeamMatchNight from "./team-match-night";
import LeagueSummary from "./league-summary";

import {TrackedLeagueTeam} from "../../../data/league/league-team-details";
import type {LeagueDetails} from "../../../data/league/league-details";
import {isNumeric} from "../../../data/utils/utils";

import Loader from "../loader";
import {type Breakpoint} from "../ui-utils";
import LeagueTeamRoster from "./league-team-roster";
import LeagueTeamMatchup from "./league-team-matchup";
import TeamStatGraph from "./league-team-details-graph";

export interface TeamPositionScoreData {
    bowlDate: Date;
    position: number;
    scratchSeries: number;
}
function buildTeamPositionScoreData (teamDetails: TrackedLeagueTeam): TeamPositionScoreData[] {
    const today = moment();
    const currentRank = isNumeric(teamDetails.currentRank) ? Number.parseInt(teamDetails.currentRank) : 0;
    const filteredMatchups = teamDetails.matchups.filter(matchup =>
        matchup.bowlDate && matchup.bowlDate.isBefore(today) && matchup.scores?.series);

    return filteredMatchups.map((matchup, idx) => {
            let nextRank = currentRank;
            if (filteredMatchups.length > (idx + 1)) {
                const nextRankCandidate = filteredMatchups[idx + 1].enteringRank;
                if (isNumeric(nextRankCandidate)) {
                    nextRank = Number.parseInt(nextRankCandidate);
                }
            }
            return {
                bowlDate: matchup.scheduledDate?.toDate() ?? new Date(), // Using scheduled date here or the graph gets wonky with pre-bowls and post-bowls
                position: nextRank,
                scratchSeries: matchup.scores?.series.effectiveScratchScore ?? 0
            };
        });
}

interface LeagueTeamDetailsProps {
    leagueDetails: LeagueDetails | null;
    leagueDetailsLoading: boolean;
    currentBreakpoint: Breakpoint;
    teamId?: string;
    children?: ReactNode;
}
const LeagueTeamDetails : FC<LeagueTeamDetailsProps> = ({leagueDetails, leagueDetailsLoading, currentBreakpoint, teamId}: LeagueTeamDetailsProps) => {
    const teamDetails = leagueDetails?.teams.find(team => team.id === teamId) ?? null;

    return <>
        {leagueDetailsLoading && <Loader/>}
        {teamDetails && <>
            <TeamMatchNight key={teamDetails.id} team={teamDetails} league={leagueDetails}>
                <TeamStatGraph teamPosScores={buildTeamPositionScoreData(teamDetails)}/>
            </TeamMatchNight>
            <details className="bls-league-reference" key={leagueDetails?.id}>
                <summary>League summary: rules, honor roll &amp; center info</summary>
                <div><LeagueSummary leagueDetails={leagueDetails} leagueDetailsLoading={leagueDetailsLoading} currentBreakpoint={currentBreakpoint}/></div>
            </details>
            <Card className="mt-2 mb-2 mx-0 px-0">
                <LeagueTeamRoster teamDetails={teamDetails} leagueDetailsLoading={leagueDetailsLoading} currentBreakpoint={currentBreakpoint}/>
                <LeagueTeamMatchup key={teamDetails.id} leagueDetails={leagueDetails} teamDetails={teamDetails} leagueDetailsLoading={leagueDetailsLoading} currentBreakpoint={currentBreakpoint}/>
            </Card>
        </>}
    </>;
}

export default LeagueTeamDetails;
