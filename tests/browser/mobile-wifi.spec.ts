import {test,expect,type Page} from '@playwright/test';
import {startLanServer} from '../../packages/lan/src/server';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
test('Mobile Wi-Fi: create, find by fallback address, join, authoritative dice and reconnect',async({browser})=>{
    const directory=mkdtempSync(join(tmpdir(),'shashbesh-mobile-wifi-')),server=await startLanServer({port:0,host:'127.0.0.1',discovery:false,directory});
    const c1=await browser.newContext({viewport:{width:360,height:800}}),c2=await browser.newContext({viewport:{width:393,height:873}}),p1=await c1.newPage(),p2=await c2.newPage();
    try{
        for(const page of [p1,p2]){
            await page.goto('/');await page.getByRole('button',{name:'По Wi-Fi',exact:true}).click();
            await expect(page.getByRole('button',{name:'С компьютером',exact:true})).toBeDisabled();
            await page.getByRole('button',{name:'Играть по Wi-Fi',exact:true}).click();
            expect(await page.locator('body').innerText()).not.toMatch(/WebSocket|\/api|127\.0\.0\.1/);
            await page.locator('.wifi-advanced summary').click();await page.getByLabel('Адрес устройства',{exact:true}).fill(`http://127.0.0.1:${server.port}`);
            await page.locator('.wifi-advanced summary').click();
        }
        await expect(p1.getByRole('button',{name:'Создать игру',exact:true})).toBeEnabled();await p1.getByRole('button',{name:'Создать игру',exact:true}).click();
        await expect(p1.getByText('Вы — оранжевый',{exact:true})).toBeVisible();
        await p2.getByRole('button',{name:'Найти игру',exact:true}).click();await p2.getByRole('button',{name:'Присоединиться',exact:true}).click();
        await expect(p2.getByText('Вы — зелёный',{exact:true})).toBeVisible();
        await expect(p1.getByRole('button',{name:'Начать игру',exact:true})).toBeEnabled();await p1.getByRole('button',{name:'Начать игру',exact:true}).click();
        await expect(p1.locator('.physical-board')).toBeVisible();await expect(p2.locator('.physical-board')).toBeVisible();
        while(await p1.getByRole('button',{name:'Бросить жребий',exact:true}).count()){
            await expect(p1.getByRole('button',{name:'Бросить жребий',exact:true})).toBeEnabled();await p1.getByRole('button',{name:'Бросить жребий',exact:true}).click();
            await expect(p1.getByText('Подтверждаем ход…',{exact:true})).not.toBeVisible();
        }
        const active=await p1.locator('.physical-board').getAttribute('data-active-player'),actor=active==='1'?p1:p2,other=active==='1'?p2:p1;
        await expect(other.getByRole('button',{name:'Бросить кубики',exact:true})).toBeDisabled();await actor.getByRole('button',{name:'Бросить кубики',exact:true}).click();
        const values=(page:Page)=>page.locator('.table-die').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-value')));
        await expect.poll(()=>values(actor)).not.toEqual(['','']);await expect.poll(()=>values(other)).toEqual(await values(actor));
        await other.reload();await expect(other.locator('.physical-board')).toBeVisible();await expect.poll(()=>values(other)).toEqual(await values(actor));
        await expect(other.locator('.physical-board .piece')).toHaveCount(10);
    }finally{await c1.close();await c2.close();await server.close();rmSync(directory,{recursive:true,force:true});}
});
