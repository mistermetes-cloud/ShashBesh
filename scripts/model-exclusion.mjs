import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

// The exclusion record contains a one-way digest, never weight values. It allows
// source-only public profiles to verify exclusion without bundling the model.
export function containsExcludedWeights(javascript){
 const exclusion=JSON.parse(readFileSync(new URL('../release/model-exclusion.json',import.meta.url),'utf8'));
 const tokens=javascript.match(/(?<![\w.])[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?![\w.])/gi)??[];
 const values=tokens.map(Number);
 for(let i=0;i<=values.length-exclusion.prefixLength;i++){
  const hash=createHash('sha256').update(values.slice(i,i+exclusion.prefixLength).join(',')).digest('hex');
  if(hash===exclusion.prefixSha256)return true;
 }
 return false;
}
