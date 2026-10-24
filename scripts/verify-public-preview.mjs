import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {containsExcludedWeights} from './model-exclusion.mjs';

const root='apps/web/dist';
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]);}
const output=files(root),javascript=output.filter(path=>path.endsWith('.js')).map(path=>readFileSync(path,'utf8')).join('\n');
assert(output.some(path=>path===join(root,'index.html')),'missing static root entry');
assert(output.some(path=>path===join(root,'telegram','index.html')),'missing SDK-free Telegram entry');
assert(output.some(path=>path===join(root,'THIRD_PARTY_NOTICES.txt')),'missing runtime third-party notices');
assert(javascript.includes('Публичная тестовая версия'),'missing public-preview disclosure');
assert(javascript.includes('Нейросетевые веса исключены'),'missing neural-weight disclosure');
assert(javascript.includes('Neural weights are not included in this licensing-review preview.'),'neural selector was not replaced with the preview guard');

assert(!containsExcludedWeights(javascript),'original neural weights were included in the public preview bundle');
assert(!output.some(path=>/\.(apk|aab|onnx|tflite|pt|pth|safetensors|jsonl)$/i.test(path)),'private or non-web artifacts found in the public output');

const notices=readFileSync(join(root,'THIRD_PARTY_NOTICES.txt'),'utf8');
for(const name of ['react','react-dom','scheduler','@noble/hashes']){
 const license=readFileSync(join('node_modules',name,'LICENSE'),'utf8').trim();
 assert(notices.includes(license),`missing exact ${name} license text from runtime notices`);
}
console.log(JSON.stringify({status:'PASS',files:output.map(path=>path.slice(root.length+1)),javascriptBytes:Buffer.byteLength(javascript),modelFingerprintAbsent:true,runtimeLicenses:4},null,2));

for(const marker of ['new WebSocket','/api/rooms','shashbesh-lan-session','127.0.0.1','localhost']) assert(!javascript.includes(marker),`production network marker: ${marker}`);
assert(!javascript.includes('telegram.org/js/telegram-web-app.js'),'Telegram SDK must not be bundled in the SDK-free preview');
assert(!javascript.includes('Telegram.WebApp'),'Telegram WebApp API must not be referenced by the SDK-free preview');
