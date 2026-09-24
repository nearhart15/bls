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

import {type ReactNode, type FC, useEffect} from "react";
import {useLocation} from "react-router";
import ReactGA from "react-ga4";

const ANALYTICS_TEST_MODE :string = import.meta.env.VITE_GA4_TESTMODE; // Stupid JS / TS crap - can't read boolean config values, they come as string
const DEFAULT_GA4_TRACKING_ID :string = import.meta.env.VITE_GA4_TRACKING_ID;
const GA4_ID = /^G-[A-Z0-9]{6,20}$/;

interface G4ProviderParams {
    trackingId?: string;
    children?: ReactNode;
}

const G4Provider: FC<G4ProviderParams> = ({trackingId = DEFAULT_GA4_TRACKING_ID, children}) => {
    const location = useLocation();
    const validTrackingId = GA4_ID.test(trackingId) ? trackingId : undefined;

    useEffect(() => {
        if (!validTrackingId) return;
        if (ANALYTICS_TEST_MODE === "true") {
            ReactGA.initialize(validTrackingId, {testMode: true});
        } else {
            ReactGA.initialize(validTrackingId);
        }
    }, [validTrackingId]);

    useEffect(() => {
        if (!validTrackingId) return;
        // Do not send query strings to analytics; they can contain user-selected IDs or filters.
        ReactGA.send({hitType: "pageview", page: location.pathname});
    }, [location.pathname, validTrackingId]);

    return <>{children}</>;
}

export default G4Provider;