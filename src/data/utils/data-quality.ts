export interface DataQuality {warnings?: string[]}
const notices = new Map<string, string[]>();
const listeners = new Set<() => void>();
let snapshot: string[] = [];
export function reportDataQuality(key: string, warnings: string[]): void {
 if(JSON.stringify(notices.get(key) ?? []) === JSON.stringify(warnings))return;
 if(warnings.length)notices.set(key,warnings);else notices.delete(key);
 snapshot=[...new Set([...notices.values()].flat())];for(const listener of listeners)listener();
}
export function subscribeDataQuality(listener: () => void): () => void {listeners.add(listener);return () => {listeners.delete(listener);};}
export const getDataQuality = (): string[] => snapshot;
