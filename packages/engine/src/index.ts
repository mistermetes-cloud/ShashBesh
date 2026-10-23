import type { Action, GameEvent, GameState, Geometry, Piece, Player, RulePolicy, ControllerIdentity, PreservedRoll } from '../../shared/src/index';
import { trackId } from './geometry';
import { append as appendEvent, canonical, verifyChain, logicalTime, activeEvents, stateHash, type AuditOptions } from './audit';
export * from './geometry';
export * from './audit';
import {POLICY,LEGACY_POLICY,PREVIOUS_POLICY,isHistoricalPolicy,RuleClarificationRequired,LegacyRulePolicyReadOnly,isCurrentPolicy} from './rule-policy';
export {POLICY,LEGACY_POLICY,PREVIOUS_POLICY,isHistoricalPolicy,RuleClarificationRequired,LegacyRulePolicyReadOnly,isCurrentPolicy} from './rule-policy';
const die = (n: number) => {
    if (!Number.isInteger(n) || n < 1 || n > 6)
        throw Error('Кубик должен быть 1..6');
};
const copy = (s: GameState): GameState => ({ ...s, pieces: s.pieces.map(p => ({ ...p })), currentRoll: s.currentRoll ? { ...s.currentRoll, remainingActions: [...s.currentRoll.remainingActions] } : null });
const key = (a: Action) => canonical(a);
const searchKey = (s: GameState) => s.activePlayer + '|' + s.phase + '|' + s.winner + '|' + s.pieces.map(p => [p.id, p.owner, p.status, p.position, p.outerSteps, p.homeIndex, p.finishedSlot].join(':')).join(';') + '|' + s.currentRoll?.remainingActions.join(',') + '|' + (s.currentRoll?.forcedPieceId??'');
export class Engine {
    private legacyReplay=false;
    private assertActivePolicy(s:GameState){const recorded=(s.eventLog[0]?.payload as {rulePolicy?:RulePolicy}|undefined)?.rulePolicy;if(!this.legacyReplay&&(canonical(s.rulePolicy)!==canonical(POLICY)||(s.eventLog.length>0&&canonical(recorded)!==canonical(POLICY))))throw new LegacyRulePolicyReadOnly();}

