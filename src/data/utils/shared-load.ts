import {applicationCache} from "./cache";
import type {DataQuality} from "./data-quality";

export async function sharedLoad<T extends object>(category: string, key: string, fetcher: () => Promise<T>): Promise<T> {
    const generation = applicationCache.version;
    const cached = applicationCache.get(category, key) as T | null;
    if (cached != null) return cached;
    return applicationCache.getOrFetch(category, key, async () => {
        const data = await fetcher();
        if (applicationCache.version === generation && !(data as DataQuality).warnings?.length) applicationCache.put(category, key, data);
        return data;
    });
}
