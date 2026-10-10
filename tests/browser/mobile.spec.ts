import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {openTechnical} from './support';
const screenshots='artifacts/mobile/screenshots';
async function setup(page:Page){
    await page.goto('/');await openTechnical(page);
    await expect(page.getByText('Восстановление партии…')).not.toBeVisible();
    await page.getByLabel('Seed (необязательно)').fill('mobile-v031');
    await page.getByRole('button',{name:'Вернуться к полю',exact:true}).click();
    await page.getByRole('button',{name:'Шашбеш',exact:true}).click();
    await page.getByRole('button',{name:'С человеком',exact:true}).click();
    await page.getByRole('button',{name:'4 игрока',exact:true}).click();
    await page.getByRole('button',{name:'Начать игру',exact:true}).click();
    while(await page.getByRole('button',{name:'Бросить жребий',exact:true}).count())await page.getByRole('button',{name:'Бросить жребий',exact:true}).click();
}
const pieces=(page:Page)=>page.locator('.physical-board [data-piece]').evaluateAll(nodes=>nodes.map(n=>({piece:n.getAttribute('data-piece'),cell:n.getAttribute('data-cell')})).sort((a,b)=>a.piece!.localeCompare(b.piece!)));
test('Mobile physical table: dice, selected-piece legal destinations, undo, history, saved games and screenshots',async({browser})=>{
    test.setTimeout(180000);mkdirSync(screenshots,{recursive:true});
    const context=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:3,hasTouch:true}),page=await context.newPage();
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    try{
        await page.goto('/');await expect(page.getByRole('button',{name:'Начать игру',exact:true})).toBeVisible();
        expect(await page.locator('body').innerText()).not.toMatch(/Tactical|Тактический|AI v0\.1|WebSocket|Seed|сервер|протокол/);
        await page.screenshot({path:`${screenshots}/home-portrait.png`});
        await setup(page);
        await expect(page.locator('.physical-board [data-cell]')).toHaveCount(64);
        for(const p of [1,2,3,4]){await expect(page.locator(`.physical-board .piece.p${p}`)).toHaveCount(5);await expect(page.locator(`.cell[data-home-owner="${p}"]`)).toHaveCount(5);}
        expect(await page.locator('.table-die').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-value')))).toEqual(['','']);
        for(let i=0;i<20;i++){
            await page.getByRole('button',{name:'Бросить кубики',exact:true}).click();
            if(await page.locator('.physical-board .selectable-piece').count())break;
            const dice=await page.locator('.table-die').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-value')));
            await page.getByRole('button',{name:'Завершить бросок',exact:true}).click();
            expect(await page.locator('.table-die').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-value')))).toEqual(dice);
        }
        const before=await pieces(page),dice=await page.locator('.table-die').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-value')));
        await expect(page.locator('.cell.target')).toHaveCount(0);
        await page.locator('.physical-board .selectable-piece').first().tap();
        await expect(page.locator('.cell.target').first()).toBeVisible();
        await page.locator('.cell.target').first().tap();
        await expect(page.getByRole('button',{name:'Отменить ход',exact:true})).toBeEnabled();
        await page.getByRole('button',{name:'Отменить ход',exact:true}).tap();
        await expect.poll(()=>pieces(page)).toEqual(before);expect(await page.locator('.table-die').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-value')))).toEqual(dice);
        await page.getByRole('button',{name:'Меню',exact:true}).click();await page.getByRole('button',{name:'История',exact:true}).click();
        await expect(page.locator('.history-to')).toHaveCount(1);await page.getByRole('button',{name:'Показать до',exact:true}).click();
        await expect.poll(()=>pieces(page)).toEqual(before);await page.getByRole('button',{name:'К игре',exact:true}).click();await expect.poll(()=>pieces(page)).toEqual(before);
        // Play a real legal position for visual review, without editing game state.
        for(let i=0;i<45;i++){
            const choices=page.locator('.physical-board .selectable-piece');
            if(await choices.count()){await choices.first().tap();await page.locator('.cell.target').first().tap();}
            else if(await page.getByRole('button',{name:'Завершить бросок',exact:true}).count())await page.getByRole('button',{name:'Завершить бросок',exact:true}).tap();
            else if(await page.getByRole('button',{name:'Бросить кубики',exact:true}).isEnabled())await page.getByRole('button',{name:'Бросить кубики',exact:true}).tap();
        }
        if(await page.locator('.physical-board .selectable-piece').count())await page.locator('.physical-board .selectable-piece').first().tap();
        const measurements=[];
        for(const [name,size] of [['huawei-portrait',{width:360,height:800}],['huawei-landscape',{width:800,height:360}],['realme-portrait',{width:393,height:873}],['realme-landscape',{width:873,height:393}]] as const){
            await page.setViewportSize(size);await expect(page.locator('[data-cell]')).toHaveCount(64);
            expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
            const result=await page.evaluate(()=>{
                const board=document.querySelector('.physical-board')!.getBoundingClientRect(),dice=document.querySelector('.table-dice')!.getBoundingClientRect();
                const overlaps=[...document.querySelectorAll('[data-cell]')].filter(cell=>{const r=cell.getBoundingClientRect();return Math.min(r.right,dice.right)>Math.max(r.left,dice.left)&&Math.min(r.bottom,dice.bottom)>Math.max(r.top,dice.top);});
                return{boardWidth:board.width,boardHeight:board.height,overlaps:overlaps.length,viewport:[innerWidth,innerHeight],pageHeight:document.documentElement.scrollHeight};
            });
            expect(result.overlaps).toBe(0);expect(Math.abs(result.boardWidth-result.boardHeight)).toBeLessThan(1);
            expect(result.boardWidth).toBeGreaterThan(Math.min(size.width,size.height)*.9);
            expect(result.pageHeight).toBeLessThanOrEqual(size.height+1);
            measurements.push({name,...result});await page.screenshot({path:`${screenshots}/${name}.png`});
        }
        writeFileSync('artifacts/mobile/viewport-checks.json',JSON.stringify(measurements,null,2));
        await page.setViewportSize({width:360,height:800});await page.addStyleTag({content:':root{--safe-top:24px;--safe-bottom:24px;--safe-left:8px;--safe-right:8px}'});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
        await page.screenshot({path:`${screenshots}/safe-areas.png`});
        await openTechnical(page);
        const exported=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт журнала',exact:true}).click();await(await exported).saveAs('artifacts/mobile/visual-game.jsonl');
        await page.getByRole('button',{name:'Вернуться к полю',exact:true}).click();
        await page.getByRole('button',{name:'Меню',exact:true}).click();await page.getByRole('button',{name:'Новая игра',exact:true}).click();
        await page.getByRole('button',{name:'С человеком',exact:true}).click();await page.getByRole('button',{name:'Начать игру',exact:true}).click();
        await page.getByRole('button',{name:'Меню',exact:true}).click();await page.getByRole('button',{name:'Сохранённые партии',exact:true}).click();
        await expect(page.locator('.saved-games button')).toHaveCount(1);await page.locator('.saved-games button').first().click();
        await expect(page.locator('.physical-board .piece')).toHaveCount(20);expect(errors).toEqual([]);
    }finally{await context.close();}
});
