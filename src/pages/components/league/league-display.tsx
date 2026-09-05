/*
 * Copyright (c) 2025. Bindul Bhowmik
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

import * as React from "react";
import {type FC, useCallback, useEffect, useState} from "react";

import {Container, Nav} from "react-bootstrap";

import ErrorDisplay from "../error-display";
import {type Breakpoint, BS_BP_XXL, getBreakpoint} from "../ui-utils";

import {LEAGUE_DETAILS_CACHE_CATEGORY, leagueDetailsFetcher} from "../../../data/league/league-api";
import type {LeagueDetails} from "../../../data/league/league-details";
import type {LeagueInfo} from "../../../data/league/league-info";
import {useCachedFetcher} from "../cache/data-loader";
import LeagueSummary from "./league-summary";
import LeagueTeamDetails from "./league-team-details";
import OtherTeams from "./league-other-teams";
import {useNavigate} from "react-router";

export type CurrentLeagueDetailsDisplay = "TEAM" | "OTHER_TEAMS";

const OTHER_TEAMS = "other-teams";

interface LeagueDisplayProps {
    leagueInfo: LeagueInfo;
    teamId?: string;
    children?: React.ReactNode;
}
const LeagueDisplay : FC<LeagueDisplayProps> = ({leagueInfo, teamId}: LeagueDisplayProps) => {
    const fetcher = useCallback((dataLoc: string) => leagueDetailsFetcher(dataLoc), []);
    const {data: leagueDetails, isLoading: leagueDetailsLoading, error: leagueDetailsLoadError } = useCachedFetcher<LeagueDetails>(
        fetcher.bind(null, leagueInfo.dataLoc ?? "will-fail.json"), LEAGUE_DETAILS_CACHE_CATEGORY, leagueInfo.id);

    const currentDisplay = teamId?.toLowerCase() === OTHER_TEAMS ? "OTHER_TEAMS" : "TEAM";
    const selected = leagueDetails?.teams.find(team => team.id === teamId);
    const displayedTeam = selected?.id ?? leagueDetails?.teams[0]?.id ?? "";
    const showInvalidTeamIdError = Boolean(leagueDetails && teamId && currentDisplay === "TEAM" && !selected);
    const [currentBreakpoint, setBreakpoint] = useState<Breakpoint>(BS_BP_XXL);

    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => {
            setBreakpoint(getBreakpoint());
        };
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);


    if (leagueDetailsLoadError) {
        // Keeping error display here, so we don't end up with multiple alerts from each child component
        return <ErrorDisplay message="Error loading league information, please try later or talk to someone."  error={leagueDetailsLoadError}/>;
    }

    return (
        <>
            <LeagueSummary leagueDetails={leagueDetails} leagueDetailsLoading={leagueDetailsLoading} currentBreakpoint={currentBreakpoint}/>
            {/*Team selection Menu*/}
            <Container fluid="true">
            {leagueDetails && <Nav variant="pills" className="py-0 my-0">
                {leagueDetails.teams.map(team => (
                    <Nav.Item key={team.id}>
                        <Nav.Link eventKey={team.id} active={currentDisplay == "TEAM" && displayedTeam === team.id}
                                  onClick={() => {
                                      void navigate(`/league/${String(leagueInfo.id)}/${String(team.id)}`);
                                  }}>{team.name}</Nav.Link>
                    </Nav.Item>
                    ))}
                {leagueDetails.otherTeams.length > 0 && <Nav.Item>
                    <Nav.Link eventKey="OTHER_TEAMS" active={currentDisplay == "OTHER_TEAMS"}
                              onClick={() => {
                                  void navigate(`/league/${String(leagueInfo.id)}/${OTHER_TEAMS}`);
                              }}>
                        Other Teams
                    </Nav.Link>
                </Nav.Item>
                }
            </Nav>}
            </Container>
            {showInvalidTeamIdError && <ErrorDisplay message="Invalid Team Id, will display the first team, use the team navigation to select from available teams."
                                                     error={new Error("Entered Team Id: " + String(teamId))}
                                                     onClose={() => { void navigate(`/league/${String(leagueInfo.id)}`); }}/>}
            {currentDisplay == "TEAM" && <LeagueTeamDetails leagueDetails={leagueDetails} leagueDetailsLoading={leagueDetailsLoading} currentBreakpoint={currentBreakpoint} teamId={displayedTeam} />}
            {currentDisplay == "OTHER_TEAMS" && <OtherTeams leagueDetails={leagueDetails} leagueDetailsLoading={leagueDetailsLoading}/>}
        </>
    );
}

export default LeagueDisplay;
