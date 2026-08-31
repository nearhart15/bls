/*
 * Home — shout-outs, tighter leagues, last-year bowlers © 2026
 */

import {type FC} from "react";
import {Link} from "react-router";
import {BarChartFill, PeopleFill, TrophyFill} from "react-bootstrap-icons";

import NewsHighlights from "./components/news/news";
import LeagueList from "./components/league/league-list";
import PlayerList from "./components/player/player-list";

const Home: FC = () => {
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
                    <div className="bls-hero-actions mt-3 d-flex flex-wrap gap-2 justify-content-center">
                        <Link to="/player/compare" className="btn btn-primary btn-sm">
                            Player Compare
                        </Link>
                        <Link to="/player" className="btn btn-outline-primary btn-sm">
                            All players
                        </Link>
                    </div>
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

            <section className="bls-features">
                <div className="bls-feature">
                    <div className="bls-feature-icon">
                        <TrophyFill />
                    </div>
                    <h3>League deep dives</h3>
                    <p>Standings, honor rolls, rules, and full matchup history.</p>
                </div>
                <div className="bls-feature">
                    <div className="bls-feature-icon">
                        <PeopleFill />
                    </div>
                    <h3>Player careers</h3>
                    <p>Career averages, season splits, and every team appearance.</p>
                </div>
                <div className="bls-feature">
                    <div className="bls-feature-icon">
                        <BarChartFill />
                    </div>
                    <h3>Frame-level detail</h3>
                    <p>Game sheets, charts, and the stats that fuel good-natured trash talk.</p>
                </div>
            </section>

            <div className="mb-3">
                <NewsHighlights shoutOuts />
            </div>

            <div className="row g-3">
                <div className="col-lg-5">
                    <LeagueList compact />
                </div>
                <div className="col-lg-7">
                    <PlayerList
                        defaultScope="last-year"
                        lockScope
                        title="Active bowlers (last year)"
                    />
                </div>
            </div>
        </>
    );
};

export default Home;
