export interface Rng {
    die(): number;
    next(): number;
}
export function seeded(seed: string): Rng {
    let state = 2166136261;
    for (const char of seed) {
        state ^= char.charCodeAt(0);
        state = Math.imul(state, 16777619);
    }
    const next = () => { state = (state + 0x6D2B79F5) | 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return { next, die: () => Math.floor(next() * 6) + 1 };
}
export const secure: Rng = { next: () => { const data = new Uint32Array(1); globalThis.crypto.getRandomValues(data); return data[0] / 4294967296; }, die: () => {
        const data = new Uint32Array(1);
        do {
            globalThis.crypto.getRandomValues(data);
        } while (data[0] >= 4294967292);
        return data[0] % 6 + 1;
    } };
