/** League posting rule: discard the fractional average, then the fractional handicap. */
export function calculatePercentageHandicap(average: number, target: number, percentage: number): number {
    return average >= target ? 0 : Math.floor((target - Math.floor(average)) * (percentage / 100));
}

/** A lower league handicap identifies the stronger scratch bowler in a roster row. */
export function hasLowerHandicap(
    playerHandicap: number | null | undefined,
    opponentHandicap: number | null | undefined
): boolean {
    return playerHandicap != null && opponentHandicap != null
        && Number.isFinite(playerHandicap) && Number.isFinite(opponentHandicap)
        && playerHandicap < opponentHandicap;
}
