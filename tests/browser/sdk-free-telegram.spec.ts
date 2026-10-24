// SPDX-License-Identifier: GPL-3.0-only
import {test,expect} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
let server:Server,base:string;
test.beforeAll(async()=>{const dist=resolve('apps/web/dist');server=createServer((req,res)=>{let p=resolve(dist,'.'+new URL(req.url!,'http://local').pathname);if((p===dist||p.startsWith(dist+'/'))&&existsSync(p)&&statSync(p).isDirectory())p=resolve(p,'index.html');if(!p.startsWith(dist+'/')||!existsSync(p)){res.writeHead(404);return res.end();}res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.gz':'application/gzip'} as Record<string,string>)[extname(p)]||'text/plain');res.end(readFileSync(p));});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${(server.address() as any).port}`;});
test.afterAll(async()=>{await new Promise<void>(r=>server.close(()=>r()));});
async function start(page:any){await expect(page.locator('.start-playing')).toBeVisible();await page.getByRole('button',{name:'Against computer',exact:true}).click();await page.locator('.start-playing').click();await expect(page.locator('.physical-board .piece')).toHaveCount(10);await expect(page.locator('.table-die')).toHaveCount(2);await page.locator('.table-dice').click();await expect(page.locator('.physical-board')).toBeVisible();}
for(const route of ['/','/telegram/'])test(`SDK-free ${route}: same local game, no external services or socket`,async({page})=>{
 const requests:string[]=[],api:string[]=[],sockets:string[]=[],errors:string[]=[];page.on('request',r=>{const u=new URL(r.url());if(u.origin!==new URL(base).origin)requests.push(u.href);if(u.pathname.startsWith('/api/'))api.push(u.href);});page.on('websocket',s=>sockets.push(s.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{(window as any).__socketAttempts=0;window.WebSocket=class{constructor(){(window as any).__socketAttempts++;throw Error('transport forbidden');}} as any;Object.defineProperty(window,'Telegram',{configurable:true,get(){throw Error('Telegram API must not be inspected');}});});
 await page.goto(base+route);await expect(page.locator('.home-screen')).not.toContainText(/Wi-Fi|room/i);await start(page);await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.getByRole('link',{name:'Source code and licenses',exact:true})).toHaveAttribute('href','/shashbesh-source.tar.gz');
 for(const locale of ['en','ru','es','pt-BR','de','uk','fr','tr','uz-Latn']){await page.locator('.language-selector select').selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
 expect(requests).toEqual([]);expect(api).toEqual([]);expect(sockets).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__socketAttempts)).toBe(0);
});
test('SDK-free /telegram/ offers local 2, 3 and 4 player games',async({page})=>{
 const sockets:string[]=[];page.on('websocket',s=>sockets.push(s.url()));await page.addInitScript(()=>{(window as any).__socketAttempts=0;window.WebSocket=class{constructor(){(window as any).__socketAttempts++;throw Error('transport forbidden');}} as any;Object.defineProperty(window,'Telegram',{configurable:true,get(){throw Error('Telegram API must not be inspected');}});});
 for(const count of [2,3,4]){await page.goto(base+'/telegram/');await page.getByRole('button',{name:'With a person',exact:true}).click();await page.getByRole('button',{name:`${count} players`,exact:true}).click();await page.locator('.start-playing').click();await expect(page.locator('.physical-board .piece')).toHaveCount(count*5);await expect(page.locator('.table-die')).toHaveCount(2);await page.locator('.table-dice').click();await expect(page.locator('.physical-board')).toBeVisible();expect(await page.evaluate(()=>(window as any).__socketAttempts)).toBe(0);}
 expect(sockets).toEqual([]);
});
