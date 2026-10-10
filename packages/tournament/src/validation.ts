import type { Engine } from '../../engine/src/index';
import { stateHash } from '../../engine/src/index';
import { strategies, baselineStrategies, type Strategy } from '../../agents/src/index';
import { simulate, type Simulation } from './index';
export function combinations(): Strategy[][] {
    const result: Strategy[][] = [];
    function add(prefix: Strategy[], n: number) {
        if (prefix.length === n) {
            result.push(prefix);
            return;
        }
        for (const s of baselineStrategies)
            add([...prefix, s], n);
    }
    for (const n of [2, 3, 4])
        add([], n);
    return result;
}
export function metrics(game: Simulation) {
    let turns = 0, doubles = 0, shashbesh = 0, blockedRollStreak = 0, maxBlockedRollStreak = 0, awaitTurn = true;
    const first = game.state.turnOrder[0];
    for (const e of game.state.eventLog) {
        if (e.type === 'turn_changed')
            awaitTurn = true;
        if (e.type === 'dice_roll') {
            if (awaitTurn) {
                turns++;
                awaitTurn = false;
            }
            const dice = (e.payload as {
                dice: [
                    number,
                    number
                ];
            }).dice;
            if (dice[0] === dice[1])
                doubles++;
            if (dice[0] + dice[1] === 11)
                shashbesh++;
        }
        if (e.type === 'roll_finished') {
            blockedRollStreak = (e.payload as {
                usedPoints: number;
            }).usedPoints === 0 ? blockedRollStreak + 1 : 0;
            maxBlockedRollStreak = Math.max(maxBlockedRollStreak, blockedRollStreak);
        }
    }
    const reasons: string[] = [];
    if (game.outcome === 'timeout')
        reasons.push('roll_limit');
    if (game.outcome === 'error')
        reasons.push('engine_or_agent_error');
    if (game.rolls > 1000)
        reasons.push('long_game_over_1000_rolls');
    if (maxBlockedRollStreak >= 100)
        reasons.push('100_consecutive_blocked_rolls');
    return { turns, doubles, shashbesh, firstPlayer: first, winnerTurnRank: game.winner === null ? null : game.state.turnOrder.indexOf(game.winner) + 1, maxBlockedRollStreak, suspiciousReasons: reasons };
}
export type ValidationResult = Omit<Simulation, 'state'> & ReturnType<typeof metrics> & {
    replayVerified: boolean;
};
const range = (values: number[]) => ({ average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0, min: values.length ? Math.min(...values) : 0, max: values.length ? Math.max(...values) : 0 });
const rate = (wins: number, entries: number) => entries ? wins / entries * 100 : 0;
export function summarize(results: ValidationResult[]) {
    const agentStats: Record<string, {
        entries: number;
        gamesPresent: number;
        wins: number;
        winPercentPerEntry: number;
        winSharePercent: number;
    }> = {};
    const seatStats: Record<string, {
        entries: number;
        wins: number;
        winPercent: number;
    }> = {};
    const agentSeats: typeof seatStats = {}, agentRanks: typeof seatStats = {};
    const turnRankStats: typeof seatStats = {};
    const groups: Record<string, {
        games: number;
        completed: number;
        wins: Record<string, number>;
    }> = {};
    const unfinishedReasons: Record<string, number> = {};
    for (const s of strategies)
        agentStats[s] = { entries: 0, gamesPresent: 0, wins: 0, winPercentPerEntry: 0, winSharePercent: 0 };
    for (const r of results) {
        const group = r.strategies.join(',');
        groups[group] ??= { games: 0, completed: 0, wins: {} };
        groups[group].games++;
        for (const s of new Set(r.strategies))
            agentStats[s].gamesPresent++;
        r.strategies.forEach((s, i) => {
            agentStats[s].entries++;
            const key = `${r.strategies.length}p:P${i + 1}`;
            seatStats[key] ??= { entries: 0, wins: 0, winPercent: 0 };
            seatStats[key].entries++;
            const agentSeat = `${r.strategies.length}p:${s}:P${i + 1}`, rank = (i - (r.firstPlayer - 1) + r.strategies.length) % r.strategies.length + 1, agentRank = `${r.strategies.length}p:${s}:rank${rank}`;
            agentSeats[agentSeat] ??= { entries: 0, wins: 0, winPercent: 0 };
            agentSeats[agentSeat].entries++;
            agentRanks[agentRank] ??= { entries: 0, wins: 0, winPercent: 0 };
            agentRanks[agentRank].entries++;
        });
        for (let rank = 1; rank <= r.strategies.length; rank++) {
            const key = `${r.strategies.length}p:rank${rank}`;
            turnRankStats[key] ??= { entries: 0, wins: 0, winPercent: 0 };
            turnRankStats[key].entries++;
        }
        if (r.winner !== null) {
            const s = r.strategies[r.winner - 1];
            agentStats[s].wins++;
            groups[group].completed++;
            groups[group].wins[s] = (groups[group].wins[s] ?? 0) + 1;
            seatStats[`${r.strategies.length}p:P${r.winner}`].wins++;
            turnRankStats[`${r.strategies.length}p:rank${r.winnerTurnRank}`].wins++;
            agentSeats[`${r.strategies.length}p:${s}:P${r.winner}`].wins++;
            agentRanks[`${r.strategies.length}p:${s}:rank${r.winnerTurnRank}`].wins++;
        }
        else {
            const reason = r.diagnostic ?? r.suspiciousReasons[0] ?? 'unknown';
            unfinishedReasons[reason] = (unfinishedReasons[reason] ?? 0) + 1;
        }
    }
    const completed = results.filter(r => r.outcome === 'win'), rolls = results.reduce((n, r) => n + r.rolls, 0);
    for (const stats of Object.values(agentStats)) {
        stats.winPercentPerEntry = rate(stats.wins, stats.entries);
        stats.winSharePercent = rate(stats.wins, completed.length);
    }
    for (const stats of [...Object.values(seatStats), ...Object.values(turnRankStats), ...Object.values(agentSeats), ...Object.values(agentRanks)])
        stats.winPercent = rate(stats.wins, stats.entries);
    const doubles = results.reduce((n, r) => n + r.doubles, 0), shashbesh = results.reduce((n, r) => n + r.shashbesh, 0);
    return { games: results.length, completed: completed.length, completedPercent: rate(completed.length, results.length), turns: range(completed.map(r => r.turns)), rolls: range(completed.map(r => r.rolls)), allGamesTurns: range(results.map(r => r.turns)), agents: agentStats, seats: seatStats, turnRanks: turnRankStats, agentSeats, agentRanks, captures: results.reduce((n, r) => n + r.captures, 0), dice: { rolls, doubles, doublesPercent: rate(doubles, rolls), shashbesh, shashbeshPercent: rate(shashbesh, rolls) }, unfinishedReasons, suspiciousGames: results.filter(r => r.suspiciousReasons.length).length, replayVerifiedGames: results.filter(r => r.replayVerified).length, combinations: groups };
}
export function validateGame(engine: Engine, seed: string, bots: Strategy[], maxRolls: number, verifyReplay = false) {
    const game = simulate(engine, seed, bots, maxRolls), extra = metrics(game);
    let replayVerified = false, replayError: string | null = null;
    if (verifyReplay || extra.suspiciousReasons.length) {
        try {
            const replay = engine.replay(game.state.eventLog);
            if (stateHash(replay) !== game.stateHash)
                throw Error(`Replay mismatch ${seed}`);
            replayVerified = true;
        }
        catch (e) {
            replayError = (e as Error).message;
            extra.suspiciousReasons.push('replay_validation_failed');
        }
    }
    const { state, ...body } = game;
    return { result: { ...body, ...extra, outcome: replayError ? 'error' as const : body.outcome, winner: replayError ? null : body.winner, diagnostic: replayError ? 'replay_validation_failed' : body.diagnostic, replayVerified, replayError }, state };
}
