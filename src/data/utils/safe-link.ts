function safeHttpsLink(value: string | undefined, domain: string): string | undefined {
    if (!value) return undefined;
    try {
        const url = new URL(value);
        const hostAllowed = url.hostname === domain || url.hostname.endsWith("." + domain);
        return url.protocol === "https:" && hostAllowed && !url.username && !url.password ? url.href : undefined;
    } catch {
        return undefined;
    }
}

export function safeLeagueLink(value: string | undefined): string | undefined {
    return safeHttpsLink(value, "leaguesecretary.com");
}

export function safeArapahoeLink(value: string | undefined): string | undefined {
    return safeHttpsLink(value, "arapahoebowl.com");
}
