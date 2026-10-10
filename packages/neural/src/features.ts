import { encodePublic, type TrainingExample, type PublicEncodingState } from '../../training/src/index';
import type { Action, Geometry } from '../../shared/src/index';
export const FEATURE_VERSION = 'shashbesh-compact-v1';
export type RawFeatures = Pick<TrainingExample, 'pieces' | 'playerMask' | 'activePlayer' | 'dice' | 'remainingValues' | 'candidates'>;
const hot = (i: number, n: number) => Array.from({ length: n }, (_, j) => j === i ? 1 : 0);
/** Compresses only already existing public numerical features. No outcome, seed, future roll or after-state enters X. */
export function compact(input: RawFeatures, geometry: Geometry): number[][] {
    const actor = input.activePlayer.indexOf(1) + 1;
    const compactPieces = input.pieces.map(row => {
        const position = row.slice(6, 71).indexOf(1), cell = position >= 0 && position < 64 ? geometry.cells[position] : null;
        return [row[0], ...row.slice(1, 6), cell ? (cell.x - 7) / 6 : 0, cell ? (cell.y - 7) / 6 : 0, row[71], row[72]];
    });
    const state = [...compactPieces.flat(), ...input.playerMask, ...input.activePlayer, ...input.dice.flat(), ...input.remainingValues.map(n => n / 4)];
    return input.candidates.map(a => {
        const [piece, kind, value, target] = a, cell = target >= 0 ? geometry.cells[target] : null;
        const moved = piece >= 0 ? compactPieces[piece] : Array(10).fill(0);
        const captures = a.slice(4), capturedProgress = captures.reduce((sum, flag, i) => sum + flag * compactPieces[i][8], 0), captureCount = captures.reduce((s, n) => s + n, 0);
        let threats = 0;
        if (cell?.outer)
            for (let i = 0; i < input.pieces.length; i++) {
                const row = input.pieces[i], enemyOwner = Math.floor(i / 5) + 1;
                if (enemyOwner === actor || row[2] !== 1)
                    continue;
                const pos = row.slice(6, 71).indexOf(1), enemy = geometry.cells[pos];
                if (enemy?.outer) {
                    const distance = (cell.outer - enemy.outer + 48) % 48;
                    if (distance > 0 && distance <= 6)
                        threats++;
                }
            }
        const action = [...hot(kind, 4), value / 6, cell ? (cell.x - 7) / 6 : 0, cell ? (cell.y - 7) / 6 : 0, cell?.owner === actor && cell.homeIndex !== null ? 1 : 0, cell?.owner === actor ? (cell.homeIndex ?? -1) / 4 : -1, capturedProgress, captureCount / 5, threats / 15, cell?.outer ? (geometry.starts[actor] - cell.outer + 48) % 48 / 48 : 0, ...captures, ...moved];
        return [...state, ...action];
    });
}
export function actionVectors(state: PublicEncodingState, actions: Action[], geometry: Geometry) { return compact(encodePublic(state, actions, geometry), geometry); }
export function vectorsFromExisting(input: TrainingExample, geometry: Geometry) { return compact(input, geometry); }
