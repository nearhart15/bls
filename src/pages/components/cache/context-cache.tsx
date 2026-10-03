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

import {createContext, type FC, type ReactNode, use, useMemo} from "react";

import {Cache} from "./cache";

const ContextCache = createContext<Cache | undefined>(undefined);

interface ContextCacheProviderParams {
    children?: ReactNode;
}
export const ContextCacheProvider: FC<ContextCacheProviderParams> = ({children} :ContextCacheProviderParams) => {
    const cache = useMemo(() => new Cache(), []);
    return  (
        <ContextCache value={cache}>
            {children}
        </ContextCache>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useContextCache = () => {
    return use(ContextCache);
}
