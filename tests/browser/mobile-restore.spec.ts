import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {openTechnical} from './support';
import {engine} from '../helpers';

test('Mobile computer turns use Tactical, with advanced model choices preserved',async({page})=>{
    await page.goto('/');await openTechnical(page);
    await page.getByLabel('Seed (необязательно)').fill('mobile-computer');
    await page.getByRole('button',{name:'Вернуться к полю',exact:true}).click();await page.getByRole('button',{name:'Шашбеш',exact:true}).click();
    await page.getByRole('button',{name:'Начать игру',exact:true}).click();
    while(await page.getByRole('button',{name:'Бросить жребий',exact:true}).count())await page.getByRole('button',{name:'Бросить жребий',exact:true}).click();
    let seenComputer=false;
    for(let i=0;i<50;i++){
        if(await page.locator('.physical-board').getAttribute('data-active-player')==='2'){seenComputer=true;break;}
        const choices=page.locator('.physical-board .selectable-piece');
        if(await choices.count()){await choices.first().click();await page.locator('.cell.target').first().click();}
        else if(await page.getByRole('button',{name:'Завершить бросок',exact:true}).count())await page.getByRole('button',{name:'Завершить бросок',exact:true}).click();
        else await page.getByRole('button',{name:'Бросить кубики',exact:true}).click();
    }
    expect(seenComputer).toBe(true);await expect(page.locator('.physical-board')).toHaveAttribute('data-active-player','1',{timeout:20000});
    await openTechnical(page);
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт журнала',exact:true}).click();
    const events=readFileSync((await(await download).path())!,'utf8').trim().split('\n').map(line=>JSON.parse(line));
    expect(events.some(e=>e.decisionMaker?.kind==='agent'&&e.decisionMaker.id==='tactical')).toBe(true);
    expect(events.some(e=>e.decisionMaker?.id==='ai-v0.1')).toBe(false);
    await expect(page.getByLabel('Игрок P2',{exact:true})).toHaveValue('tactical');
    expect(await page.getByLabel('Игрок P2',{exact:true}).locator('option').allTextContents()).toContain('ShashBesh AI v0.1');
});
test('Mobile upgrades existing v0.3 IndexedDB saves without losing dice or pieces',async({page})=>{
    let state=engine.create([1,2],'prior-mobile-save',null);state=engine.initialRoll(state,{1:6,2:2});state=engine.roll(state,[6,3]);state=engine.applyAction(state,engine.legalActions(state)[0]);
    const save={version:'v0.3',events:state.eventLog,controllers:{1:'human',2:'tactical'},count:2,seed:'',speed:450};
    await page.route('**/seed-storage.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Storage fixture</body></html>'}));
    await page.goto('/seed-storage.html');
    await page.evaluate(value=>new Promise<void>((resolve,reject)=>{
        const request=indexedDB.open('shashbesh-v03',1);request.onupgradeneeded=()=>request.result.createObjectStore('saves');request.onerror=()=>reject(request.error);
        request.onsuccess=()=>{const d=request.result,tx=d.transaction('saves','readwrite');tx.objectStore('saves').put(value,'current');tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>reject(tx.error);};
    }),save);
    await page.goto('/');await page.getByRole('button',{name:'Продолжить партию',exact:true}).click();
    await expect(page.locator('.physical-board .piece')).toHaveCount(10);
    expect(await page.locator('.table-die').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-value')))).toEqual(['6','3']);
    await expect(page.locator(`[data-cell="${state.pieces.find(p=>p.position)!.position}"] .piece`)).toHaveCount(1);
    expect(await page.evaluate(()=>new Promise<number>((resolve,reject)=>{const r=indexedDB.open('shashbesh-v03');r.onsuccess=()=>{resolve(r.result.version);r.result.close();};r.onerror=()=>reject(r.error);}))).toBe(2);
});
