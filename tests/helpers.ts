import { readFileSync } from 'node:fs';
import { Engine, parseGeometry, trackId } from '../packages/engine/src/index';
import type { GameState, Player } from '../packages/shared/src/index';
export const geometry = parseGeometry(readFileSync(new URL('../data/igra_64_koordinaty.csv', import.meta.url), 'utf8'));
export const engine = new Engine(geometry);
export function ready() { return engine.initialRoll(engine.create([1, 2]), { 1: 6, 2: 1 }); }
export function track(s: GameState, id: string, pos: number, steps = pos - 1) { Object.assign(s.pieces.find(p => p.id === id)!, { status: 'track', position: trackId(pos), outerSteps: steps, homeIndex: null, finishedSlot: null }); return s; }
export function home(s: GameState, id: string, index: number, finished = false) { const p = s.pieces.find(p => p.id === id)!; Object.assign(p, { status: finished ? 'finished' : 'home', position: geometry.homes[p.owner][index], outerSteps: 48, homeIndex: index, finishedSlot: finished ? index : null }); return s; }
