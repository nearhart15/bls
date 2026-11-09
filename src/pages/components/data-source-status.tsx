import {type FC, useSyncExternalStore} from "react";
import type {LeagueDetails} from "../../data/league/league-details";
import {frameFreshness, freshnessSnapshot, latestFrameResults, subscribeToFreshness} from "../../data/utils/source-freshness";
import type {DataSource} from "./data-source";
import "../../sass/source-status.scss";

const dateFormat = new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"});

const SourceStatus: FC<{source: DataSource; through: string | null; scope?: string; loadedOnly?: boolean}> = ({source, through, scope, loadedOnly = false}) => (
    <div className="bls-source-status">
        <div className="bls-source-explanation">
            <strong>{source === "frame" ? "BinBin Data" : "A.B.C. Data"}</strong>
            <span>{source === "frame" ? "Tracked team scores with shot-by-shot detail." : "League-sheet results from Arapahoe Bowling Center."}</span>
            {scope && <span className="bls-source-scope">{scope}</span>}
        </div>
        <div className="bls-source-date" aria-live="polite">
            {through ? <>{loadedOnly ? "Latest loaded results through " : "Results through "}<time dateTime={through}>{dateFormat.format(new Date(`${through}T00:00:00Z`))}</time></> : "Results date unavailable"}
        </div>
    </div>
);

/** Describes the source dataset; page filters may show an earlier period. */
export const DataSourceStatus: FC<{source: DataSource}> = ({source}) => {
    const freshness = useSyncExternalStore(subscribeToFreshness, freshnessSnapshot, freshnessSnapshot);
    return <SourceStatus source={source} through={source === "frame" ? latestFrameResults(freshness.frame) : freshness.api?.resultsThrough ?? null} loadedOnly={source === "frame"}/>;
};

/** League views use their own loaded season and team, never the global maximum. */
export const LeagueSourceStatus: FC<{leagueDetails: LeagueDetails; teamId?: string}> = ({leagueDetails, teamId}) => {
    const freshness = frameFreshness(leagueDetails, teamId);
    const team = leagueDetails.teams.find(candidate => candidate.id === teamId);
    const scope = [leagueDetails.season, team?.name].filter(Boolean).join(" · ");
    return <SourceStatus source="frame" through={freshness.resultsThrough} scope={scope}/>;
};
