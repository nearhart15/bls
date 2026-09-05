export function safeLeagueLink(value: string | undefined): string | undefined {
 if(!value)return undefined;
 try {const url=new URL(value);return url.protocol==="https:" && (url.hostname==="leaguesecretary.com" || url.hostname.endsWith(".leaguesecretary.com")) && !url.username && !url.password ? url.href : undefined;}catch{return undefined;}
}
