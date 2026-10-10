import { openTechnical } from './support';
import { test, expect } from '@playwright/test';
import { startLanServer } from '../../packages/lan/src/server';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
test('LAN two browser devices see authoritative dice and rejoin the same seat after reload', async ({ browser }) => {
    const directory = mkdtempSync(join(tmpdir(), 'shashbesh-ui-lan-')), server = await startLanServer({ port: 0, host: '127.0.0.1', discovery: false, directory });
    const c1 = await browser.newContext(), c2 = await browser.newContext(), p1 = await c1.newPage(), p2 = await c2.newPage();
    try {
        for (const page of [p1, p2]) {
            await page.goto('/');
    await openTechnical(page);
            await expect(page.getByText('Восстановление партии…')).not.toBeVisible();
            await page.getByLabel('Адрес узла / IP').fill(`http://127.0.0.1:${server.port}`);
        }
        await p1.getByRole('button', { name: 'Создать комнату', exact: true }).click();
        await expect(p1.getByText(/вы P1/)).toBeVisible();
        await p2.getByRole('button', { name: 'Комнаты узла', exact: true }).click();
        await p2.getByRole('button', { name: 'Подключиться', exact: true }).click();
        await expect(p2.getByText(/вы P2/)).toBeVisible();
        await expect(p1.getByRole('button', { name: 'Начать LAN партию' })).toBeEnabled();
        await p1.getByRole('button', { name: 'Начать LAN партию' }).click();
        for (let i = 0; i < 12 && await p1.getByRole('button', { name: 'Бросить жребий', exact: true }).isVisible(); i++) {
            await expect(p1.getByRole('button', { name: 'Бросить жребий', exact: true })).toBeEnabled();
            await p1.getByRole('button', { name: 'Бросить жребий', exact: true }).click();
            await expect(p1.getByText(/ожидание узла/)).not.toBeVisible();
        }
        const active = await p1.locator('.player-panel').getAttribute('data-active-player'), actor = active === '1' ? p1 : p2, other = active === '1' ? p2 : p1;
        await expect(actor.getByRole('button', { name: 'Бросить кубики', exact: true })).toBeEnabled();
        await expect(other.getByRole('button', { name: 'Бросить кубики', exact: true })).toBeDisabled();
        await actor.getByRole('button', { name: 'Бросить кубики', exact: true }).click();
        await expect(actor.getByText(/ожидание узла/)).not.toBeVisible();
        const values = await actor.locator('.dice span').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-value')));
        await expect.poll(() => other.locator('.dice span').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-value')))).toEqual(values);
        await p2.reload();
        await openTechnical(p2);
        await expect(p2.getByText(/вы P2/)).toBeVisible();
        await expect(p2.getByText(/переподключение/)).not.toBeVisible();
        expect(await p2.locator('.dice span').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-value')))).toEqual(values);
    }
    finally {
        await c1.close();
        await c2.close();
        await server.close();
        rmSync(directory, { recursive: true, force: true });
    }
});
