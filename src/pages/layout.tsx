import DataQualityNotice from "./components/data-quality-notice";
/*
 * Layout - glass nav + OLED shell (c) 2026
 */

import {type FC, useRef} from "react";
import {Link, Outlet, useLocation} from "react-router";
import {Button, ButtonGroup, Nav, Navbar, NavDropdown} from "react-bootstrap";
import {ArrowClockwise} from "react-bootstrap-icons";

import ImgBowlingLogo from "../assets/bowling-svgrepo-com.svg";
import ScrollToTop from "./components/scroll-to-top";
import ClearCache, {type ClearCacheRef} from "./components/cache/clear-cache";
import {ThemeToggle} from "./components/theme";
import {useDataSource} from "./components/data-source";

const Layout :FC = () => {
    const clearCacheRef = useRef<ClearCacheRef>(null);
    const {source, setSource} = useDataSource();
    const location = useLocation();
    const isFullLeagueInfo = location.pathname === "/beer-league" || location.pathname.startsWith("/beer-league/");
    const isTeamLeagueData = location.pathname === "/league" || location.pathname.startsWith("/league/");
    const isFrameOnlyStatsPage = location.pathname === "/player/handicap";
    // Website-only player links use an api-* id. Those profiles have no BinBin
    // counterpart, so showing the global source switch would only lead to an error.
    const isApiOnlyPlayer = location.pathname.startsWith("/player/api-");
    const isApiLockedTeamCompare = location.pathname === "/team/compare" && new URLSearchParams(location.search).get("source") === "api";
    const showDataSourceToggle = !isFullLeagueInfo && !isTeamLeagueData && !isFrameOnlyStatsPage && !isApiOnlyPlayer;

    const refreshApp = () => {
        clearCacheRef.current?.clearCache();
        window.location.reload();
    };

    return (
        <div className="bls-app">
            <div className="bls-shell">
                <Navbar expand="lg" className="bls-nav" data-bs-theme={undefined}>
                    <Navbar.Brand as={Link} to="/">
                        <img src={ImgBowlingLogo} alt="" width="28" height="28" />
                        Bowling League Stats
                    </Navbar.Brand>
                    <div className="bls-nav-actions d-flex align-items-center gap-2 ms-auto order-lg-last">
                        <Button className="bls-theme-btn d-flex align-items-center gap-1" size="sm" onClick={refreshApp} aria-label="Clear cached data and refresh" title="Clear cached data and refresh">
                            <ArrowClockwise size={14} />
                            <span className="d-none d-md-inline">Refresh</span>
                        </Button>
                        <Navbar.Toggle aria-controls="bls-nav" aria-label="Toggle navigation" />
                    </div>
                    <Navbar.Collapse id="bls-nav">
                        <Nav className="me-auto ms-lg-3 gap-lg-1">
                            <Nav.Link as={Link} to="/league">Team League Data</Nav.Link>
                            <Nav.Link as={Link} to="/beer-league">Full League Info</Nav.Link>
                            <NavDropdown title="Stats" id="players-nav">
                                <NavDropdown.Item as={Link} to="/player">Players</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/player/leaderboard">Leaderboard</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/player/compare">Player Compare</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/team/compare">Team Compare</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/player/handicap">Handicap Guide</NavDropdown.Item>
                            </NavDropdown>
                            <NavDropdown title="Utilities" id="utilities-nav">
                                <NavDropdown.Item as={Link} to="/score-utils">Score Utilities</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <ThemeToggle inMenu />
                            </NavDropdown>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>

                {showDataSourceToggle && (
                    <div className="bls-data-source-bar mb-3" aria-label="Stats data source">
                        <span className="bls-data-source-label">Data source</span>
                        <ButtonGroup size="sm" className="bls-data-source-toggle">
                            {!isApiLockedTeamCompare && <Button variant={source === "frame" ? "primary" : "outline-primary"} onClick={() => { setSource("frame"); }} aria-pressed={source === "frame"} title="Use stats calculated from BLS frame files">BinBin Data</Button>}
                            <Button variant={source === "api" ? "primary" : "outline-primary"} onClick={() => { setSource("api"); }} aria-pressed={source === "api"} title="Use stats imported from the bowling center website">API Data</Button>
                        </ButtonGroup>
                    </div>
                )}

                <ScrollToTop />
                <ClearCache ref={clearCacheRef}/>
                <main className="bls-main"><DataQualityNotice/><Outlet/></main>
                <footer className="bls-footer">
                    <p className="mb-1">Contains fun data, empowers bragging rights, enables the nerds, and justifies adult money (well) spent at the Pro Shop.</p>
                    <p className="mb-0">Copyright &copy; 2025{" "}<span className="text-primary-emphasis">Pins Go Boom!</span> Bowling Team.</p>
                </footer>
            </div>
        </div>
    )
};

export default Layout;