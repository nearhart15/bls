/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode + players nav © 2026
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
import {type FC, useRef} from "react";
import { Outlet, Link } from "react-router";
import {Navbar, Nav, Container, NavDropdown} from "react-bootstrap";

import ImgBowlingLogo from "./../assets/bowling-svgrepo-com.svg";
import ScrollToTop from "./components/scroll-to-top";
import ClearCache, {type ClearCacheRef} from "./components/cache/clear-cache";
import {ThemeToggle} from "./components/theme";

const Layout :FC = () => {
    const clearCacheRef = useRef<ClearCacheRef>(null);

    return (
        // Set Layout
        <>
            {/* Decide on the Container sizes later */}
            <div className="container py-4 px-3 mx-auto">
                <header className="justify-content-between align-items-md-center pb-2 mb-2 mb-lg-3">
                    {/* Nav Bar */}
                    <Navbar className="bg-primary" expand="lg" data-bs-theme="dark">
                        <Container>
                            <Navbar.Brand as={Link} to="/">
                                <img src={ImgBowlingLogo} alt="Bowling Image" width="32" height="32"
                                     className="d-inline-block align-top"/>
                                <span className="ms-1">{' '}Bowling League Stats</span>
                            </Navbar.Brand>
                            <Navbar.Toggle aria-controls="navbarColor01" aria-expanded="false"
                                           aria-label="Toggle Navigation"/>
                            <Navbar.Collapse id="navbarColor01">
                                <Nav className="me-auto" activeKey={window.location.pathname}>
                                    <Nav.Item>
                                        <Nav.Link eventKey="home" as={Link} to="/">Home</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="league" as={Link} to="/league">Leagues</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="player" as={Link} to="/player">Players</Nav.Link>
                                    </Nav.Item>
                                    <NavDropdown title="Utilities" id="utilities-navbar">
                                        <NavDropdown.Item eventKey="clear-cache" as={Link} to="#"
                                                          onClick={() => clearCacheRef.current?.clearCache()}>
                                            Clear Cache
                                        </NavDropdown.Item>
                                        <NavDropdown.Item eventKey="score-converter" as={Link} to="/score-utils">Score Utilities</NavDropdown.Item>
                                    </NavDropdown>
                                </Nav>
                                <ThemeToggle />
                            </Navbar.Collapse>
                        </Container>
                    </Navbar>
                </header>

                <ScrollToTop />
                <ClearCache ref={clearCacheRef}/>

                {/* Actual Content Here */}
                <Container fluid="true">
                    <Outlet/>
                </Container>

                {/* Footer */}
                <hr className="mt-2 mb-2"/>
                <div className="text-muted text-center lh-sm">
                    <p>Contains fun data, empowers bragging rights, enables the nerds, and justifies adult money (well)
                        spent at the Pro Shop.<br/>
                        Copyright &copy; 2025 <span className="text-primary-emphasis">Pins Go Boom!</span> Bowling Team.
                    </p>
                </div>
            </div>
        </>
    )
};

export default Layout;
