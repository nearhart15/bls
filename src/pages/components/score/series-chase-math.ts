export interface ChaseErrors {target?: string; games: string[]}
export interface SeriesChasePlan {
    status: "ready" | "chasing" | "secured" | "out-of-reach" | "missed";
    errors: ChaseErrors;
    target: number;
    total: number;
    completed: number;
    remaining: number;
    pinsNeeded: number;
    pace: number | null;
    ceiling: number;
    minNext: number | null;
    finish: number[];
    progress: number;
}
export type SeriesChaseResult = SeriesChasePlan | {status: "invalid"; errors: ChaseErrors};

/** Completed scratch games only; a blank is not a zero-score game. */
export function calculateSeriesChase(targetInput: string, gameInputs: readonly string[]): SeriesChaseResult {
    const errors: ChaseErrors = {games: ["", "", ""]};
    const rawTarget = targetInput.trim();
    const target = Number(rawTarget);
    if (!/^\d{1,3}$/.test(rawTarget) || target < 1 || target > 900) errors.target = "Choose a whole series target from 1 to 900.";
    if (gameInputs.length !== 3) {
        errors.games[0] = "Enter exactly three game slots.";
        return {status: "invalid", errors};
    }
    const rawGames = gameInputs.map(value => value.trim());
    const scores: number[] = [];
    for (let index = 0; index < 3; index++) {
        const raw = rawGames[index];
        if (!raw) continue;
        const score = Number(raw);
        if (!/^\d{1,3}$/.test(raw) || score > 300) errors.games[index] = "Use a whole scratch score from 0 to 300.";
        else scores.push(score);
    }
    const firstBlank = rawGames.findIndex(value => !value);
    if (firstBlank >= 0 && rawGames.slice(firstBlank + 1).some(Boolean)) errors.games[firstBlank] = "Enter Game " + (firstBlank + 1) + " before adding later games.";
    if (errors.target || errors.games.some(Boolean)) return {status: "invalid", errors};
    const total = scores.reduce((sum, score) => sum + score, 0);
    const completed = scores.length, remaining = 3 - completed;
    const pinsNeeded = Math.max(0, target - total);
    const ceiling = total + remaining * 300;
    const reachable = ceiling >= target;
    const status = pinsNeeded === 0 ? "secured" : remaining === 0 ? "missed" : !reachable ? "out-of-reach" : completed === 0 ? "ready" : "chasing";
    const finish = remaining > 0 && reachable ? Array.from({length: remaining}, (_, index) => Math.floor(pinsNeeded / remaining) + (index >= remaining - pinsNeeded % remaining ? 1 : 0)) : [];
    return {status, errors, target, total, completed, remaining, pinsNeeded,
        pace: remaining ? pinsNeeded / remaining : null, ceiling,
        minNext: remaining > 0 && reachable ? Math.max(0, pinsNeeded - 300 * (remaining - 1)) : null,
        finish, progress: Math.min(100, total / target * 100)};
}
