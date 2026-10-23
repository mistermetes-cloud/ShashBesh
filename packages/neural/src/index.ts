import type {Action,Geometry} from '../../../packages/shared/src/index';
import type {Observation} from '../../../apps/web/src/publicPreviewAgents';

/** Build-time boundary: the public licensing preview has no neural weights. */
export function selectAction(_scorer:unknown,_state:Observation,_legal:Action[],_geometry:Geometry):Action|null{
 throw Error('Neural weights are not included in this licensing-review preview.');
}

export interface ActionScorer {id:string;version:string;score(state:unknown,actions:Action[],geometry:Geometry):number[];}
