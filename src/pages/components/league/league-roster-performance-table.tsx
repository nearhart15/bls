/*
 * League roster — dashboard-style performance table © 2026
 */

import type {FC} from "react";
import {Link} from "react-router";
import {Table} from "react-bootstrap";
import {PersonAdd, PersonFillLock} from "react-bootstrap-icons";

import type {TrackedLeagueTeam} from "../../../data/league/league-team-details";
import {useTheme} from "../theme";
import {comparePinnedThen} from "../../../data/player/player-pin";
import {MicroBarChart, performanceRatingFromAverage, performanceRatingFromDelta, RatingBadge, Sparkline} from "../charts/mini-charts";
import {createGameTableData} from "./league-team-roster-data";

interface Props {
    teamDetails: TrackedLeagueTeam;
    selectedPlayerId?: string;
    onSelectPlayer: (playerId: string) => void;
}

const LeagueRosterPerformanceTable: FC<Props> = ({
    teamDetails,
    selectedPlayerId,
    onSelectPlayer,
}) => {
    const {theme} = useTheme();
    const isDark = theme === "dark";

    const ranked = [...teamDetails.roster].sort((a, b) => {
        return comparePinnedThen(a.name ?? "", b.name ?? "", (() => {
            const aReg = a.status === "REGULAR" ? 0 : 1;
            const bReg = b.status === "REGULAR" ? 0 : 1;
            if (aReg !== bReg) return aReg - bReg;
            return (b.playerStats?.gameStats.average ?? 0) - (a.playerStats?.gameStats.average ?? 0);
        })());
    });

    return (
        <div className="bls-perf-scroll">
            <Table className="bls-perf-table mb-0" size="sm" hover responsive>
                <thead>
                    <tr>
                        <th className="text-center" style={{width: "2.25rem"}}>#</th>
                        <th>Bowler</th>
                        <th className="text-end">Avg</th>
                        <th className="text-end">Hcp</th>
                        <th className="text-end d-none d-md-table-cell">Pins</th>
                        <th className="text-end d-none d-md-table-cell">HG</th>
                        <th className="text-end d-none d-lg-table-cell">HS</th>
                        <th className="text-end d-none d-sm-table-cell">200+</th>
                        <th className="d-none d-xl-table-cell text-center">Micro-Bar</th>
                        <th className="d-none d-xl-table-cell text-center">Trend</th>
                        <th className="text-center">Rating</th>
                    </tr>
                </thead>
                <tbody>
                    {ranked.map((p, idx) => {
                        const stats = p.playerStats;
                        const avg = stats?.gameStats.average;
                        const weekData = p.id ? createGameTableData(teamDetails, p.id) : [];
                        const weekSeries = weekData.map((w) => w.series);
                        const weekAvgs = weekData.map((w) => w.runningAverageAfter || w.average);
                        const deltas: number[] = [];
                        for (const w of weekData) {
                            const basis = w.enteringAvg > 0 ? w.enteringAvg : (avg ?? 0);
                            if (basis <= 0) continue;
                            for (const g of [w.game1, w.game2, w.game3]) {
                                if (g > 0) deltas.push(g - basis);
                            }
                        }
                        const meanDelta = deltas.length > 0 ? deltas.reduce((s, n) => s + n, 0) / deltas.length : null;
                        const rating = meanDelta != null
                            ? performanceRatingFromDelta(meanDelta)
                            : performanceRatingFromAverage(avg);
                        const compared = weekAvgs.filter((w) => w > 0);
                        const comparedAvg = compared.length > 0 ? compared.reduce((s, n) => s + n, 0) / compared.length : avg ?? null;
                        return (
                            <tr key={p.id} className={selectedPlayerId === p.id ? "table-active" : undefined}>
                                <td className="text-center text-body-secondary fw-semibold">{idx + 1}</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="bls-bowler-icon">
                                            {p.status === "REGULAR" ? <PersonFillLock size={14} /> : <PersonAdd size={14} />}
                                        </span>
                                        <div className="min-w-0">
                                            <Link to="#" className="bls-link fw-semibold" onClick={(e) => { e.preventDefault(); if (p.id) onSelectPlayer(p.id); }}>
                                                {p.name}
                                            </Link>
                                            <div className="fs-xs text-body-secondary">
                                                {teamDetails.name}{p.status === "SUBSTITUTE" ? " · Sub" : ""}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-end fw-semibold tabular-nums">{avg != null ? avg.toFixed(1) : "—"}</td>
                                <td className="text-end tabular-nums">{stats?.leagueHandicap ?? "—"}</td>
                                <td className="text-end d-none d-md-table-cell tabular-nums">{stats?.pinfall ?? "—"}</td>
                                <td className="text-end d-none d-md-table-cell tabular-nums">{stats?.gameStats.max ?? "—"}</td>
                                <td className="text-end d-none d-lg-table-cell tabular-nums">{stats?.seriesStats.max ?? "—"}</td>
                                <td className="text-end d-none d-sm-table-cell tabular-nums">{stats?.games200 ?? "—"}</td>
                                <td className="d-none d-xl-table-cell text-center"><MicroBarChart values={weekSeries} isDark={isDark} /></td>
                                <td className="d-none d-xl-table-cell text-center"><Sparkline values={weekAvgs} isDark={isDark} /></td>
                                <td className="text-center">
                                    <RatingBadge
                                        rating={rating}
                                        delta={meanDelta}
                                        bookAverage={avg ?? null}
                                        comparedAverage={comparedAvg}
                                        sampleLabel="game scores vs entering average"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};

export default LeagueRosterPerformanceTable;
