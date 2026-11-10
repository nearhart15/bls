import {execFileSync, spawnSync} from "node:child_process";
import {safeWorkspacePath} from "./security-utils.mjs";

const [message, ...paths] = process.argv.slice(2);
if (!message || paths.length === 0) throw new Error("Provide a commit message and generated-data paths.");
for (const path of paths) safeWorkspacePath(path);
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required.");
const env = {...process.env, GIT_CONFIG_COUNT:"1", GIT_CONFIG_KEY_0:"http.extraheader", GIT_CONFIG_VALUE_0:"AUTHORIZATION: basic " + Buffer.from("x-access-token:" + token).toString("base64")};
function git(...args) { return execFileSync("git", args, {env, stdio:["ignore","pipe","pipe"]}); }
git("add", "--", ...paths);
const diff = spawnSync("git", ["diff","--cached","--quiet"], {env, stdio:"ignore"});
if (diff.status === 0) { console.log("Generated data is unchanged; no publication requested."); process.exit(0); }
if (diff.status !== 1) throw new Error("Could not inspect staged generated data.");
git("diff","--cached","--check");
git("config","user.name","github-actions[bot]");
git("config","user.email","41898282+github-actions[bot]@users.noreply.github.com");
git("commit","-m",message);
let pushed = false;
for (let attempt=1;attempt<=3;attempt++) {
    try { git("pull","--rebase","origin","main");git("push","origin","HEAD:main");pushed=true;break; }
    catch { console.log("Generated-data push attempt " + attempt + " failed."); }
}
if (!pushed) throw new Error("Could not publish generated data after three attempts.");
// workflow_dispatch is an explicit trigger permitted for GITHUB_TOKEN-created commits.
execFileSync("gh", ["workflow","run","check.yml","--ref","main"], {env:{...process.env,GH_TOKEN:token},stdio:"inherit"});
