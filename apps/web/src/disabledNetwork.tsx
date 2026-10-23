/** Production replacement: no transport imports or connection implementation. */
export type { ClientStatus } from '../../../packages/lan/src/client';
export const RoomClient = class {
    constructor() { throw new Error('Networking is disabled in this build'); }
} as unknown as typeof import('../../../packages/lan/src/client').RoomClient;
export function WifiScreen(_props: Parameters<typeof import('./WifiScreen').WifiScreen>[0]) { return null; }
export function LanPanel(_props: Parameters<typeof import('./LanPanel').LanPanel>[0]) { return null; }
