/*
 * Home — shout-outs, tighter leagues, current-season bowlers © 2026
 */

import {Suspense, lazy, type FC} from "react";
import {BarChartFill, PeopleFill, TrophyFill} from "react-bootstrap-icons";

import NewsHighlights from "./components/news/news";
import LeagueList from "./components/league/league-list";
import PlayerList from "./components/player/player-list";
import Loader from "./components/loader";

const ApiPlayerList = lazy(async () => ({default: (await import("./components/player/api-player-screens")).ApiPlayerList}));
import {useDataSource} from "./components/data-source";
import TodaysLanes from "./components/home/todays-lanes";

const PINS_GO_BOOM = ["Nick", "Bindul", "Luke", "Brian"];
const HOOKERS_AND_BOWL = ["Patrick", "Greg", "Ty", "Mark"];
const REGULAR_BOWLERS = [...PINS_GO_BOOM, ...HOOKERS_AND_BOWL];

const Home: FC = () => {
    const {source} = useDataSource();
    return (
        <>
            <section className="bls-hero">
                <div className="bls-hero-inner">
                    <span className="bls-hero-kicker">Pins Go Boom!</span>
                    <h1>Bowling League Stats</h1>
                    <p>
                        Scores, averages, and bragging rights — presented clearly
                        across every season you track.
                    </p>
                    <div className="bls-hero-graphic" aria-hidden="true">
                        <div className="bls-lane">
                            <span className="bls-lane-line" />
                            <span className="bls-lane-line" />
                            <span className="bls-lane-line" />
                            <span className="bls-lane-line" />
                            <span className="bls-ball" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="bls-features d-none d-md-grid">
                <div className="bls-feature">
                    <div className="bls-feature-icon"><TrophyFill /></div>
                    <h3>League deep dives</h3>
                    <p>Standings, honor rolls, rules, and full matchup history.</p>
                </div>
                <div className="bls-feature">
                    <div className="bls-feature-icon"><PeopleFill /></div>
                    <h3>Player careers</h3>
                    <p>Career averages, season splits, and every team appearance.</p>
                </div>
                <div className="bls-feature">
                    <div className="bls-feature-icon"><BarChartFill /></div>
                    <h3>Frame-level detail</h3>
                    <p>Game sheets, charts, and the stats that fuel good-natured trash talk.</p>
                </div>
            </section>

            <TodaysLanes />
            <div className="mb-3"><NewsHighlights shoutOuts /></div>

            {source === "api" ? (
                <Suspense fallback={<Loader/>}><ApiPlayerList title="Beer League Bowlers" /></Suspense>
            ) : (
                <div className="row g-3">
                    <div className="col-lg-5"><LeagueList compact /></div>
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
