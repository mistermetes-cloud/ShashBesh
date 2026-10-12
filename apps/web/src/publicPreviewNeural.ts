import type {Action,Geometry} from '../../../packages/shared/src/index';
import type {Observation} from './publicPreviewAgents';

/** Build-time boundary: the public licensing preview has no neural weights. */
export function selectAction(_scorer:unknown,_state:Observation,_legal:Action[],_geometry:Geometry):Action|null{
 throw Error('Neural weights are not included in this licensing-review preview.');
}
