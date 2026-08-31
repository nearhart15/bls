/*
 * Player detail tables & switcher © 2026
 */

import {type FC, useCallback, useMemo, useState} from "react";
import {Link, useNavigate} from "react-router";
import {Badge, Card, CardBody, Table} from "react-bootstrap";

import type {
    PlayerLeagueAppearance,
    PlayerListEntry,
    PlayerSeasonStats,
} from "../../../data/player/player-aggregate";
import {
    buildFullPlayerList,
    PLAYER_INDEX_CACHE_CATEGORY,
} from "../../../data/player/player-aggregate";
import {useCachedFetcher} from "../cache/data-loader";

const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 1});

interface AppearancesProps {
    appearances: PlayerLeagueAppearance[];
}

type AppearSortKey = "idx" | "season" | "league" | "team" | "status" | "games" | "avg" | "hg";
type SortDir = "asc" | "desc";

const AppearSortTh: FC<{
    label: string; sortKey: AppearSortKey; active: AppearSortKey; dir: SortDir;
    onSort: (k: AppearSortKey) => void; className?: string;
}> = ({label, sortKey, active, dir, onSort, className}) => {
    const isActive = active === sortKey;
    return (
        <th className={`bls-sortable-th ${className ?? ""}${isActive ? " is-sorted" : ""}`} onClick={() => onSort(sortKey)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(sortKey); } }}
            aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}>
            <span className="bls-sortable-label">{label}<span className="bls-sort-indicator" aria-hidden>{isActive ? (dir === "asc" ? " ▲" : " ▼") : ""}</span></span>
        </th>
    );
};

const AppearancesPanel: FC<AppearancesProps> = ({appearances}) => {
    const [sortKey, setSortKey] = useState<AppearSortKey>("idx");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const onSort = (key: AppearSortKey) => {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else setSortKey(key);
    };
    const sorted = useMemo(() => {
        const withIdx = appearances.map((a, i) => ({a, i}));
        const mul = sortDir === "asc" ? 1 : -1;
        withIdx.sort((x, y) => {
            const A = x.a; const B = y.a; let cmp = 0;
            switch (sortKey) {
                case "season": cmp = A.season.localeCompare(B.season); break;
                case "league": cmp = A.leagueName.localeCompare(B.leagueName); break;
                case "team": cmp = A.teamName.localeCompare(B.teamName); break;
                case "status": cmp = A.status.localeCompare(B.status); break;
                case "games": cmp = (A.stats?.gameStats.count ?? -1) - (B.stats?.gameStats.count ?? -1); break;
                case "avg": cmp = (A.stats?.gameStats.average ?? -1) - (B.stats?.gameStats.average ?? -1); break;
                case "hg": cmp = (A.stats?.gameStats.max ?? -1) - (B.stats?.gameStats.max ?? -1); break;
                default: cmp = x.i - y.i; break;
            }
            if (cmp === 0) cmp = x.i - y.i;
            return cmp * mul;
        });
        return withIdx;
    }, [appearances, sortKey, sortDir]);
    if (appearances.length === 0) {
        return <Card className="bls-profile-card h-100"><CardBody className="text-body-secondary">No league appearances yet.</CardBody></Card>;
    }
    return (
        <Card className="bls-profile-card h-100">
            <div className="bls-profile-card-head">League Appearances</div>
            <div className="bls-appear-scroll">
                <Table className="bls-appear-table mb-0" size="sm" hover>
                    <thead>
                        <tr>
                            <AppearSortTh label="#" sortKey="idx" active={sortKey} dir={sortDir} onSort={onSort} />
                            <AppearSortTh label="Season" sortKey="season" active={sortKey} dir={sortDir} onSort={onSort} />
                            <AppearSortTh label="League" sortKey="league" active={sortKey} dir={sortDir} onSort={onSort} />
                            <AppearSortTh label="Team" sortKey="team" active={sortKey} dir={sortDir} onSort={onSort} />
                            <AppearSortTh label="Status" sortKey="status" active={sortKey} dir={sortDir} onSort={onSort} />
                            <AppearSortTh label="Games" sortKey="games" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <AppearSortTh label="Avg" sortKey="avg" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <AppearSortTh label="HG" sortKey="hg" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(({a, i}) => (
                            <tr key={`${a.leagueId}-${a.teamId}-${i}`}>
                                <td className="text-body-secondary">{String(i + 1).padStart(2, "0")}</td>
                                <td>{a.season}</td>
                                <td><Link className="bls-link" to={`/league/${a.leagueId}`}>{a.leagueName}</Link></td>
                                <td><Link className="bls-link" to={`/league/${a.leagueId}/${a.teamId}`}>{a.teamName}</Link></td>
                                <td><Badge bg={a.status === "REGULAR" ? "primary" : "secondary"}>{a.status === "REGULAR" ? "Regular" : "Sub"}</Badge></td>
                                <td className="text-end tabular-nums">{a.stats?.gameStats.count ?? "—"}</td>
                                <td className="text-end tabular-nums">{a.stats ? numberFormat.format(a.stats.gameStats.average) : "—"}</td>
                                <td className="text-end tabular-nums">{a.stats?.gameStats.max ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Card>
    );
};

const PlayerSwitcher: FC<{currentId: string}> = ({currentId}) => {
    const navigate = useNavigate();
    const fetcher = useCallback(buildFullPlayerList, []);
    const {data} = useCachedFetcher<PlayerListEntry[]>(fetcher, PLAYER_INDEX_CACHE_CATEGORY);
    const players = useMemo(() => data ?? [], [data]);
    if (players.length === 0) return null;
    return (
        <aside className="bls-player-rail" aria-label="Switch player">
            {players.map((p) => (
                <button key={p.id} type="button" title={p.name} className={`bls-player-rail-btn${p.id === currentId ? " is-active" : ""}`} onClick={() => navigate(`/player/${p.id}`)}>
                    <span className="bls-player-rail-name">{p.name}</span>
                </button>
            ))}
        </aside>
    );
};

type SeasonSortKey = "season" | "leagues" | "games" | "average" | "pinfall" | "highGame" | "highSeries" | "games200" | "cleanGames" | "hungCount" | "turkeyCount";

const SeasonSortTh: FC<{
    label: string; sortKey: SeasonSortKey; active: SeasonSortKey; dir: SortDir;
    onSort: (k: SeasonSortKey) => void; className?: string;
}> = ({label, sortKey, active, dir, onSort, className}) => {
    const isActive = active === sortKey;
    return (
        <th className={`bls-sortable-th ${className ?? ""}${isActive ? " is-sorted" : ""}`} onClick={() => onSort(sortKey)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(sortKey); } }}
            aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}>
            <span className="bls-sortable-label">{label}<span className="bls-sort-indicator" aria-hidden>{isActive ? (dir === "asc" ? " ▲" : " ▼") : ""}</span></span>
        </th>
    );
};

