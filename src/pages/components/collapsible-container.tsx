/*
 * Copyright (c) 2025. Bindul Bhowmik
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import * as React from "react";
import {useEffect, useMemo} from "react";
import {Link} from "react-router";
import {CardBody, Collapse} from "react-bootstrap";
import {ChevronDown, ChevronLeft} from "react-bootstrap-icons";

import {type Breakpoint, BREAKPOINTS, isBreakpointSmallerThan} from "./ui-utils";

export interface CollapsibleContainerProps {
    children: React.ReactNode;
    headerTitle: string;
    divId: string;
    currentBreakpoint?: Breakpoint;
    hideBelowBreakpoint?: Breakpoint;
    alwaysShowToggle?: boolean;
}
export function CollapsibleContainer({ children, headerTitle, divId, currentBreakpoint, hideBelowBreakpoint, alwaysShowToggle = false }: CollapsibleContainerProps): React.ReactNode {
    const [open, setOpen] = React.useState(true);

    useEffect(() => {
        if (isBreakpointSmallerThan(currentBreakpoint, hideBelowBreakpoint)) {
            setOpen(false);
        }
    }, [currentBreakpoint, hideBelowBreakpoint]);

    // Create toggle bar visibility classes: https://getbootstrap.com/docs/5.3/utilities/display/#hiding-elements
    const tbvc = useMemo(() => {
        let tbvc = "";
        if (hideBelowBreakpoint) {
            tbvc += "d-block";
            for (let i = 0; i < BREAKPOINTS.length; i++) {
                if (hideBelowBreakpoint.order == BREAKPOINTS[i].order && (i + 1) < BREAKPOINTS.length) {
                    tbvc = tbvc + " d-" + BREAKPOINTS[i + 1].name + "-none";
                }
            }
        }
        return tbvc;
    }, [hideBelowBreakpoint])


    return (
        <>
            <CardBody className={`my-0 pt-1 pb-0 ${alwaysShowToggle ? "d-block" : tbvc}`}>
                <Link onClick={() => { setOpen(!open); }} to={`#${divId}`} aria-expanded={open} aria-controls={divId} data-toggle="collapse">
                    <span className={`fs-6 lh-sm ${open && !alwaysShowToggle ? 'd-none' : ''}`}>{headerTitle}</span>
                    <span className="float-end">{open ? <ChevronDown width={12} height={12}/> : <ChevronLeft width={12} height={12}/>}</span>
                </Link>
            </CardBody>
            <Collapse in={open}>
                <div id={divId}>{children}</div>
            </Collapse>
        </>
    );
}