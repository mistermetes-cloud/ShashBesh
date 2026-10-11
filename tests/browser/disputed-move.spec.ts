import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {engine} from '../helpers';
import {stateHash} from '../../packages/engine/src/index';

test('Disputed Move Report saves locally and exports a reproducible JSON snapshot',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Начать игру',exact:true}).click();await page.getByRole('button',{name:'Спорный ход',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Сообщить о спорном ходе'});await expect(dialog).toBeVisible();await dialog.getByLabel('Описание ожидаемого хода').fill('Игрок должен начать с углового прыжка.');await dialog.getByLabel('Пояснение').fill('Список действий, показанный на поле, расходует единицу до достижения угла.');
 const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Сохранить и экспортировать JSON'}).click();const file=await download,report=JSON.parse(readFileSync((await file.path())!,'utf8'));
 expect(file.suggestedFilename()).toMatch(/^disputed-move-.*\.json$/);expect(report.reportType).toBe('disputed_move');expect(report.gameId).toBe(report.gameState.gameId);expect(report.engineVersion).toBe('v1');expect(report.currentPlayer).toBe(report.gameState.activePlayer);expect(report.dice).toEqual([]);expect(report.remainingDice).toEqual([]);expect(report.legalActions).toEqual([]);expect(report.expectedMove).toContain('углового прыжка');expect(report.userExplanation).toContain('расходует единицу');expect(stateHash(engine.replay(report.gameState.eventLog))).toBe(stateHash(report.gameState));
 const stored=await page.evaluate(()=>new Promise<any[]>((resolve,reject)=>{const request=indexedDB.open('shashbesh-v03',3);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const tx=request.result.transaction('disputedReports'),get=tx.objectStore('disputedReports').getAll();tx.oncomplete=()=>resolve(get.result);tx.onerror=()=>reject(tx.error);};}));expect(stored).toHaveLength(1);expect(stored[0]).toEqual(report);
});