const SeasonBreakdownTable: FC<{seasons: PlayerSeasonStats[]}> = ({seasons}) => {
    const [sortKey, setSortKey] = useState<SeasonSortKey>("season");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const onSort = (key: SeasonSortKey) => {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("desc"); }
    };
    const sorted = useMemo(() => {
        const list = [...seasons];
        const mul = sortDir === "asc" ? 1 : -1;
        list.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case "leagues": cmp = a.leagues - b.leagues; break;
                case "games": cmp = a.games - b.games; break;
                case "average": cmp = a.average - b.average; break;
                case "pinfall": cmp = a.pinfall - b.pinfall; break;
                case "highGame": cmp = a.highGame - b.highGame; break;
                case "highSeries": cmp = a.highSeries - b.highSeries; break;
                case "games200": cmp = a.games200 - b.games200; break;
                case "cleanGames": cmp = a.cleanGames - b.cleanGames; break;
                case "hungCount": cmp = a.hungCount - b.hungCount; break;
                case "turkeyCount": cmp = a.turkeyCount - b.turkeyCount; break;
                default: cmp = a.season.localeCompare(b.season); break;
            }
            if (cmp === 0) cmp = a.season.localeCompare(b.season);
            return cmp * mul;
        });
        return list;
    }, [seasons, sortKey, sortDir]);
    return (
        <Card className="bls-profile-card mb-3">
            <div className="bls-profile-card-head">Season breakdown</div>
            <div className="table-responsive">
                <Table className="bls-appear-table mb-0" size="sm" hover>
                    <thead>
                        <tr>
                            <SeasonSortTh label="Season" sortKey="season" active={sortKey} dir={sortDir} onSort={onSort} />
                            <SeasonSortTh label="Leagues" sortKey="leagues" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="Games" sortKey="games" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="Average" sortKey="average" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="Pinfall" sortKey="pinfall" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="High Gm" sortKey="highGame" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="High Ser" sortKey="highSeries" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="200s" sortKey="games200" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="Clean" sortKey="cleanGames" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="Hungs" sortKey="hungCount" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SeasonSortTh label="Turkeys" sortKey="turkeyCount" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((s) => (
                            <tr key={s.season}>
                                <td className="fw-semibold">{s.season}</td>
                                <td className="text-end">{s.leagues || "—"}</td>
                                <td className="text-end">{s.games || "—"}</td>
                                <td className="text-end">{s.games > 0 ? numberFormat.format(s.average) : "—"}</td>
                                <td className="text-end">{s.games > 0 ? s.pinfall : "—"}</td>
                                <td className="text-end">{s.games > 0 ? s.highGame : "—"}</td>
                                <td className="text-end">{s.highSeries > 0 ? s.highSeries : "—"}</td>
                                <td className="text-end">{s.games200 || "—"}</td>
                                <td className="text-end">{s.cleanGames || "—"}</td>
                                <td className="text-end">{s.hungCount || "—"}</td>
                                <td className="text-end">{s.turkeyCount || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Card>
    );
};

export {AppearancesPanel, SeasonBreakdownTable, PlayerSwitcher};
