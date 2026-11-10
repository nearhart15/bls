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

import {lazy, Suspense, useState, type FC} from "react";
import {Container} from "react-bootstrap";
import SeriesChase from "./components/score/series-chase";
import Loader from "./components/loader";
const ScoreConverter = lazy(() => import("./components/score/converter"));

const ScoreUtils: FC = ()=> {
    const [converterLoaded, setConverterLoaded] = useState(false);
    return (
        <>
            <SeriesChase/>
            <details className="bls-score-advanced" onToggle={event => { if (event.currentTarget.open) setConverterLoaded(true); }}>
                <summary>Advanced: frame score converter <small>Import frame notation and export BLS data</small></summary>
                {converterLoaded && <Container fluid={true} className="bls-score-utils px-0"><Suspense fallback={<Loader/>}><ScoreConverter/></Suspense></Container>}
            </details>
        </>
    );
}

export default ScoreUtils;