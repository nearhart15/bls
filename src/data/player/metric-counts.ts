import type {PlayerStats} from "./player-stats";
export type MetricName = "firstBall" | "strikePct" | "sparePct" | "singlePinPct" | "openPct" | "splitPct" | "strikeToSparePct" | "singlePinPickup";
export type MetricCounts = Record<MetricName, {numerator: number; denominator: number}>;
export function metricCounts(s: PlayerStats): MetricCounts { return {
 firstBall: {numerator:s.firstBallAverage * s.firstBallCount, denominator:s.firstBallCount},
 strikePct:s.strikes, sparePct:s.spares, singlePinPct:s.singlePinSpares, openPct:s.opens, splitPct:s.splits,
 strikeToSparePct:s.strikesToSpares,
 singlePinPickup:{numerator:s.allSinglePinsPickedUpAverage*s.singlePinGameCount, denominator:s.singlePinGameCount}
}; }
export function mergeMetrics(slices: {metrics?: MetricCounts}[]): Record<MetricName, number | null> {
 const keys: MetricName[] = ["firstBall","strikePct","sparePct","singlePinPct","openPct","splitPct","strikeToSparePct","singlePinPickup"];
 return Object.fromEntries(keys.map(key => {
  let n=0,d=0;
  for (const s of slices) {const metric=s.metrics?.[key];if(metric && metric.denominator>0){n+=metric.numerator;d+=metric.denominator;}}
  const scale=["strikePct","sparePct","singlePinPct","openPct","splitPct"].includes(key)?100:1;
  return [key,d>0?n/d*scale:null];
 })) as Record<MetricName, number|null>;
}
