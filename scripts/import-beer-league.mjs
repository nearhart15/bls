import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {assertTrustedUrl, MiB, pdfBytesToText, readLimitedBytes, readLimitedJson, readLimitedText, safeFetch} from "./security-utils.mjs";

const LEAGUES_URL = "https://arapahoebowl.com/league-options/";
const AJAX_URL = new URL("/wp-admin/admin-ajax.php", LEAGUES_URL).href;
const USER_AGENT = "BLS Beer League importer (+https://github.com/nearhart15/bls)";
const OUTPUT = process.env.BEER_LEAGUE_OUTPUT || "public/data/beer-league.json";
const HISTORY_DIR = process.env.BEER_LEAGUE_HISTORY_DIR || "public/data/beer-league-history";
const TRUSTED_HOSTS = ["arapahoebowl.com"];

function decodeHtml(value) { return value.replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&#039;", "'").replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">"); }
async function request(url, options = {}) {
    const response = await safeFetch(url, {
        ...options,
        headers: {"user-agent": USER_AGENT, accept: "text/html,application/json,application/pdf,*/*;q=0.8", ...(options.headers || {})},
    }, {allowedHosts: TRUSTED_HOSTS});
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
    return response;
}
function publicActions(html){return [...new Set([...html.matchAll(/publicRequest\(\s*["']([^"']+)["']\s*\)/g)].map(m=>m[1]))];}
async function publicData(action){const r=await request(AJAX_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8"},body:new URLSearchParams({action}).toString()});const j=await readLimitedJson(r, 4 * MiB);if(!j?.success)throw new Error(`Public AJAX action ${action} failed.`);return j.data;}
function objects(value,output=[]){if(!value||typeof value!=="object")return output;if(!Array.isArray(value))output.push(value);for(const child of Object.values(value))objects(child,output);return output;}

export function seasonScore(seasonValue, now = new Date()) {
  const season = String(seasonValue ?? "");
  const years = [...season.matchAll(/\b(20\d{2})\b/g)].map(match => Number(match[1]));
  const shortEnd = season.match(/20(\d{2})\s*[–-]\s*(\d{2})\b/);
  if (shortEnd) years.push(2000 + Number(shortEnd[2]));
  if (!years.length) return 0;

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const start = Math.min(...years);
  const end = Math.max(...years);
  let score = Math.max(0, 6 - Math.abs(year - start));

  // Prefer the season that should be active now, without embedding a calendar year.
  // Fall/Winter normally begins in late summer and spans into the following year.
  const expectedFallStart = month >= 8 ? year : year - 1;
  if (/fall|winter/i.test(season) && start === expectedFallStart) score += 18;
  if (/summer/i.test(season) && month >= 4 && month <= 8 && start === year) score += 18;
  if (year >= start && year <= end) score += 5;
  return score;
}

function beerScore(item, now = new Date()){const title=String(item.title??item.name??item.league_name??"");const day=String(item.day??item.weekday??item.bowling_day??"");const time=String(item.time??item.start_time??item.bowling_time??"");const season=String(item.season_label??item.season??item.season_name??"");let score=0;if(/^beer$/i.test(title.trim()))score+=100;else if(/\bbeer\b/i.test(title))score+=20;if(/thursday/i.test(day))score+=20;if(/8\s*:\s*00\s*pm/i.test(time))score+=20;score+=seasonScore(season,now);return score;}
export function rankBeerLeagueItems(items, now = new Date()){return items.map(item=>({item,score:beerScore(item,now)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);}
function findBeerLeague(dataSets){const candidates=dataSets.flatMap(({action,data})=>rankBeerLeagueItems(objects(data)).map(candidate=>({...candidate,action}))).sort((a,b)=>b.score-a.score);if(!candidates.length||candidates[0].score<100)throw new Error("Public league data did not contain the Beer league.");return candidates[0];}
function urlsFromObject(item){
    const urls=[];
    for(const [key,value] of Object.entries(item)){
        if(typeof value!=="string"||!/^https?:\/\//i.test(value))continue;
        try{urls.push({key,url:assertTrustedUrl(decodeHtml(value),TRUSTED_HOSTS).href});}catch{}
    }
    return urls;
}
function chooseLeaguePage(item){const u=urlsFromObject(item);return u.find(e=>/permalink|page|link|url/i.test(e.key)&&!/pdf|stand|cover/i.test(e.key))?.url??u.find(e=>!/\.pdf(?:$|[?#])/i.test(e.url)&&!/wp-content\/uploads/i.test(e.url))?.url??null;}
function pdfUrlsFromHtml(html,baseUrl){const patterns=[/(?:https?:\\?\/\\?\/)[^"'<>\s\\]+\.pdf(?:[?#][^"'<>\s\\]*)?/gi,/\/wp-content\/uploads\/[^"'<>\s\\]+\.pdf(?:[?#][^"'<>\s\\]*)?/gi];const urls=[];for(const p of patterns)for(const m of html.matchAll(p)){const raw=decodeHtml(m[0].replaceAll("\\/","/"));try{urls.push(assertTrustedUrl(new URL(raw,baseUrl),TRUSTED_HOSTS).href);}catch{}}return [...new Set(urls)];}
function choosePdf(item,html,page){const a=urlsFromObject(item).filter(e=>/\.pdf(?:$|[?#])/i.test(e.url));const b=pdfUrlsFromHtml(html,page).map(url=>({key:"html",url}));return [...a,...b].map(e=>{let score=0;if(/stand/i.test(e.key))score+=8;if(/beer/i.test(e.url))score+=4;if(/stand/i.test(e.url))score+=4;if(/wk|week/i.test(e.url))score+=2;return{...e,score};}).filter(e=>e.score>=4).sort((x,y)=>y.score-x.score)[0]?.url??null;}
function compactLines(text){return text.split(/\r?\n/).map(l=>l.replace(/\s+/g," ").trim()).filter(Boolean);}
function points(v){const n=Number(String(v).replace("¾",".75").replace("½",".5").replace("¼",".25"));return Number.isFinite(n)?n:null;}
function integer(v){const n=Number.parseInt(String(v),10);return Number.isFinite(n)?n:null;}
function scoreValue(v){const m=String(v).match(/(\d+)$/);return m?Number.parseInt(m[1],10):null;}
function parsePlayerRow(line){const tokens=line.split(/\s+/);let i=-1;for(let x=1;x<=tokens.length-8;x+=1)if(tokens.slice(x,x+8).every(t=>/^\d+$/.test(t))){i=x;break;}if(i<1)return null;const name=tokens.slice(0,i).join(" ");if(!name||/^(Name|High|HDCP)$/i.test(name))return null;const base=tokens.slice(i,i+8).map(integer),tail=tokens.slice(i+8);const r={name,average:base[0],handicap:base[1],pins:base[2],games:base[3],highGame:base[4],highSeries:base[5],highHandicapGame:base[6],highHandicapSeries:base[7],weekScoresRaw:[],weekScores:[],weekTotal:null,weekHandicapTotal:null};if(tail.length>=5){const scores=tail.slice(0,tail.length-2);r.weekScoresRaw=scores;r.weekScores=scores.map(scoreValue);r.weekTotal=integer(tail.at(-2));r.weekHandicapTotal=integer(tail.at(-1));}else if(tail.length===2){r.weekTotal=integer(tail[0]);r.weekHandicapTotal=integer(tail[1]);}else if(tail.length>0){r.weekScoresRaw=tail;r.weekScores=tail.map(scoreValue);}return r;}

export function parseBlsText(text,source={}){const lines=compactLines(text);const header=lines.find(l=>/\d{2}\/\d{2}\/\d{4}\s+Week\s+\d+\s+of\s+\d+/i.test(l))??"";const hm=header.match(/(\d{2}\/\d{2}\/\d{4})\s+Week\s+(\d+)\s+of\s+(\d+)\s+(.+?)\s+Page\s+\d+/i);const schedule=lines.find(l=>/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(l))??"";const sm=schedule.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}:\d{2}\s*[ap]m)/i);const standings=[];const ss=lines.findIndex(l=>/^Team Standings/i.test(l)),se=lines.findIndex((l,i)=>i>ss&&/^Review of Last Week/i.test(l));const row=/^(\d+)\s+(\d+)\s+(.+?)\s+([0-9½¼¾.]+)\s+([0-9½¼¾.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/;let division=null;if(ss>=0){const end=se>ss?se:lines.length;for(const line of lines.slice(ss+1,end)){const m=line.match(row);if(m)standings.push({division,place:integer(m[1]),number:integer(m[2]),name:m[3],won:points(m[4]),lost:points(m[5]),average:integer(m[6]),handicap:integer(m[7]),pinsWithHandicap:integer(m[8]),scratchPins:integer(m[9]),highHandicapGame:integer(m[10]),highHandicapSeries:integer(m[11]),highScratchGame:integer(m[12]),highScratchSeries:integer(m[13])});else if(!/\d/.test(line)&&!/(Points|Place|Team|Standings|Pins|Scratch|HDCP|High)/i.test(line)&&line.length<=80)division=line;}}
const teams=[],substitutes=[];const rs=lines.findIndex(l=>/^Team Rosters$/i.test(l)),subs=lines.findIndex(l=>/^Temporary Substitutes$/i.test(l));if(rs>=0){const end=subs>rs?subs:lines.length;let current=null;for(const line of lines.slice(rs+1,end)){const tm=line.match(/^(\d+)\s+-\s+(.+)$/);if(tm){current={number:integer(tm[1]),name:tm[2],players:[]};teams.push(current);continue;}if(!current||/^(High|Name)\b/i.test(line)||/Page \d+ of \d+/i.test(line))continue;const p=parsePlayerRow(line);if(p)current.players.push(p);}}if(subs>=0)for(const line of lines.slice(subs+1)){if(/^View Standings on the Web/i.test(line))break;if(/^(High|Name)\b/i.test(line)||/Page \d+ of \d+/i.test(line))continue;const p=parsePlayerRow(line);if(p)substitutes.push(p);}const map=new Map(standings.map(t=>[t.number,t]));for(const team of teams){const s=map.get(team.number);if(s)Object.assign(team,{division:s.division,place:s.place,won:s.won,lost:s.lost,average:s.average,handicap:s.handicap});}return{status:"ready",generatedAt:new Date().toISOString(),source:{directoryUrl:source.directoryUrl??LEAGUES_URL,leaguePageUrl:source.leaguePageUrl??null,pdfUrl:source.pdfUrl??null},league:{name:hm?.[4]?.trim()||"Beer",date:hm?.[1]??null,week:hm?integer(hm[2]):null,totalWeeks:hm?integer(hm[3]):null,day:sm?.[1]??"Thursday",time:sm?.[2]??null,season:source.season??null},standings,teams,substitutes};}

function archiveSnapshot(parsed,bytes){const week=parsed.league.week;if(!Number.isInteger(week)||week<1)throw new Error("Cannot archive standings without a valid week number.");const season=(parsed.league.season??"season").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");const dir=resolve(HISTORY_DIR,season);mkdirSync(dir,{recursive:true});const prefix=`week-${String(week).padStart(2,"0")}`;const hash=createHash("sha256").update(bytes).digest("hex");let revision=1;while(existsSync(join(dir,revision===1?`${prefix}.json`:`${prefix}-r${revision}.json`))){const jsonPath=join(dir,revision===1?`${prefix}.json`:`${prefix}-r${revision}.json`);const existing=JSON.parse(readFileSync(jsonPath,"utf8"));if(existing.archive?.pdfSha256===hash){console.log(`Historical snapshot already archived: ${jsonPath}`);return jsonPath;}revision+=1;}const base=revision===1?prefix:`${prefix}-r${revision}`;const jsonPath=join(dir,`${base}.json`),pdfArchive=join(dir,`${base}.pdf`);const snapshot={...parsed,archive:{week,revision,pdfSha256:hash,pdfFile:`${base}.pdf`,archivedAt:new Date().toISOString()}};writeFileSync(jsonPath,`${JSON.stringify(snapshot,null,2)}\n`);writeFileSync(pdfArchive,bytes);const indexPath=join(resolve(HISTORY_DIR),"index.json");let index={snapshots:[]};if(existsSync(indexPath))index=JSON.parse(readFileSync(indexPath,"utf8"));index.snapshots=(index.snapshots??[]).filter(x=>!(x.season===parsed.league.season&&x.week===week&&x.revision===revision));index.snapshots.push({season:parsed.league.season,week,revision,date:parsed.league.date,json:`${season}/${base}.json`,pdf:`${season}/${base}.pdf`,pdfSha256:hash});index.snapshots.sort((a,b)=>String(a.season).localeCompare(String(b.season))||a.week-b.week||a.revision-b.revision);writeFileSync(indexPath,`${JSON.stringify(index,null,2)}\n`);console.log(`Archived immutable Week ${week} revision ${revision}: ${jsonPath}`);return jsonPath;}

export async function importBeerLeague(){console.log(`Loading ${LEAGUES_URL}`);const directoryHtml=await readLimitedText(await request(LEAGUES_URL), 2 * MiB);const actions=publicActions(directoryHtml);if(!actions.length)throw new Error("Could not discover the public league AJAX actions.");const dataSets=[];for(const action of actions)dataSets.push({action,data:await publicData(action)});const league=findBeerLeague(dataSets);const leaguePageUrl=chooseLeaguePage(league.item);if(!leaguePageUrl)throw new Error("Beer league data did not include a View League URL.");console.log(`Following Beer View League target: ${leaguePageUrl}`);const leagueHtml=await readLimitedText(await request(leaguePageUrl), 2 * MiB);const pdfUrl=choosePdf(league.item,leagueHtml,leaguePageUrl);if(!pdfUrl)throw new Error("Beer league page did not expose a standings PDF URL.");console.log(`Downloading standings PDF: ${pdfUrl}`);const bytes=Buffer.from(await readLimitedBytes(await request(pdfUrl), 20 * MiB));if(bytes.length<5||bytes.subarray(0,5).toString("ascii")!=="%PDF-")throw new Error("Standings URL did not return a PDF.");const pdfText=pdfBytesToText(bytes,{prefix:"bls-beer-",maxTextBytes:5 * MiB});const parsed=parseBlsText(pdfText,{directoryUrl:LEAGUES_URL,leaguePageUrl,pdfUrl,season:league.item.season_label??league.item.season??league.item.season_name??null});if(!parsed.standings.length||!parsed.teams.length)throw new Error(`PDF parsed incompletely: ${parsed.standings.length} standings rows, ${parsed.teams.length} teams.`);if(!/^Thursday$/i.test(parsed.league.day??"")||!/^0?8:00\s*pm$/i.test(parsed.league.time??""))throw new Error(`Discovered PDF does not look like Thursday Beer League at 8:00 PM (${parsed.league.day??"unknown"} ${parsed.league.time??"unknown"}).`);mkdirSync(dirname(resolve(OUTPUT)),{recursive:true});writeFileSync(OUTPUT,`${JSON.stringify(parsed,null,2)}\n`);archiveSnapshot(parsed,bytes);console.log(`Wrote ${OUTPUT}: ${parsed.standings.length} standings teams, ${parsed.teams.length} rosters, ${parsed.substitutes.length} substitutes.`);return parsed;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){importBeerLeague().catch(error=>{console.error(error instanceof Error?error.stack:error);process.exitCode=1;});}
