/** League posting rule: discard the fractional average, then the fractional handicap. */
export function calculatePercentageHandicap(average: number, target: number, percentage: number): number {
    return average >= target ? 0 : Math.floor((target - Math.floor(average)) * (percentage / 100));
}
