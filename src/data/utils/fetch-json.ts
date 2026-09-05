import {validateFrames} from "./bowling-input";
const MAX_BYTES = 8 * 1024 * 1024;
/** Keep data-loc inside the configured data directory, including after URL normalization. */
export function dataUrl(base: string, location: string): string {
 const origin = new URL(base, window.location.href);
 if (!/^[A-Za-z0-9_./-]+\.json$/.test(location)) throw new Error("Invalid data filename");
 if (!location || /[\\?#]/.test(location) || location.split("/").some(part => decodeURIComponent(part) === "..")) throw new Error("Invalid data location");
 const url = new URL(location, origin);
 if (url.origin !== origin.origin || !url.pathname.startsWith(origin.pathname) || !["https:","http:"].includes(url.protocol)) throw new Error("Data location is outside the configured directory");
 return url.href;
}
export function validateJson(value: unknown, key = "", depth = 0): void {
 if (depth > 30) throw new Error("Data nesting limit exceeded");
 if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Invalid number: " + key);
 if (typeof value === "string" && (value.length > 20000 || (["id","player","name"].includes(key) && (value.length > 200 || /[\r\n\x00-\x1f]/.test(value))))) throw new Error("Invalid text: " + key);
 const bounds: Record<string, [number,number]> = {"games-per-week":[1,12],"lineup":[1,20],"legal-min-lineup":[0,20],"roster":[0,100],"scratch-score":[0,6000],"entering-avg":[0,300],"entering-average":[0,300],"hdcp":[0,6000],"week":[1,200],"duration":[1,200],"pct-to-target":[0,100],"target":[0,300],"default-penalty":[0,300]};
 const structuralField = (key === "hdcp" && typeof value === "object") || (key === "roster" && Array.isArray(value));
 if (key in bounds && value != null && !structuralField) {const [min,max]=bounds[key];if(typeof value!=="number" || value<min || value>max || (["games-per-week","lineup","roster","week","duration"].includes(key) && !Number.isInteger(value))) throw new Error("Invalid numeric range: " + key);}
 if (Array.isArray(value)) {
  if(value.length>10000) throw new Error("Too many records: " + key);
  if(key==="frames" && value.length) validateFrames(value);
  const ids = new Set<string>();
  for(const item of value as unknown[]) {if(item && typeof item==="object" && "id" in item && typeof item.id==="string"){if(ids.has(item.id)) throw new Error("Duplicate ID: "+item.id);ids.add(item.id);}validateJson(item,"",depth+1);}
 } else if(value && typeof value==="object") {
  if(Object.keys(value).length>200)throw new Error("Too many object fields");
  for(const [field,item] of Object.entries(value)) {if(["__proto__","constructor","prototype"].includes(field))throw new Error("Forbidden object field");validateJson(item,field,depth+1);}
 }
}
export async function fetchJson(url: string): Promise<object> {
 const controller = new AbortController();
 const timer = setTimeout(()=>{ controller.abort(); },15000);
 try {
  const response=await fetch(url,{signal:controller.signal});
  if(!response.ok)throw new Error("Data request failed (HTTP " + response.status + ")");
  if(Number(response.headers.get("content-length"))>MAX_BYTES)throw new Error("Data file is too large");
  const reader=response.body?.getReader();if(!reader)throw new Error("Empty data response");
  const chunks: Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new Error("Data file is too large");}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const result: unknown=JSON.parse(new TextDecoder().decode(bytes));
  if(!result || typeof result!=="object" || Array.isArray(result))throw new Error("Expected a JSON document");
  validateJson(result);return result;
 } finally {clearTimeout(timer);}
}