    private cache = new WeakMap<GameState, {
        signature: string;
        sequences: Action[][];
    }>();
    constructor(readonly geometry: Geometry, readonly audit: AuditOptions = {}) { }
    private record(s: GameState, type: string, payload: unknown, actor = s.activePlayer, decisionMaker?: ControllerIdentity) {
        return appendEvent(s, type, payload, actor, this.audit, decisionMaker);
    }
    create(players: Player[] = [1, 2, 3, 4], gameId = 'local', seedMetadata: string | null = null, rulePolicy = POLICY, participants?: Partial<Record<Player, ControllerIdentity>>): GameState {
        if (players.length < 2 || players.length > 4 || new Set(players).size !== players.length || players.some(p => ![1, 2, 3, 4].includes(p)))
            throw Error('Нужно 2–4 разных игрока');
        if (canonical(rulePolicy) !== canonical(POLICY) && !(this.legacyReplay&&isHistoricalPolicy(rulePolicy)))
            throw Error('Неизвестная RulePolicy');
        if (participants && (Object.keys(participants).length !== players.length || players.some(p => {
            const c = participants[p];
            return !c || !['human', 'agent', 'unknown'].includes(c.kind) || !c.id || !(c.version === null || typeof c.version === 'string');
        })))
            throw Error('Invalid participant roster');
        const order = [...players].sort((a, b) => a - b);
        const s: GameState = { gameId, rulesVersion: 'v1', rulePolicy: { ...rulePolicy }, players: order, turnOrder: order, activePlayer: order[0], phase: 'initial_roll', initialContenders: order, currentRoll: null, rollCount: 0, rollSeriesCount: 0, pieces: order.flatMap(owner => Array.from({ length: 5 }, (_, i): Piece => ({ id: `P${owner}-${i + 1}`, owner, status: 'reserve', position: null, outerSteps: 0, homeIndex: null, finishedSlot: null }))), winner: null, seedMetadata, eventLog: [] };
        return this.record(s, 'game_created', { players: order, gameId, seedMetadata, rulePolicy, rulesVersion: 'v1', ...(participants ? { participants: structuredClone(participants) } : {}) });
    }
    initialRoll(s: GameState, values: Record<number, number>): GameState {
        this.assertActivePolicy(s);
        if (s.phase !== 'initial_roll')
            throw Error('Жребий уже завершён');
        if (Object.keys(values).length !== s.initialContenders.length)
            throw Error('Бросают только лидеры');
        s.initialContenders.forEach(p => die(values[p]));
        const max = Math.max(...s.initialContenders.map(p => values[p]));
        const leaders = s.initialContenders.filter(p => values[p] === max);
        let n = { ...s, initialContenders: leaders };
        if (leaders.length === 1) {
            const index = s.players.indexOf(leaders[0]);
            n = { ...n, activePlayer: leaders[0], phase: 'await_roll', turnOrder: [...s.players.slice(index), ...s.players.slice(0, index)] };
        }
        return this.record(n, 'initial_roll', { values });
    }
    roll(s: GameState, dice: [
        number,
        number
    ]): GameState {
        this.assertActivePolicy(s);
        if (s.phase !== 'await_roll')
            throw Error('Предыдущий бросок не завершён');
        dice.forEach(die);
        const preserved = s.pendingRolls?.[0];
        if (preserved && canonical(dice) !== canonical(preserved.dice))
            throw Error('Previously observed dice must be reused after undo');
        const pending = s.pendingRolls?.slice(1);
        s = { ...s };
        if (pending?.length)
            s.pendingRolls = pending;
        else
            delete s.pendingRolls;
        const extraRoll = dice[0] === dice[1] || dice[0] + dice[1] === 11;
        const roll = { id: s.rollCount + 1, dice: [...dice] as [
                number,
                number
            ], remainingActions: dice[0] === dice[1] ? Array(4).fill(dice[0]) : [...dice], extraRoll, rollSequenceNumber: s.rollSeriesCount + 1, usedPoints: 0 };
        return this.record({ ...s, phase: 'resolving_roll', currentRoll: roll, rollCount: roll.id, rollSeriesCount: roll.rollSequenceNumber }, 'dice_roll', { dice, ...(preserved ? { reusedFrom: preserved.sourceSeq } : {}) });
    }
    /** Raw single-action candidates; UI/agents must use legalActions, which enforces roll maximum. */
    candidates(s: GameState, value: number): Action[] {
        die(value);
        if (s.winner)
            return [];
        if(s.rulePolicy.cornerPriority==='absolute')return this.currentCandidates(s,value);
        const own = s.pieces.filter(p => p.owner === s.activePlayer && p.status !== 'finished');
        const occupiedCells = new Map(s.pieces.filter(p => p.position).map(p => [p.position, p]));
        const occupied = (id: string) => occupiedCells.get(id);
        const make = (p: Piece, kind: Action['kind'], path: string[]): Action | null => {
            if (path.some(id => occupied(id)?.owner === p.owner))
                return null;
            const to = path.at(-1)!;
            const victim = occupied(to);
            return { pieceId: p.id, kind, value, from: p.position, to, path, captureIds: victim ? [victim.id] : [] };
        };
        if (value === 1) {
            const jumps = own.filter(p => p.status === 'track' && this.geometry.corners.includes(Number(p.position?.slice(1)))).map(p => make(p, 'corner_jump', [trackId((Number(p.position!.slice(1)) + 11) % 48 + 1)])).filter((a): a is Action => !!a);
            if (jumps.length)
                return jumps;
        }
        const result: Action[] = [];
        for (const p of own) {
            if (p.status === 'reserve') {
                if (value === 6) {
                    const a = make(p, 'deploy', [trackId(this.geometry.starts[p.owner])]);
                    if (a)
                        result.push(a);
                }
                continue;
            }
            let pos = p.position!, steps = p.outerSteps, home = p.homeIndex;
            const path: string[] = [];
            let valid = true;
            for (let i = 0; i < value; i++) {
                if (home !== null) {
                    home++;
                    if (home > 4) {
                        valid = false;
                        break;
                    }
                    pos = this.geometry.homes[p.owner][home];
                }
                else {
                    const outer = Number(pos.slice(1));
                    const next = outer % 48 + 1;
                    steps++;
                    pos = trackId(next);
                    if (next === this.geometry.starts[p.owner] && steps >= 48)
                        home = 0;
                }
                path.push(pos);
            }
            if (valid) {
                const a = make(p, 'move', path);
                if (a)
                    result.push(a);
            }
        }
        return result;
    }
    /** Otherwise-legal atomic actions. Priority is applied to complete sequences, below. */
    private currentCandidates(s:GameState,value:number):Action[]{
        const own=s.pieces.filter(p=>p.owner===s.activePlayer&&p.status!=='finished'),occupied=new Map(s.pieces.filter(p=>p.position).map(p=>[p.position,p]));
        const blocked=(path:string[])=>path.some(cell=>occupied.get(cell)?.owner===s.activePlayer);
        const jump=(from:string)=>Array.from({length:12},(_,i)=>trackId((Number(from.slice(1))+i)%48+1));
        const result:Action[]=[];
        for(const p of own){
            if(p.status==='reserve'){if(value===6){const path=[trackId(this.geometry.starts[p.owner])];if(!blocked(path)){const victim=occupied.get(path[0]);result.push({pieceId:p.id,kind:'deploy',value,from:null,to:path[0],path,captureIds:victim?[victim.id]:[]});}}continue;}
            let pos=p.position!,steps=p.outerSteps,home=p.homeIndex;const path:string[]=[];let valid=true;
            if(value===1&&p.status==='track'&&this.geometry.corners.includes(Number(pos.slice(1)))){
                const ray=jump(pos);if(!blocked(ray)){const to=ray.at(-1)!,victim=occupied.get(to);result.push({pieceId:p.id,kind:'corner_jump',value,from:p.position,to,path:[to],captureIds:victim?[victim.id]:[],jump:{from:pos,to,path:ray}});continue;}
            }
            for(let i=0;i<value;i++){if(home!==null){home++;if(home>4){valid=false;break;}pos=this.geometry.homes[p.owner][home];}else{pos=trackId(Number(pos.slice(1))%48+1);steps++;if(pos===trackId(this.geometry.starts[p.owner])&&steps>=48)home=0;}path.push(pos);}
            if(!valid||blocked(path))continue;
            const victim=occupied.get(pos);result.push({pieceId:p.id,kind:'move',value,from:p.position,to:pos,path,captureIds:victim?[victim.id]:[]});
        }
        return result;
    }
    private assertContinuationHistory(s:GameState){
        if(s.rulePolicy.cornerPriority!=='absolute'||!s.currentRoll)return;
        const active=activeEvents(s.eventLog);let begin=-1;for(let i=active.length-1;i>=0;i--)if(active[i].type==='dice_roll'&&active[i].rollId===s.currentRoll.id){begin=i;break;}
        const actions=active.slice(begin+1).filter(e=>e.type==='action'),lastJump=actions.map((e,i)=>({e,i})).filter(x=>!!(x.e.payload as Action).jump).at(-1);
        const jumper=lastJump?(lastJump.e.payload as Action).pieceId:undefined,transferred=lastJump?actions.slice(lastJump.i+1).some(e=>(e.payload as Action).pieceId!==jumper):false;
        if(s.currentRoll.forcedPieceId!==((s.rulePolicy.cornerContinuation!=='any-piece'&&jumper&&!transferred)?jumper:undefined))throw Error('Corner continuation state does not match the active journal');
    }
    private prioritySequences(s:GameState):Action[][]{
        type Branch={actions:Action[];blocked:RuleClarificationRequired|null};
        const memo=new Map<string,Branch[]>();
        const filter=(branches:Branch[],remainingActions:readonly number[]):Branch[]=>{
            const first=(b:Branch,p:(a:Action)=>boolean)=>{const i=b.actions.findIndex(p);return i<0?Infinity:i;};
            // A corner position alone cannot impose priority. Consult unused actions,
            // rather than the original dice (a one may already have been spent).
            const corner=remainingActions.includes(1)?Math.min(...branches.map(b=>first(b,a=>!!a.jump))):Infinity;
            let chosen=Number.isFinite(corner)?branches.filter(b=>first(b,a=>!!a.jump)===corner):branches;
            // Capture priority concerns actions available now. Looking ahead to a
            // later capture would also force its ordinary approach moves (e.g.
            // four fives from М07), falsely locking out other pieces.
            if(s.rulePolicy.capturePriority==='mandatory'&&!Number.isFinite(corner)&&chosen.some(b=>b.actions[0]?.captureIds.length))chosen=chosen.filter(b=>!!b.actions[0]?.captureIds.length);
            // If the jumper has no legal continuation, the owner's clarification permits
            // remaining dice to pass to another piece. A legal jumper continuation stays mandatory.
            const unresolved=chosen.find(b=>b.blocked);if(unresolved){
                const forced=unresolved.blocked!.pieceId;
                const transfer=branches.filter(b=>b.actions.length>0&&b.actions[0].pieceId!==forced&&!b.actions.some(a=>a.jump));
                if(transfer.length)chosen=transfer;
                else throw new RuleClarificationRequired(forced,unresolved.blocked!.remaining,unresolved.actions);
            }
            const best=Math.max(...chosen.map(b=>b.actions.reduce((n,a)=>n+a.value,0)));return chosen.filter(b=>b.actions.reduce((n,a)=>n+a.value,0)===best);
        };
        const search=(state:GameState):Branch[]=>{
            if(state.winner)return [{actions:[],blocked:null}];
            const signature=searchKey(state),cached=memo.get(signature);if(cached)return cached;
            const raw=[...new Set(state.currentRoll!.remainingActions)].sort((a,b)=>a-b).flatMap(v=>this.candidates(state,v));
            const forced=state.currentRoll!.forcedPieceId;let actions=raw;
            if(forced){const continuation=raw.filter(a=>a.pieceId===forced);actions=continuation.length?continuation:raw;if(!actions.length&&raw.length)return [{actions:[],blocked:new RuleClarificationRequired(forced,[...state.currentRoll!.remainingActions])}];}
            if(!actions.length)return [{actions:[],blocked:null}];
            const branches:Branch[]=[];
            for(const a of actions){try{for(const child of search(this.execute(state,a)))branches.push({actions:[a,...child.actions],blocked:child.blocked});}catch(e){if(!(e instanceof RuleClarificationRequired))throw e;branches.push({actions:[a,...e.prefix],blocked:e});}}
            const kept=filter(branches,state.currentRoll!.remainingActions);memo.set(signature,kept);return kept;
        };
        return filter(search(s),s.currentRoll!.remainingActions).map(b=>b.actions);
    }
    private execute(s: GameState, a: Action): GameState {
        const n = copy(s), p = n.pieces.find(p => p.id === a.pieceId)!;
        for (const id of a.captureIds) {
            const victim = n.pieces.find(p => p.id === id)!;
            Object.assign(victim, { status: 'reserve', position: null, outerSteps: 0, homeIndex: null, finishedSlot: null });
        }
        p.position = a.to;
        if (a.kind === 'deploy') {
            p.status = 'track';
            p.outerSteps = 0;
            p.homeIndex = null;
        }
        else if (a.jump && s.rulePolicy.cornerPriority==='absolute') {
            p.outerSteps+=12;p.homeIndex=null;p.status='track';
            if(s.rulePolicy.cornerContinuation!=='any-piece')n.currentRoll!.forcedPieceId=p.id;
        }
        else if (a.kind === 'corner_jump') {
            p.outerSteps += 12;
            p.status = 'track';
            p.homeIndex = null;
        }
        else {
            let home = p.homeIndex;
            for (const id of a.path) {
                if (home !== null)
                    home++;
                else {
                    p.outerSteps++;
                    if (id === trackId(this.geometry.starts[p.owner]) && p.outerSteps >= 48)
                        home = 0;
                }
            }
            p.homeIndex = home;
            p.status = home === null ? 'track' : 'home';
        }
        // Freeze only a contiguous occupied tail; entered pieces are eligible, fresh deployments are not.
        for (let i = 4; i >= 0; i--) {
            const piece = n.pieces.find(q => q.owner === p.owner && q.position === this.geometry.homes[p.owner][i] && q.homeIndex === i);
            if (!piece)
                break;
            piece.status = 'finished';
            piece.finishedSlot = i;
        }
        if (n.pieces.filter(q => q.owner === p.owner && q.status === 'finished').length === 5) {
            n.winner = p.owner;
            n.phase = 'game_over';
        }
        if (n.currentRoll) {
            if(n.currentRoll.forcedPieceId&&a.pieceId!==n.currentRoll.forcedPieceId)delete n.currentRoll.forcedPieceId;
            const index = n.currentRoll.remainingActions.indexOf(a.value);
            n.currentRoll.remainingActions.splice(index, 1);
            n.currentRoll.usedPoints += a.value;
        }
        return n;
    }
    legalSequencesForRoll(s: GameState, dice?: [
        number,
        number
    ]): Action[][] {
        this.assertActivePolicy(s);
        if (dice)
            s = this.roll(s, dice);
        this.assertContinuationHistory(s);
        if (s.phase !== 'resolving_roll' || !s.currentRoll)
            return [];
        const signature = searchKey(s);
        const cachedRoll = this.cache.get(s);
        if (cachedRoll?.signature === signature)
            return cachedRoll.sequences;
        if(s.rulePolicy.cornerPriority==='absolute'){const seqs=this.prioritySequences(s);for(const seq of seqs){for(const a of seq){Object.freeze(a.path);Object.freeze(a.captureIds);if(a.jump){Object.freeze(a.jump.path);Object.freeze(a.jump);}Object.freeze(a);}Object.freeze(seq);}Object.freeze(seqs);this.cache.set(s,{signature,sequences:seqs});return seqs;}
        const memo = new Map<string, {
            sum: number;
            seqs: Action[][];
        }>();
        const search = (state: GameState): {
            sum: number;
            seqs: Action[][];
        } => {
            if (state.winner)
                return { sum: 0, seqs: [[]] };
            const cacheKey = searchKey(state);
            const cached = memo.get(cacheKey);
            if (cached)
                return cached;
            let best = 0, seqs: Action[][] = [[]];
            for (const value of new Set(state.currentRoll!.remainingActions))
                for (const a of this.candidates(state, value)) {
                    const child = search(this.execute(state, a)), sum = value + child.sum;
                    if (sum > best) {
                        best = sum;
                        seqs = [];
                    }
                    if (sum === best)
                        seqs.push(...child.seqs.map(tail => [a, ...tail]));
                }
            const result = { sum: best, seqs };
            memo.set(cacheKey, result);
            return result;
        };
        const sequences = search(s).seqs;
        for (const seq of sequences) {
            for (const a of seq) {
                Object.freeze(a.path);
                Object.freeze(a.captureIds);
                Object.freeze(a);
            }
            Object.freeze(seq);
        }
        Object.freeze(sequences);
        this.cache.set(s, { signature, sequences });
        return sequences;
    }
    legalActions(s: GameState): Action[] { return [...new Map(this.legalSequencesForRoll(s).flatMap(seq => seq.length ? [seq[0]] : []).map(a => [key(a), a])).values()]; }
    applyAction(s: GameState, a: Action, decisionMaker?: ControllerIdentity): GameState {
        const valid = this.legalActions(s).find(b => key(a) === key(b));
        if (!valid)
            throw Error('Нелегальное действие или нарушена максимальная сумма');
        return this.applyValidated(s, valid, decisionMaker);
    }
    private applyValidated(s: GameState, valid: Action, decisionMaker?: ControllerIdentity): GameState {
        let n = this.execute(s, valid);
        n = this.record(n, 'action', valid, s.activePlayer, decisionMaker);
        for (const id of valid.captureIds)
            n = this.record(n, 'capture', { pieceId: id, by: valid.pieceId });
        for (const p of n.pieces.filter(p => p.status === 'finished' && s.pieces.find(q => q.id === p.id)?.status !== 'finished'))
            n = this.record(n, 'piece_finished', { pieceId: p.id, slot: p.finishedSlot });
        if (n.winner) {
            n = this.record(n, 'roll_finished', { usedPoints: n.currentRoll!.usedPoints, unused: n.currentRoll!.remainingActions, reason: 'victory' });
            n = this.record(n, 'victory', { winner: n.winner });
        }
        return n;
    }
    applySequence(s: GameState, sequence: Action[], decisionMaker?: ControllerIdentity): GameState {
        const legal = this.legalSequencesForRoll(s);
        if (!legal.includes(sequence)) {
            const input = canonical(sequence);
            if (!legal.some(seq => canonical(seq) === input))
                throw Error('Агент выбрал недопустимую последовательность');
        }
        // The sequence is already validated against the complete search tree.
        for (const a of sequence)
            s = this.applyValidated(s, a, decisionMaker);
        return s;
    }
    finishRoll(s: GameState, decisionMaker?: ControllerIdentity): GameState {
        if (s.phase !== 'resolving_roll' || !s.currentRoll)
            throw Error('Нет броска для завершения');
        if (this.legalActions(s).length)
            throw Error('Есть обязательные доступные действия');
        let n = this.record(s, 'roll_finished', { usedPoints: s.currentRoll.usedPoints, unused: s.currentRoll.remainingActions }, s.activePlayer, decisionMaker);
        const previous = s.activePlayer;
        const next = s.currentRoll.extraRoll ? previous : s.turnOrder[(s.turnOrder.indexOf(previous) + 1) % s.turnOrder.length];
        n = { ...n, phase: 'await_roll', activePlayer: next, currentRoll: null, rollSeriesCount: s.currentRoll.extraRoll ? s.rollSeriesCount : 0 };
        return this.record(n, next === previous ? 'extra_roll' : 'turn_changed', { from: previous, to: next });
    }
    undoTarget(s: GameState, actor: Player, controller: ControllerIdentity): GameEvent | null {
        if (s.winner || s.activePlayer !== actor || controller.kind !== 'human' || !['resolving_roll', 'await_roll'].includes(s.phase))
            return null;
        const active = activeEvents(s.eventLog);
        const boundary = active.map(e => e.type).lastIndexOf('turn_changed');
        const last = active.slice(boundary + 1).reverse().find(e => e.type === 'action');
        return last && last.actor === actor && last.decisionMaker?.kind === 'human' && last.decisionMaker.id === controller.id ? last : null;
    }
    undoAction(s: GameState, actor: Player, controller: ControllerIdentity): GameState {
        const target = this.undoTarget(s, actor, controller);
        if (!target)
            throw Error('Only own human actions in the unfinished turn can be undone');
        const before = this.replay(s.eventLog.slice(0, target.seq));
        const preserved: PreservedRoll[] = [...(before.pendingRolls ?? []), ...(s.pendingRolls ?? [])];
        for (const e of s.eventLog.slice(target.seq))
            if (e.type === 'dice_roll' && e.actor === actor && (e.payload as {
                reusedFrom?: number;
            }).reusedFrom === undefined)
                preserved.push({ dice: [...(e.payload as {
                            dice: [
                                number,
                                number
                            ];
                        }).dice], sourceSeq: e.seq, sourceRollId: e.rollId! });
        const queue = [...new Map(preserved.map(p => [p.sourceSeq, p])).values()].sort((a, b) => a.sourceSeq - b.sourceSeq);
        const restored = { ...before, eventLog: s.eventLog };
        if (queue.length)
            restored.pendingRolls = queue;
        else
            delete restored.pendingRolls;
        this.assertInvariants(restored);
        return this.record(restored, 'undo_action', { targetSeq: target.seq, targetHash: target.hash, restoredHash: stateHash(restored), preservedRolls: queue }, actor, controller);
    }
    winner(s: GameState) { return s.winner; }
    assertInvariants(s: GameState) {
        const positions = s.pieces.filter(p => p.position !== null).map(p => p.position);
        if (new Set(positions).size !== positions.length)
            throw Error('Две фишки на клетке');
        if (s.pieces.length !== s.players.length * 5 || new Set(s.pieces.map(p => p.id)).size !== s.pieces.length)
            throw Error('Неверное число фишек');
        for (const owner of s.players) {
            const own = s.pieces.filter(p => p.owner === owner);
            if (own.length !== 5)
                throw Error('Неверный владелец');
            const slots = own.filter(p => p.status === 'finished').map(p => p.homeIndex).sort();
            if (slots.some((slot, i) => slot !== 5 - slots.length + i))
                throw Error('Неплотный завершённый хвост');
        }
        if (!s.players.includes(s.activePlayer) || new Set(s.turnOrder).size !== s.players.length || s.turnOrder.some(p => !s.players.includes(p)))
            throw Error('Неверная очередь');
        if (s.phase === 'resolving_roll' && !s.currentRoll)
            throw Error('Нет текущего броска');
        if (s.currentRoll) {
            s.currentRoll.dice.forEach(die);
            s.currentRoll.remainingActions.forEach(die);
            if(!Number.isInteger(s.currentRoll.usedPoints)||s.currentRoll.usedPoints<0)throw Error('Invalid spent dice points');
            if(s.currentRoll.forcedPieceId&&!s.pieces.some(p=>p.id===s.currentRoll!.forcedPieceId&&p.owner===s.activePlayer))throw Error('Invalid corner continuation piece');
            const dice = s.currentRoll.dice;
            const total = dice[0] === dice[1] ? dice[0] * 4 : dice[0] + dice[1];
            if (s.currentRoll.usedPoints + s.currentRoll.remainingActions.reduce((n, v) => n + v, 0) !== total)
                throw Error('Неверные очки броска');
        }
        for (const p of s.pieces) {
            if (!Number.isInteger(p.outerSteps) || p.outerSteps < 0)
                throw Error('Неверный прогресс');
            if (p.status === 'reserve' && (p.position !== null || p.outerSteps !== 0 || p.homeIndex !== null))
                throw Error('Неверный резерв');
            if (p.position && !this.geometry.cells.some(c => c.id === p.position))
                throw Error('Клетка не из CSV');
            if (p.homeIndex !== null && (p.outerSteps < 48 || p.position !== this.geometry.homes[p.owner][p.homeIndex]))
                throw Error('Неверное положение в доме');
            if (p.status === 'track' && (p.homeIndex !== null || !p.position?.startsWith('М') || p.outerSteps % 48 !== (Number(p.position.slice(1)) - this.geometry.starts[p.owner] + 48) % 48))
                throw Error('Неверный внешний путь');
            if (p.status === 'home' && p.homeIndex === null)
                throw Error('Неверный домашний путь');
            if (p.status === 'finished' && (p.finishedSlot !== p.homeIndex || p.homeIndex === null))
                throw Error('Неверный финиш');
        }
        if (s.winner && (s.phase !== 'game_over' || s.pieces.filter(p => p.owner === s.winner && p.status === 'finished').length !== 5))
            throw Error('Ложная победа');
    }
    replay(events: GameEvent[], onCommand?:(before:GameState,after:GameState,event:GameEvent)=>void): GameState {
        verifyChain(events);
        if (events[0]?.type !== 'game_created')
            throw Error('Нет начала игры');
        const init = events[0].payload as {
            players: Player[];
            gameId: string;
            seedMetadata: string | null;
            rulePolicy: RulePolicy;
            rulesVersion: string;
            participants?: Partial<Record<Player, ControllerIdentity>>;
        };
        if (init.rulesVersion !== 'v1')
            throw Error('Неизвестная версия правил');
        const replayEngine = new Engine(this.geometry, {
            journalVersion: events[0].journalVersion === 2 ? 2 : 1,
            timeSource: events[0].timeSource ?? 'logical',
            clock: (gameId, seq) => events[seq]?.timestamp ?? logicalTime(gameId, seq)
        });
        replayEngine.legacyReplay=isHistoricalPolicy(init.rulePolicy);
        let s = replayEngine.create(init.players, init.gameId, init.seedMetadata, init.rulePolicy, init.participants);
        while (s.eventLog.length < events.length) {
            const event = events[s.eventLog.length], before=s;
            switch (event.type) {
                case 'initial_roll':
                    s = replayEngine.initialRoll(s, (event.payload as {
                        values: Record<number, number>;
                    }).values);
                    break;
                case 'dice_roll':
                    s = replayEngine.roll(s, (event.payload as {
                        dice: [
                            number,
                            number
                        ];
                    }).dice);
                    break;
                case 'action':
                    s = replayEngine.applyAction(s, event.payload as Action, event.decisionMaker);
                    break;
                case 'undo_action':
                    s = replayEngine.undoAction(s, event.actor!, event.decisionMaker!);
                    break;
                case 'roll_finished':
                    s = replayEngine.finishRoll(s, event.decisionMaker);
                    break;
                default: throw Error(`Неожиданное событие ${event.type}`);
            }
            replayEngine.assertInvariants(s);
            onCommand?.(structuredClone(before),structuredClone(s),event);
            for (let i = event.seq; i < s.eventLog.length; i++)
                if (canonical(s.eventLog[i]) !== canonical(events[i]))
                    throw Error(`Событие ${i} не соответствует правилам`);
        }
        if (canonical(s.eventLog[0]) !== canonical(events[0]))
            throw Error('Неверное начало журнала');
        return s;
    }
}
export { actionHistory, type ActionHistory } from './history';
