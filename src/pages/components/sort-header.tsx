import type {CSSProperties} from "react";

interface SortHeaderProps<Key extends string> {
    label: string;
    sortKey: Key;
    active: Key;
    dir: "asc" | "desc";
    onSort: (key: Key) => void;
    className?: string;
    style?: CSSProperties;
    nativeButton?: boolean;
}

export function SortHeader<Key extends string>({label, sortKey, active, dir, onSort, className, style, nativeButton = false}: SortHeaderProps<Key>) {
    const isActive = active === sortKey;
    if (nativeButton) return <th scope="col" className={className} style={style} aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" className="bls-table-sort" onClick={() => { onSort(sortKey); }}>{label}<span aria-hidden>{isActive ? (dir === "asc" ? " ↑" : " ↓") : " ↕"}</span></button>
    </th>;
    return (
        <th className={`bls-sortable-th ${className ?? ""}${isActive ? " is-sorted" : ""}`} style={style}
            onClick={() => { onSort(sortKey); }} role="button" tabIndex={0}
            onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSort(sortKey);
                }
            }}
            aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}>
            <span className="bls-sortable-label">{label}<span className="bls-sort-indicator" aria-hidden>{isActive ? (dir === "asc" ? " ▲" : " ▼") : ""}</span></span>
        </th>
    );
}
