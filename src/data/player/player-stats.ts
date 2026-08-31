/*
 * Copyright (c) 2025. Bindul Bhowmik
 */

export class StatGroup {
    count = 0;
    average = 0;
    min = 0;
    max = 0;
    sd = 0;
}

export class RatioGroup {
    numerator = 0;
    denominator = 0;
    pct = 0;

    constructor (numerator = 0, denominator = 0) {
        this.numerator = numerator;
        this.denominator = denominator;
        this.pct = (denominator == 0) ? 0 : numerator / denominator;
    }
}

export type StrikesInARow = [number, number];

export class PlayerStats {
    incompleteFrameData = false;
    pinfall = 0;
    gameStats: StatGroup = new StatGroup();
    seriesStats: StatGroup = new StatGroup();
    gameAverages: number[] = [];
    firstBallAverage = 0;
    strikes: RatioGroup = new RatioGroup();
    spares: RatioGroup = new RatioGroup();
    singlePinSpares: RatioGroup = new RatioGroup();
    opens: RatioGroup = new RatioGroup();
    splits: RatioGroup = new RatioGroup();
    strikesToSpares: RatioGroup = new RatioGroup();
    cleanGames = 0;
    hungCount = 0;
    turkeyCount = 0;
    games200: number = 0;
    games300 = 0;
    series600: number = 0;
    series800 = 0;
    strikesInARow: StrikesInARow[] = [];
    allSinglePinsPickedUpAverage = 0;
}
