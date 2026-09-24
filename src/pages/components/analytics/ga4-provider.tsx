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

import {type ReactNode, type FC, useEffect, useRef} from "react";
import {useLocation} from "react-router";

const ANALYTICS_TEST_MODE :string = import.meta.env.VITE_GA4_TESTMODE;
const DEFAULT_GA4_TRACKING_ID :string = import.meta.env.VITE_GA4_TRACKING_ID;
const GA4_ID = /^G-[A-Z0-9]{6,20}$/;
type ReactGA = (typeof import("react-ga4"))["default"];

interface G4ProviderParams {
    trackingId?: string;
    children?: ReactNode;
}

const G4Provider: FC<G4ProviderParams> = ({trackingId = DEFAULT_GA4_TRACKING_ID, children}) => {
    const location = useLocation();
    const validTrackingId = GA4_ID.test(trackingId) ? trackingId : undefined;
    const analyticsReady = useRef<Promise<ReactGA> | null>(null);

    useEffect(() => {
        if (!validTrackingId) {
            analyticsReady.current = null;
            return;
        }
        const ready = import("react-ga4").then(({default: ga}) => {
            if (ANALYTICS_TEST_MODE === "true") ga.initialize(validTrackingId, {testMode: true});
            else ga.initialize(validTrackingId);
            return ga;
        });
        analyticsReady.current = ready;
        return () => {
            if (analyticsReady.current === ready) analyticsReady.current = null;
        };
    }, [validTrackingId]);

    useEffect(() => {
        const ready = analyticsReady.current;
        if (!validTrackingId || !ready) return;
        let cancelled = false;
        void ready.then(ga => {
            if (!cancelled) ga.send({hitType: "pageview", page: location.pathname});
        });
        return () => { cancelled = true; };
    }, [location.pathname, validTrackingId]);

    return <>{children}</>;
}

export default G4Provider;
