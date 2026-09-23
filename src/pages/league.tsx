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

import {lazy, type FC} from "react";
import {useParams} from "react-router";

import Loader from "./components/loader";
import ErrorDisplay from "./components/error-display";
import {
    LEAGUE_LIST_CACHE_CATEGORY,
    leagueInfoListFetcher
} from "../data/league/league-api";
import {AvailableLeagues} from "../data/league/league-info";
import {useCachedFetcher} from "./components/cache/data-loader";
import LeagueList from "./components/league/league-list";
const LeagueDisplay = lazy(() => import("./components/league/league-display"));

const League :FC = () => {
    const { leagueId, teamId } = useParams();
    const { data: leagueListData, isLoading: leagueListLoading, error: leagueListLoadError } = useCachedFetcher<AvailableLeagues>(leagueInfoListFetcher, LEAGUE_LIST_CACHE_CATEGORY);

    if (leagueId) {
        if (leagueListLoading) {
            return <Loader />
        }
        if (leagueListLoadError) {
            return <ErrorDisplay message="Error loading leagues. Nothing else on the site will probably work." error={leagueListLoadError}/>
        }
        if (leagueListData) {
            const leagueInfo = leagueListData.findLeague(leagueId);
            if (leagueInfo?.dataLoc == null) {
                return (<>
                    <LeagueList compact />
                    <ErrorDisplay message="Incorrect League ID. Please select a correct league."/>
                </>);
            }
            return <LeagueDisplay leagueInfo={leagueInfo} teamId={teamId}/>
        }
    }

    return <LeagueList compact/>;
};

export default League;