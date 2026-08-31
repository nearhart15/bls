/*
 * Layout — glass nav + OLED shell © 2026
 */

import {type FC, useRef} from "react";
import {Link, Outlet} from "react-router";
import {Nav, Navbar, NavDropdown} from "react-bootstrap";

import ImgBowlingLogo from "../assets/bowling-svgrepo-com.svg";
import ScrollToTop from "./components/scroll-to-top";
import ClearCache, {type ClearCacheRef} from "./components/cache/clear-cache";
import {ThemeToggle} from "./components/theme";

const Layout :FC = () => {
    const clearCacheRef = useRef<ClearCacheRef>(null);

    return (
        <div className="bls-app">
            <div className="bls-shell">
                <Navbar expand="lg" className="bls-nav" data-bs-theme={undefined}>
                    <Navbar.Brand as={Link} to="/">
                        <img src={ImgBowlingLogo} alt="" width="28" height="28" />
                        Bowling League Stats
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="bls-nav" aria-label="Toggle navigation" />
                    <Navbar.Collapse id="bls-nav">
                        <Nav className="me-auto ms-lg-3 gap-lg-1">
                            <Nav.Link as={Link} to="/">Home</Nav.Link>
                            <Nav.Link as={Link} to="/league">Leagues</Nav.Link>
                            <Nav.Link as={Link} to="/player">Players</Nav.Link>
                            <Nav.Link as={Link} to="/player/leaderboard">Leaderboard</Nav.Link>
                            <Nav.Link as={Link} to="/player/compare">Player Compare</Nav.Link>
                            <NavDropdown title="Utilities" id="utilities-nav">
                                <NavDropdown.Item
                                    as={Link}
                                    to="#"
                                    onClick={() => clearCacheRef.current?.clearCache()}
                                >
                                    Clear Cache
                                </NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/score-utils">
                                    Score Utilities
                                </NavDropdown.Item>
                            </NavDropdown>
                        </Nav>
                        <ThemeToggle />
                    </Navbar.Collapse>
                </Navbar>

                <ScrollToTop />
                <ClearCache ref={clearCacheRef}/>

                <main className="bls-main">
                    <Outlet/>
                </main>

                <footer className="bls-footer">
                    <p className="mb-1">
                        Contains fun data, empowers bragging rights, enables the nerds,
                        and justifies adult money (well) spent at the Pro Shop.
                    </p>
                    <p className="mb-0">
                        Copyright &copy; 2025{" "}
                        <span className="text-primary-emphasis">Pins Go Boom!</span> Bowling Team.
                    </p>
                </footer>
            </div>
        </div>
    )
};

export default Layout;
