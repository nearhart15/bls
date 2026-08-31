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

import {useEffect, useState} from "react";
import {useContextCache} from "./context-cache";

export interface CachedFetcherReturn<T> {
    data: T | null;
    isLoading: boolean;
    error: unknown;
}
export function useCachedFetcher<T extends object>(fetcher :() => Promise<T>, category: string, key?:string): CachedFetcherReturn<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<unknown>(null);
    const contextCache = useContextCache();

    useEffect(() => {
        let cancelled = false;
        setError(null);
        if (contextCache != null) {
            const value = contextCache.get(category, key) as T;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (value != null) {
                setData(value);
                setLoading(false);
                return;
            }
        }
        setData(null);
        setLoading(true);
        fetcher().then((data) => {
                if (cancelled) return;
                if (contextCache != null) {
                    contextCache.put(category, key, data);
                }
                setData(data);
            })
            .catch((error :unknown) => {
                if (cancelled) return;
                console.error(error);
                setError(error);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [category, key]);

    return {data, isLoading, error};
}
