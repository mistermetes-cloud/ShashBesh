import type {Page} from '@playwright/test';
export async function openTechnical(page:Page){
    await page.getByRole('button',{name:'Меню',exact:true}).click();
    await page.locator('.table-advanced summary').click();
    await page.getByRole('button',{name:'Технические возможности',exact:true}).click();
}
