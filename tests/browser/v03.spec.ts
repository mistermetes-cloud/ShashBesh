import { openTechnical } from './support';
import { test, expect } from '@playwright/test';
test('v0.3 persistent dice, human undo, immutable history, touch orientation and reload', async ({ page }) => {
    await page.goto('/');
    await openTechnical(page);
    await expect(page.getByText('Восстановление партии…')).not.toBeVisible();
    await page.getByLabel('Seed (необязательно)').fill('v03-browser');
    for (const p of [1, 2, 3, 4])
        await page.getByLabel(`Игрок P${p}`, { exact: true }).selectOption('human');
    await page.getByRole('button', { name: 'Начать новую партию', exact: true }).click();
    for (let i = 0; i < 10 && await page.getByRole('button', { name: 'Бросить жребий', exact: true }).isVisible(); i++)
        await page.getByRole('button', { name: 'Бросить жребий', exact: true }).click();
    for (let i = 0; i < 20; i++) {
        await page.getByRole('button', { name: 'Бросить кубики', exact: true }).click();
        if (await page.locator('.move-list button').count())
            break;
        const values = await page.locator('.dice span').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-value')));
        await page.getByRole('button', { name: 'Завершить бросок', exact: true }).click();
        expect(await page.locator('.dice span').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-value')))).toEqual(values);
    }
    const before = await page.locator('.piece').count(), dice = await page.locator('.dice span').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-value')));
    await page.locator('.move-list button').first().click();
    await expect(page.getByRole('button', { name: 'Отменить ход', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Отменить ход', exact: true }).click();
    await expect(page.locator('.piece')).toHaveCount(before);
    expect(await page.locator('.dice span').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-value')))).toEqual(dice);
    await page.getByRole('button', { name: 'История', exact: true }).click();
    await expect(page.locator('.action-history')).toBeVisible();
    await expect(page.locator('.history-to')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Бросить кубики', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Вернуться к игре', exact: true }).click();
    await expect(page.locator('.piece')).toHaveCount(before);
    await page.waitForTimeout(300);
    await page.reload();
    await openTechnical(page);
    await expect(page.getByText('Восстановление партии…')).not.toBeVisible();
    expect(await page.locator('.dice span').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-value')))).toEqual(dice);
    await expect(page.locator('.piece')).toHaveCount(before);
    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(size);
        await expect(page.locator('[data-cell]')).toHaveCount(64);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
});
