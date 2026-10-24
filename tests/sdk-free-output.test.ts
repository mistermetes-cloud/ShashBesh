// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const dist='apps/web/dist';
const walk=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
test('SDK-free output has both routes, one shared game payload, and no Telegram SDK',()=>{
 const files=walk(dist),js=files.filter(p=>p.endsWith('.js')),bundle=js.map(p=>readFileSync(p,'utf8')).join('\n');
 const root=readFileSync(join(dist,'index.html'),'utf8'),telegram=readFileSync(join(dist,'telegram/index.html'),'utf8');
 assert.match(root,/type="module"/);assert.match(telegram,/type="module"/);assert.match(telegram,/src="\/assets\/[^" ]+\.js"/);
 assert.equal(js.filter(p=>readFileSync(p,'utf8').includes('Публичная тестовая версия')).length,1);
 for(const marker of ['telegram.org/js/telegram-web-app.js','Telegram.WebApp','initDataUnsafe','api.telegram.org/bot','new WebSocket','/api/rooms','shashbesh-lan-session'])assert(!bundle.includes(marker),marker);
 assert(!files.some(p=>/telegram-web-app\.js/i.test(p)));
 for(const p of [/\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bAKIA[0-9A-Z]{16}\b/])assert(!p.test(bundle));
});
test('SDK-free matching source archive contains exact allowlist and hashes, no TG01 SDK loader',()=>{
 const m=JSON.parse(readFileSync('SOURCE_FILES.json','utf8')) as {profile:string;files:{path:string;sha256:string}[]};assert.match(m.profile,/SDK-free/);
 for(const row of m.files)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
 assert(m.files.some(r=>r.path==='apps/web/telegram/index.html'));
 for(const forbidden of ['apps/web/src/platform/telegramSdk.ts','apps/web/src/telegram-entry.ts','docs/TELEGRAM_INTEGRATION_PLAN.md','docs/TELEGRAM_IMPLEMENTATION_STATUS.md'])assert(!m.files.some(r=>r.path===forbidden),forbidden);
 const archive=readFileSync('apps/web/public/shashbesh-source.tar.gz');assert.equal(hash(archive),readFileSync('apps/web/public/shashbesh-source.tar.gz.sha256','utf8').split(/\s/)[0]);assert.deepEqual(archive,readFileSync(join(dist,'shashbesh-source.tar.gz')));
 assert(!m.files.some(r=>r.path==='apps/web/src/platform/telegramSdk.ts'||r.path==='apps/web/src/telegram-entry.ts'));
});
test('public legal notices are intact in built output',()=>{
 for(const [source,out]of [['LICENSE','LICENSE.txt'],['LICENSES/CC-BY-4.0.txt','LICENSES/CC-BY-4.0.txt'],['ATTRIBUTION.md','ATTRIBUTION.md'],['LICENSE_SCOPE.md','LICENSE_SCOPE.md'],['SOURCE_DISTRIBUTION.md','SOURCE_DISTRIBUTION.md']])assert.deepEqual(readFileSync(source),readFileSync(join(dist,out)));
});
