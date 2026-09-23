/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode + player routes © 2026
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

// Using the Bootswatch lumen theme - Switch to CDN later: https://bootswatch.com/help/
import 'bootswatch/dist/lumen/bootstrap.min.css';
import './sass/bls.scss';
import './sass/matchup-alignment.scss';
import './sass/player-list-responsive.scss';
import './sass/frame-data-responsive.scss';

import {StrictMode, lazy} from 'react'
import {createRoot} from 'react-dom/client'
import {Route, Routes, HashRouter} from "react-router";

import {ContextCacheProvider} from "./pages/components/cache/context-cache";
import G4Provider from "./pages/components/analytics/ga4-provider";
import {ThemeProvider} from "./pages/components/theme";
import {DataSourceProvider} from "./pages/components/data-source";

import Layout from "./pages/layout";
const Home = lazy(() => import("./pages/home"));
const League = lazy(() => import("./pages/league"));
const Player = lazy(() => import("./pages/player"));
const TeamCompare = lazy(() => import("./pages/team-compare"));
const NoPage = lazy(() => import("./pages/nopage"));
const ScoreUtils = lazy(() => import("./pages/score-utils"));
const BeerLeague = lazy(() => import("./pages/beer-league"));

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout/>}>
                <Route index element={<Home/>}/>
                <Route path="/league/:leagueId?/:teamId?" element={<League/>}/>
                <Route path="/player/:playerId?" element={<Player/>}/>
                <Route path="/team/compare" element={<TeamCompare/>}/>
                <Route path="/score-utils" element={<ScoreUtils/>}/>
                <Route path="/beer-league" element={<BeerLeague/>}/>
                <Route path="*" element={<NoPage/>}/>
            </Route>
        </Routes>
    )
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!)
    .render(
    <StrictMode>
        <HashRouter>
            <ThemeProvider>
                <DataSourceProvider>
                    <ContextCacheProvider>
                        <G4Provider>
                            <App/>
                        </G4Provider>
                    </ContextCacheProvider>
                </DataSourceProvider>
            </ThemeProvider>
        </HashRouter>
    </StrictMode>
)
