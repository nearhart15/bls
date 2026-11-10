/*
 * Home — shout-outs, tighter leagues, current-season bowlers © 2026
 */

import {Suspense, lazy, type FC} from "react";

import NewsHighlights from "./components/news/news";
import LeagueList from "./components/league/league-list";
import PlayerList from "./components/player/player-list";
import Loader from "./components/loader";

const ApiPlayerList = lazy(async () => ({default: (await import("./components/player/api-player-screens")).ApiPlayerList}));
import {useDataSource} from "./components/data-source";
import TodaysLanes from "./components/home/todays-lanes";
import BowlerLaunchpad from "./components/home/bowler-launchpad";

const PINS_GO_BOOM = ["Nick", "Bindul", "Luke", "Brian"];
const HOOKERS_AND_BOWL = ["Patrick", "Greg", "Ty", "Mark"];
const REGULAR_BOWLERS = [...PINS_GO_BOOM, ...HOOKERS_AND_BOWL];

const Home: FC = () => {
    const {source} = useDataSource();
    return (
        <>
            <BowlerLaunchpad/>

            <TodaysLanes />
            <div className="mb-3"><NewsHighlights shoutOuts /></div>

            {source === "api" ? (
                <Suspense fallback={<Loader/>}><ApiPlayerList title="Beer League Bowlers" /></Suspense>
            ) : (
                <div className="row g-3">
                    <div className="col-lg-5"><LeagueList /></div>
                    <div className="col-lg-7 d-grid gap-3">
                        <PlayerList defaultScope="current" lockScope showTrend={false} showRating={false} includeFirstNames={PINS_GO_BOOM} title="Pins Go Boom" />
                        <PlayerList defaultScope="current" lockScope showTrend={false} showRating={false} includeFirstNames={HOOKERS_AND_BOWL} title="Hookers and Bowl" />
                        <PlayerList defaultScope="current" lockScope showTrend={false} showRating={false} excludeFirstNames={REGULAR_BOWLERS} title="Subs" />
                    </div>
                </div>
            )}
        </>
    );
};

export default Home;
