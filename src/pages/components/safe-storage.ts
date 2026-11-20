const MAX_KEY_LENGTH = 80;
const MAX_VALUE_LENGTH = 4096;
const SAFE_KEY = /^[A-Za-z0-9._-]+$/;

function validKey(key: string): boolean {
    return key.length > 0 && key.length <= MAX_KEY_LENGTH && SAFE_KEY.test(key);
}

export function readStorage(key: string): string | null {
    if (!validKey(key)) return null;
    try {
        const value = localStorage.getItem(key);
        return value != null && value.length <= MAX_VALUE_LENGTH ? value : null;
    } catch {
        return null;
    }
}

export function writeStorage(key: string, value: string | null): boolean {
    if (!validKey(key) || (value !== null && value.length > MAX_VALUE_LENGTH)) return false;
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}
