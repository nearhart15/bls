export function performanceRatingFromDelta(delta: number | null | undefined): number | null {
    if (delta == null || Number.isNaN(delta)) return null;
    return Math.round(Math.max(0, Math.min(100, 70 + delta * 1.2)));
}

export function performanceRatingFromAverage(avg: number | null | undefined): number | null {
    if (avg == null || avg <= 0) return null;
    return Math.round(Math.max(0, Math.min(100, 70 + (avg - 180) * 0.5)));
}

export function ratingClass(rating: number | null): string {
    if (rating == null) return "bls-grade-na";
    if (rating >= 80) return "bls-grade-a";
    if (rating >= 65) return "bls-grade-b";
    if (rating >= 50) return "bls-grade-c";
    return "bls-grade-d";
}
