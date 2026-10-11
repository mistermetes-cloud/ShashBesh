import type { GameEvent } from '../../../packages/shared/src/index';
import type {SavedAiPlan} from './aiDecisions';
import type { Controllers } from '../../../packages/agents/src/index';
import type {DisputedMoveReport} from './disputedMove';
export interface LocalSave {
    version: 'v0.3';
    aiPlan?:SavedAiPlan;
    events: GameEvent[];
    controllers: Controllers;
    count: number;
    seed: string;
    speed: number;
}
let database: Promise<IDBDatabase> | undefined;
function db() { return database ??= new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('shashbesh-v03', 3); r.onupgradeneeded = () => { if(!r.result.objectStoreNames.contains('saves')) r.result.createObjectStore('saves'); if(!r.result.objectStoreNames.contains('games')) r.result.createObjectStore('games'); if(!r.result.objectStoreNames.contains('disputedReports')) r.result.createObjectStore('disputedReports'); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
export async function loadLocalGame(): Promise<LocalSave | null> { const d = await db(); return new Promise((resolve, reject) => { const r = d.transaction('saves').objectStore('saves').get('current'); r.onsuccess = () => resolve(r.result ?? null); r.onerror = () => reject(r.error); }); }
let tail = Promise.resolve();
export function saveLocalGame(save: LocalSave) { const task = tail.then(async () => { const d = await db(); return new Promise<void>((resolve, reject) => { const tx = d.transaction(['saves','games'], 'readwrite'), store=tx.objectStore('saves'); const old=store.get('current'); old.onsuccess=()=>{const previous=old.result as LocalSave|undefined;if(previous&&previous.events.length>1&&previous.events[0].gameId!==save.events[0].gameId)tx.objectStore('games').put(previous,previous.events[0].gameId);store.put(save, 'current');};tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); }); tail = task.catch(() => { }); return task; }
export async function listLocalGames():Promise<LocalSave[]> {await tail; const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(['games','saves']), request=tx.objectStore('games').getAll(), current=tx.objectStore('saves').get('current');tx.oncomplete=()=>{const all=request.result as LocalSave[];if(current.result?.events.length>1)all.push(current.result);resolve([...new Map(all.map(save=>[save.events[0].gameId,save])).values()].reverse());};tx.onerror=()=>reject(tx.error);});}
export async function saveDisputedReport(report:DisputedMoveReport):Promise<void>{const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('disputedReports','readwrite');tx.objectStore('disputedReports').put(report,report.reportId);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
