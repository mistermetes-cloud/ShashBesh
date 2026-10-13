import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const fixture='/@fs'+process.cwd()+'/tests/browser/fixtures/ai-animation.html';
async function open(page:Page,scenario:string){await page.goto(fixture+'?scenario='+scenario);await expect(page.getByRole('region',{name:'Режим наблюдения'})).toBeVisible();await page.clock.install({time:new Date('2026-10-11T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-11T12:01:00Z'));}
async function state(page:Page){return JSON.parse((await page.getByTestId('state').textContent())!);}
test('Disputed Move Report: М32 is highlighted and its five can be selected beside М07',async({page})=>{
 await open(page,'reported');
 for(const cell of ['М07','М32'])await expect(page.locator(`[data-cell="${cell}"]`)).toHaveClass(/selectable-piece/);
 await page.locator('[data-cell="М32"]').click();
 await expect(page.locator('[data-cell="М37"]')).toHaveClass(/target/);
 await page.locator('[data-cell="М37"]').click();
 const after=await state(page);
 expect(after.actions.at(-1)).toMatchObject({pieceId:'P1-5',kind:'move',value:5,from:'М32',to:'М37'});
 expect(after.remaining).toEqual([5,5,5]);
});
for(const dice of ['5-5','3-4','6-2','1-5','1-1'])test(`standing corner ${dice}: highlights, selection and AI follow unused-one priority`,async({page})=>{
 await open(page,`corner-${dice}`);
 const mandatory=dice.startsWith('1-'),other=page.locator('[data-cell="М20"]');
 await expect(page.locator('[data-cell="М43"]')).toHaveClass(/selectable-piece/);
 if(mandatory)await expect(other).not.toHaveClass(/selectable-piece/);
 else{
  await expect(other).toHaveClass(/selectable-piece/);await other.click();
  await expect(other).toHaveClass(/chosen-piece/);
  await expect(page.locator('.cell.target')).not.toHaveCount(0);
  await page.locator('.cell.target').first().click();
  expect((await state(page)).actions[0].pieceId).toBe('P1-2');
  await page.getByRole('button',{name:'Перезапустить партию',exact:true}).click();
 }
 const before=await state(page);
 await page.getByRole('button',{name:'Следующий ход',exact:true}).click();
 await page.clock.runFor(10000);
 const after=await state(page),action=after.actions[0];
 expect(before.legal).toContainEqual(action);
 expect(action.kind==='corner_jump').toBe(mandatory);
 if(mandatory)expect(action.value).toBe(1);
});
test('L: owner 1–3 screenshot, only corner-priority piece and die are selectable',async({page})=>{
 mkdirSync('artifacts/gameplay-priority-animation',{recursive:true});await open(page,'priority');await expect(page.locator('[data-cell="М40"]')).toHaveClass(/selectable-piece/);await expect(page.locator('[data-cell="М05"]')).not.toHaveClass(/selectable-piece/);const before=await state(page);expect(before.legal.map((a:any)=>[a.pieceId,a.value])).toEqual([['P1-1',3]]);await page.locator('[data-cell="М40"]').click();await expect(page.locator('.cell.target')).toHaveCount(1);await expect(page.locator('[data-cell="М43"]')).toHaveClass(/target/);await page.screenshot({path:'artifacts/gameplay-priority-animation/corner-priority-mask.png'});
 await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await expect(page.locator('.selected-die')).toHaveAttribute('data-value','3');await page.clock.runFor(700+3*250+500);await expect(page.locator('[data-animation-cell="М43"]')).toHaveCount(0);await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await expect(page.locator('.selected-die')).toHaveAttribute('data-value','1');await page.clock.runFor(700);await expect(page.locator('[data-animation-cell="М44"]')).toHaveAttribute('data-corner-jump','true');await expect(page.getByRole('status')).toContainText('обязательный прыжок');await page.screenshot({path:'artifacts/gameplay-priority-animation/corner-jump-frame.png'});
});
test('Passing an opponent: per-cell movement then visible corner jump, pause/speed/step, one commit',async({page})=>{
 await open(page,'pass');await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await expect(page.locator('.selected-die')).toHaveAttribute('data-value','2');await page.clock.runFor(700);await expect(page.locator('[data-animation-cell="М06"]')).toHaveCount(1);await expect(page.locator('[data-cell="М06"]')).toHaveAttribute('data-piece','P2-1');await expect(page.locator('.capture-victim')).toHaveCount(0);await page.screenshot({path:'artifacts/gameplay-priority-animation/pass-cell-6.png'});
 await page.getByRole('button',{name:'Пауза',exact:true}).click();await page.clock.runFor(2000);await expect(page.locator('[data-animation-cell="М06"]')).toHaveCount(1);await page.getByLabel('Скорость ИИ').selectOption('SLOW');await page.getByRole('button',{name:'Следующий ход',exact:true}).click();
 await page.clock.runFor(500);await expect(page.locator('[data-animation-cell="М07"]')).toHaveCount(1);await page.clock.runFor(1500);await expect(page.locator('[data-animation-piece]')).toHaveCount(0);let after=await state(page);expect(after.actions).toHaveLength(1);expect(after.pieces.find((p:any)=>p.id==='P2-1').position).toBe('М06');expect(after.pieces.find((p:any)=>p.id==='P1-4').position).toBe('М07');expect(after.remaining).toEqual([1]);
 await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await expect(page.locator('.selected-die')).toHaveAttribute('data-value','1');await page.clock.runFor(1400);for(let i=0;i<12;i++){if(i>0)await page.clock.runFor(500);const cell=`М${String(i+8).padStart(2,'0')}`;await expect(page.locator(`[data-animation-cell="${cell}"]`)).toHaveAttribute('data-corner-jump','true');}await expect(page.getByRole('status')).toContainText('обязательный прыжок');await page.clock.runFor(1000);expect((await state(page)).actions).toHaveLength(2);after=await state(page);expect(after.pieces.find((p:any)=>p.id==='P2-1').position).toBe('М06');expect(after.pieces.find((p:any)=>p.id==='P1-4').position).toBe('М19');expect(after.remaining).toEqual([]);
});
test('Capture without corner: victim fades at destination; reset cancels frames without duplicate commit',async({page})=>{
 await open(page,'capture');await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await expect(page.locator('.selected-die')).toHaveAttribute('data-value','1');await page.clock.runFor(700+250);await expect(page.locator('.capture-victim')).toHaveCount(1);await page.screenshot({path:'artifacts/gameplay-priority-animation/capture-cell-3.png'});await page.clock.runFor(600+500);expect((await state(page)).pieces.find((p:any)=>p.id==='P2-1').status).toBe('reserve');
 await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await page.getByRole('button',{name:'Перезапустить партию',exact:true}).click();await page.clock.runFor(10000);await expect(page.locator('[data-animation-piece]')).toHaveCount(0);expect((await state(page)).actions).toHaveLength(0);
});
test('Extra roll is displayed only after all four double actions and roll completion',async({page})=>{
 await open(page,'double');for(let i=0;i<4;i++){await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await page.clock.runFor(1700);expect((await state(page)).actions).toHaveLength(i+1);}await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await expect(page.locator('[data-animation-phase="extra"]')).toBeVisible();await expect(page.getByLabel('Право дополнительного броска')).toBeVisible();
});
test('Actual application: home observer launch, pause, single-step, three speeds, mobile layout',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Начать игру',exact:true})).toBeVisible();await page.clock.install({time:new Date('2026-10-11T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-11T12:01:00Z'));await page.getByRole('button',{name:'Наблюдать AI vs AI',exact:true}).click();await expect(page.getByRole('region',{name:'Режим наблюдения'})).toBeVisible();await page.getByRole('button',{name:'Пауза',exact:true}).click();await page.getByLabel('Скорость ИИ').selectOption('FAST');await page.getByRole('button',{name:'Перезапустить партию',exact:true}).click();await page.getByRole('button',{name:'Следующий ход',exact:true}).click();await expect(page.locator('[data-animation-phase="dice"]')).toBeVisible();await page.clock.runFor(200);await expect(page.getByRole('button',{name:'Продолжить',exact:true})).toBeVisible();
 for(const speed of ['NORMAL','SLOW','FAST'])await page.getByLabel('Скорость ИИ').selectOption(speed);
 for(const viewport of [{width:360,height:800},{width:800,height:360}]){await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);}
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.clock.runFor(1000);await page.getByRole('button',{name:'Пауза',exact:true}).click();await page.clock.runFor(1000);expect(errors).toEqual([]);
});
