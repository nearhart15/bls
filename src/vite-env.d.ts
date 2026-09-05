/// <reference types="vite/client" />

interface ViteTypeOptions {
    // By adding this line, you can make the type of ImportMetaEnv strict
    // to disallow unknown keys.
    strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
    readonly VITE_MISSED_MATCHUP_MODE?: string;
    readonly VITE_CACHE_DEFAULT_TTL: string,
    readonly VITE_CACHE_MAX_ENTRY_PER_CATEGORY: string,
    readonly VITE_ERROR_MAX_DETAILS_TEXT_LEN: number,
    readonly VITE_NEWS_EXPIRED_AFTER_DAYS: number,
    readonly VITE_DATA_URL_BASE: string,
    readonly VITE_DATA_LEAGUES_INDEX_RESOURCE: string,
    readonly VITE_DATA_PLAYERS_INDEX_RESOURCE: string,
    readonly VITE_DATA_NEWS_INDEX_RESOURCE: string,
    readonly VITE_GA4_TRACKING_ID: string,
    readonly VITE_GA4_TESTMODE: string,
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
