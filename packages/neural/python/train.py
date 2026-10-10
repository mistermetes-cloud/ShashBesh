"""Bounded CPU behavior cloning. NumPy only; no training service or GPU dependency."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
os.environ['OMP_NUM_THREADS']='1'
os.environ['MKL_NUM_THREADS']='1'
import argparse,json,time,resource,hashlib,platform
from pathlib import Path
import numpy as np

def forward(x,params):
    w1,b1,w2,b2=params
    h=np.tanh(x@w1+b1)
    return h@w2+b2[0],h

def distribution(logits,mask):
    z=np.where(mask,logits,-1e9)
    z=z-np.max(z,axis=1,keepdims=True)
    p=np.exp(z)*mask
    return p/np.sum(p,axis=1,keepdims=True)

def loss_grad(x,mask,targets,params,l2=0.):
    n,k,d=x.shape;logits,h=forward(x.reshape(n*k,d),params)
    p=distribution(logits.reshape(n,k),mask)
    mass=np.maximum(np.sum(p*targets,axis=1,keepdims=True),1e-12)
    loss=float(np.mean(-np.log(mass)))
    g=(p-p*targets/mass)/n
    g=g.reshape(n*k)
    w1,b1,w2,b2=params
    dh=(g[:,None]*w2[None,:])*(1-h*h)
    grads=[x.reshape(n*k,d).T@dh+l2*w1,np.sum(dh,axis=0),h.T@g+l2*w2,np.array([np.sum(g)],dtype=np.float32)]
    return loss,grads

def selfplay_loss_grad(x,mask,chosen,returns,params):
    """On-policy terminal-return policy gradient. Positive and negative returns both contribute.
    Requires frozen behavior checkpoint, exploratory samples and no unknown outcomes.
    This extension is tested, but deliberately not called by supervised main().
    """
    n,k,d=x.shape;logits,h=forward(x.reshape(n*k,d),params);p=distribution(logits.reshape(n,k),mask)
    if not np.all(np.isfinite(returns)) or not np.all(mask[np.arange(n),chosen]):raise ValueError('Invalid self-play targets')
    q=np.maximum(p[np.arange(n),chosen],1e-12)
    loss=float(np.mean(-returns*np.log(q)))
    g=p.copy();g[np.arange(n),chosen]-=1;g*=returns[:,None]/n;g=g.reshape(n*k)
    w1,b1,w2,b2=params;dh=(g[:,None]*w2[None,:])*(1-h*h)
    return loss,[x.reshape(n*k,d).T@dh,np.sum(dh,axis=0),h.T@g,np.array([np.sum(g)],dtype=np.float32)]

def evaluate(data,params):
    x,mask,targets,chosen=data
    if len(x)==0:raise ValueError('Empty evaluation split')
    n,k,d=x.shape;logits,_=forward(x.reshape(n*k,d),params)
    p=distribution(logits.reshape(n,k),mask)
    pred=np.argmax(p,axis=1);correct=targets[np.arange(n),pred]
    meaningful=np.sum(mask,axis=1)>np.sum(targets,axis=1)
    mass=np.maximum(np.sum(p*targets,axis=1),1e-12)
    return {'decisions':n,'loss':float(np.mean(-np.log(mass))),'exactTop1':float(np.mean(pred==chosen)),'equivalentTop1':float(np.mean(correct)),'nonforcedDecisions':int(np.sum(meaningful)),'nonforcedEquivalentTop1':float(np.mean(correct[meaningful])) if np.any(meaningful) else None}

def load(path):
    rows={p:[] for p in ['train','validation','test']};ids={p:set() for p in rows}
    digest=hashlib.sha256();seen=set();dim=None
    for line in open(path):
        digest.update(line.encode());r=json.loads(line)
        if r['featureVersion']!='shashbesh-compact-v1':raise ValueError('Unsupported features')
        key=(r['gameId'],r['decisionId'])
        if key in seen:raise ValueError('Duplicate decision')
        seen.add(key);split=r['split'];ids[split].add(r['gameId'])
        x=np.asarray(r['candidates'],dtype=np.float32)
        if x.ndim!=2 or len(x)==0 or not np.isfinite(x).all():raise ValueError('Invalid candidate features')
        dim=dim or x.shape[1]
        if x.shape[1]!=dim:raise ValueError('Feature dimension mismatch')
        if r['reward'] not in [-1,1]:raise ValueError('Missing completed outcome')
        if not r['targetIndices'] or any(i<0 or i>=len(x) for i in r['targetIndices']) or r['chosenIndex'] not in r['targetIndices']:raise ValueError('Invalid mask label')
        rows[split].append((x,r['targetIndices'],r['chosenIndex']))
    if any(ids[a]&ids[b] for a,b in [('train','validation'),('train','test'),('validation','test')]):raise ValueError('Games overlap between splits')
    result={}
    for split,examples in rows.items():
        if not examples:raise ValueError('Empty split')
        n=len(examples);k=max(len(e[0]) for e in examples)
        x=np.zeros((n,k,dim),dtype=np.float32);mask=np.zeros((n,k),dtype=bool);target=np.zeros((n,k),dtype=np.float32);chosen=np.zeros(n,dtype=int)
        for i,(values,indices,label) in enumerate(examples):x[i,:len(values)]=values;mask[i,:len(values)]=True;target[i,indices]=1;chosen[i]=label
        result[split]=(x,mask,target,chosen)
    return result,ids,digest.hexdigest()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--data',default='artifacts/ai-v01/data');ap.add_argument('--output',default='artifacts/ai-v01/candidate.json');ap.add_argument('--hidden',type=int,default=24);ap.add_argument('--epochs',type=int,default=12);ap.add_argument('--batch',type=int,default=64);ap.add_argument('--learning-rate',type=float,default=.002);ap.add_argument('--seed',type=int,default=20261009);ap.add_argument('--max-seconds',type=float,default=120);ap.add_argument('--max-ram-mib',type=float,default=512)
    ap.add_argument('--model-version',default='ShashBesh AI v0.1');ap.add_argument('--overwrite',action='store_true')
    args=ap.parse_args()
    if Path(args.output).exists() and not args.overwrite:raise ValueError('Checkpoint exists; use a new version/path or explicit --overwrite')
    if not 1<=args.epochs<=30 or not 1<=args.hidden<=64 or not 1<=args.batch<=256 or args.max_seconds<=0:raise ValueError('Invalid bounded training budget')
    manifest=json.load(open(Path(args.data)/'manifest.json'))
    data,game_ids,data_hash=load(Path(args.data)/'compact.jsonl')
    if data_hash!=manifest['datasetHash']:raise ValueError('Corpus checksum mismatch')
    rng=np.random.default_rng(args.seed);d=data['train'][0].shape[-1];h=args.hidden
    params=[(rng.normal(size=(d,h))/np.sqrt(d)).astype(np.float32),np.zeros(h,dtype=np.float32),(rng.normal(size=h)/np.sqrt(h)).astype(np.float32),np.zeros(1,dtype=np.float32)]
    m=[np.zeros_like(p) for p in params];v=[np.zeros_like(p) for p in params]
    initial={p:evaluate(data[p],params) for p in ['train','validation']}
    start=time.perf_counter();usage=resource.getrusage(resource.RUSAGE_SELF);cpu_start=usage.ru_utime+usage.ru_stime
    best=[p.copy() for p in params];best_loss=initial['validation']['loss'];history=[];steps=0;stop='epoch_limit'
    for epoch in range(args.epochs):
        if time.perf_counter()-start>=args.max_seconds:stop='time_budget';break
        if resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024>args.max_ram_mib:stop='ram_budget';break
        x,mask,target,chosen=data['train'];order=rng.permutation(len(x));losses=[]
        for offset in range(0,len(x),args.batch):
            if time.perf_counter()-start>=args.max_seconds:stop='time_budget';break
            indices=order[offset:offset+args.batch];loss,grads=loss_grad(x[indices],mask[indices],target[indices],params,1e-4);losses.append(loss);steps+=1
            for i,g in enumerate(grads):
                np.clip(g,-5,5,out=g);m[i]=.9*m[i]+.1*g;v[i]=.999*v[i]+.001*g*g
                params[i]-=args.learning_rate*(m[i]/(1-.9**steps))/(np.sqrt(v[i]/(1-.999**steps))+1e-8)
        val=evaluate(data['validation'],params);history.append({'epoch':epoch+1,'trainingBatchLoss':float(np.mean(losses)) if losses else None,'validation':val});print(json.dumps(history[-1]),flush=True)
        if val['loss']<best_loss:best_loss=val['loss'];best=[p.copy() for p in params]
        if stop=='time_budget':break
    elapsed=time.perf_counter()-start;usage=resource.getrusage(resource.RUSAGE_SELF);cpu=usage.ru_utime+usage.ru_stime-cpu_start
    if steps==0:raise ValueError('Budget insufficient for any learning step')
    params=best
    # Test is evaluated once after selection by validation loss, never used to choose epochs or architecture.
    final={p:evaluate(data[p],params) for p in ['train','validation','test']}
    def rounded(a):return [round(float(v),9) for v in a.ravel()]
    weights={'w1':rounded(params[0]),'b1':rounded(params[1]),'w2':rounded(params[2]),'b2':round(float(params[3][0]),9)}
    config=vars(args).copy()
    model={'schemaVersion':'shashbesh-model-v1','modelVersion':args.model_version,'status':'trained','rulesVersion':'v1','rulePolicyHash':manifest['rulePolicyHash'],'geometryHash':manifest['geometryHash'],'featureVersion':'shashbesh-compact-v1','architecture':{'kind':'mlp-tanh-v1','inputDim':d,'hiddenDim':h},'weights':weights,'training':{'seed':args.seed,'config':config,'datasetHash':data_hash,'metrics':{'initial':initial,'final':final,'history':history,'stopReason':stop,'epochsCompleted':len(history),'optimizerSteps':steps,'wallSeconds':elapsed,'cpuSeconds':cpu,'cpuPercentOneCore':cpu/elapsed*100,'peakRssMiB':usage.ru_maxrss/1024,'games':{p:len(ids) for p,ids in game_ids.items()},'numpyVersion':np.__version__,'pythonVersion':platform.python_version()}}}
    Path(args.output).parent.mkdir(parents=True,exist_ok=True);Path(args.output).write_text(json.dumps(model,separators=(',',':'))+'\n')
    report=Path(args.data).parent/'training-metrics.json';report.write_text(json.dumps(model['training'],indent=2))
    # Cross-runtime oracle uses exported, rounded parameters.
    exported=[np.array(weights['w1']).reshape(d,h),np.array(weights['b1']),np.array(weights['w2']),np.array([weights['b2']])]
    sample=data['test'][0][0][data['test'][1][0]][:3];scores,_=forward(sample,exported)
    (Path(args.data).parent/'inference-oracle.json').write_text(json.dumps({'vectors':sample.tolist(),'scores':scores.tolist()}))
    print(json.dumps({'output':args.output,'final':final,'wallSeconds':elapsed,'cpuSeconds':cpu,'peakRssMiB':usage.ru_maxrss/1024,'stop':stop}),flush=True)
if __name__=='__main__':main()
