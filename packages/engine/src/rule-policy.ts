import {canonical} from './audit';
import type {Action,RulePolicy} from '../../shared/src/index';
export const LEGACY_POLICY:RulePolicy={jumpEntry:'skip',victory:'atomic',homeFreeze:'contiguous-tail',cornerPriority:'per-unit'};
export const POLICY:RulePolicy={jumpEntry:'skip',victory:'atomic',homeFreeze:'contiguous-tail',cornerPriority:'absolute',capturePriority:'mandatory',cornerLanding:'ordinary',cornerContinuation:'same-piece-if-legal-otherwise-transfer',cornerObstruction:'whole-path',cornerJumpConsumes:'one-die'};
export class RuleClarificationRequired extends Error{
 readonly code='CORNER_CONTINUATION_UNRESOLVED';
 constructor(readonly pieceId:string,readonly remaining:number[],readonly prefix:Action[]=[]){super(`После обязательного прыжка ${pieceId} не может продолжить ход, но другая фишка может использовать оставшиеся кубики (${remaining.join(', ')}). Требуется решение владельца; перенос или потеря кубика не предполагаются.`);this.name='RuleClarificationRequired';}
}
export class LegacyRulePolicyReadOnly extends Error{readonly code='LEGACY_RULE_POLICY_READ_ONLY';constructor(){super('Партия использует прежнюю политику правил и доступна только для просмотра. Для новых правил начните новую партию.');this.name='LegacyRulePolicyReadOnly';}}

export const isCurrentPolicy=(policy:RulePolicy)=>canonical(policy)===canonical(POLICY);
