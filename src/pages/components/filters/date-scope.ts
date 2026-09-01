/*
 * Map season / league labels onto calendar windows for date filters.
 */

export function parseISODate(value: string): Date | null {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function ymd(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day);
}

export function windowsForLabel(label: string): {start: Date; end: Date}[] {
    const text = (label ?? "").trim();
    if (!text) return [];
    const lower = text.toLowerCase();
    const out: {start: Date; end: Date}[] = [];

    const addMonths = (year: number, startMonth: number, endMonth: number) => {
        if (startMonth <= endMonth) {
            out.push({start: ymd(year, startMonth, 1), end: ymd(year, endMonth, 28)});
            return;
        }
        out.push({start: ymd(year, startMonth, 1), end: ymd(year + 1, endMonth, 28)});
    };

    const named = [
        {re: /\bsummer\s*(20\d{2})\b/gi, months: [6, 8]},
        {re: /\b(?:fall|autumn)\s*(20\d{2})\b/gi, months: [9, 11]},
        {re: /\bspring\s*(20\d{2})\b/gi, months: [3, 5]},
        {re: /\bwinter\s*(20\d{2})\b/gi, months: [12, 2]},
    ];
    let foundNamed = false;
    for (const row of named) {
        row.re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = row.re.exec(lower))) {
            foundNamed = true;
            const year = Number(m[1]);
            if (row.months[0] === 12) {
                out.push({start: ymd(year - 1, 12, 1), end: ymd(year, 2, 28)});
            } else {
                addMonths(year, row.months[0], row.months[1]);
            }
        }
    }
    if (foundNamed) return out;

    const pair = /(20\d{2})\s*[-/]\s*(20\d{2})/.exec(lower);
    if (pair) {
        const a = Number(pair[1]);
        const b = Number(pair[2]);
        out.push({start: ymd(a, 8, 1), end: ymd(b, 7, 31)});
        return out;
    }

    const years = lower.match(/20\d{2}/g)?.map(Number) ?? [];
    for (const year of years) {
        out.push({start: ymd(year, 1, 1), end: ymd(year, 12, 31)});
    }
    return out;
}

export function labelsMatchDateRange(labels: Array<string | null | undefined>, from: string, to: string): boolean {
    if (!from && !to) return true;
    const start = parseISODate(from) ?? new Date(1970, 0, 1);
    const end = parseISODate(to) ?? new Date(2099, 11, 31);
    end.setHours(23, 59, 59, 999);
    const parts = labels.filter((v): v is string => Boolean(v && v.trim()));
    if (!parts.length) return false;
    for (const label of parts) {
        const windows = windowsForLabel(label);
        if (!windows.length) continue;
        for (const w of windows) {
            if (w.start <= end && w.end >= start) return true;
        }
    }
    return false;
}

export function hasDateRange(from: string, to: string): boolean {
    return Boolean(from || to);
}
