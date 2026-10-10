import { Capacitor, registerPlugin } from '@capacitor/core';
import type { LanHost } from '../../../packages/lan/src/protocol';
const native = registerPlugin<{
    discover(): Promise<{
        servers: LanHost[];
    }>;
}>('LanDiscovery');
export async function discoverLan(url: string): Promise<LanHost[]> {
    if (Capacitor.isNativePlatform())
        return (await native.discover()).servers;
    const response = await fetch(new URL('/api/discovery', url));
    if (!response.ok)
        throw Error('Введите IP узла или используйте Android NSD');
    return response.json();
}
