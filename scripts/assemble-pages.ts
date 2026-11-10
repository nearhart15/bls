import {copyRuntimeAssets} from "./public-assets.ts";
import {resolve} from "node:path";

const production = process.env.MAIN_BUILD;
const preview = process.env.PREVIEW_BUILD;
if (!production || !preview) throw new Error("Both validated build directories are required.");
copyRuntimeAssets(production, resolve("_site"));
copyRuntimeAssets(preview, resolve("_site/preview/beer-league-pdf-import-test"));
