import {cpSync} from "node:fs";
import {resolve, relative} from "node:path";

/** Source archives remain in Git for reproducibility; only runtime assets are published. */
export function copyRuntimeAssets(source = "public", destination = "dist"): void {
    const root = resolve(source);
    cpSync(root, resolve(destination), {recursive: true, filter: path => {
        const file = relative(root, path).replaceAll("\\", "/");
        if (file === "data/beer-league-history" || file.startsWith("data/beer-league-history/")) return false;
        const history = "data/leaguesecretary-beer-history/";
        if (!file.startsWith(history)) return true;
        const name = file.slice(history.length);
        return name === "players" || name.startsWith("players/") || ["player-history-index.json", "league-week-history.json"].includes(name);
    }});
}
