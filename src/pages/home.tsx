/*
 * Modern home layout © 2026
 */

import  {type FC} from "react";

import NewsHighlights from "./components/news/news";
import LeagueList from './components/league/league-list';
import PlayerList from "./components/player/player-list";

const Home :FC = () => {
    return (
        <>
            <div className="bls-hero">
                <h1>Bowling League Stats</h1>
                <p>Track scores, averages, and bragging rights across every season.</p>
            </div>

            <div className="mb-4">
                <NewsHighlights />
            </div>

            <div className="row g-4">
                <div className="col-lg-6">
                    <LeagueList />
                </div>
                <div className="col-lg-6">
                    <PlayerList />
                </div>
            </div>
        </>
    )
};

export default Home;
