// SPDX-License-Identifier: GPL-3.0-only
import {test,expect} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
let server:Server|undefined,base=process.env.RELEASE_PREVIEW_URL||'';
test.beforeAll(async()=>{if(base)return;const dist=resolve('apps/web/dist');server=createServer((req,res)=>{let path=resolve(dist,'.'+new URL(req.url!,'http://local').pathname);if(!path.startsWith(dist+'/')||!existsSync(path)||!extname(path))path=resolve(dist,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.gz':'application/gzip'} as Record<string,string>)[extname(path)]||'text/plain');res.end(readFileSync(path));});await new Promise<void>(r=>server!.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${(server.address() as any).port}`;});
test.afterAll(async()=>{await new Promise<void>(r=>server?server.close(()=>r()):r());});
function hash(data:Buffer){return createHash('sha256').update(data).digest('hex');}
test('source link: nine localized labels, keyboard and mobile download with exact archive manifest',async({page})=>{
 const sockets:string[]=[];page.on('websocket',s=>sockets.push(s.url()));await page.goto(base);
 for(const locale of ['ru','en','de','es','pt-BR','fr','uk','tr','uz-Latn']){
  await page.locator('.language-selector select').selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);
  const label=JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`,'utf8'))['ui.source.and.licenses'];const link=page.getByRole('link',{name:label,exact:true});await expect(link).toBeVisible();await expect(link).toHaveAttribute('href','/shashbesh-source.tar.gz');
 }
 await page.locator('.language-selector select').selectOption('en');const link=page.getByRole('link',{name:'Source code and licenses',exact:true});
 await link.focus();await expect(link).toBeFocused();const keyboard=page.waitForEvent('download');await page.keyboard.press('Enter');const downloaded=await keyboard;const file=await downloaded.path();expect(file).toBeTruthy();
 const data=readFileSync(file!);expect(hash(data)).toBe(hash(readFileSync('apps/web/public/shashbesh-source.tar.gz')));
 execFileSync('python3',['-c',`import tarfile,json,hashlib,sys
with tarfile.open(sys.argv[1]) as t:
 rows=t.getmembers()
 assert all(x.isfile() and x.name.startswith('ShashBesh-source/') and '..' not in x.name.split('/') for x in rows)
 m=json.load(t.extractfile('ShashBesh-source/SOURCE_FILES.json'))
 assert set(x.name for x in rows)=={'ShashBesh-source/'+x['path'] for x in m['files']}|{'ShashBesh-source/SOURCE_FILES.json','ShashBesh-source/SOURCE_FILES.sha256'}
 for x in m['files']:assert hashlib.sha256(t.extractfile('ShashBesh-source/'+x['path']).read()).hexdigest()==x['sha256']
 assert m==json.load(open('SOURCE_FILES.json'))`,file!]);
 const response=await page.request.get(base+'/shashbesh-source.tar.gz');expect(response.status()).toBe(200);expect(hash(await response.body())).toBe(hash(data));
 const touch=page.waitForEvent('download');await link.tap();expect(await (await touch).failure()).toBeNull();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(sockets).toEqual([]);
});
test('mobile games retain Human/AI and local 2–4 with no online transport',async({page})=>{
 const sockets:string[]=[],api:string[]=[];page.on('websocket',s=>sockets.push(s.url()));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 await page.addInitScript(()=>{localStorage.setItem('shashbesh-lan-session',JSON.stringify({url:'http://127.0.0.1:9999',membership:{token:'synthetic-stale-token',room:{id:'old-room'},playerId:1}}));(window as any).__sockets=0;window.WebSocket=class{constructor(){(window as any).__sockets++;throw Error('unexpected transport');}} as any;});
 await page.goto(base);
 for(const mode of ['With a person','Against computer'])for(const count of [2,3,4]){
  await page.goto('about:blank');await page.goto(base+'/wifi?online=true#room=old-room');await page.locator('.language-selector select').selectOption('en');await expect(page.locator('.home-screen')).not.toContainText(/Wi-Fi|room/i);await page.getByRole('button',{name:mode,exact:true}).click();await page.getByRole('button',{name:`${count} players`,exact:true}).click();await page.locator('.start-playing').click();await expect(page.locator('.physical-board .piece')).toHaveCount(count*5);await expect(page.locator('.table-die')).toHaveCount(2);await page.locator('.table-dice').click();await expect(page.locator('.physical-board')).toBeVisible();
  await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.getByRole('link',{name:'Source code and licenses',exact:true})).toBeVisible();await expect(page.locator('.lan-panel')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__sockets)).toBe(0);
 }
 expect(api).toEqual([]);expect(sockets).toEqual([]);
});
