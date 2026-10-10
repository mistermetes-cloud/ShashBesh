import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGeometry } from '../packages/engine/src/geometry';
export const geometry = parseGeometry(readFileSync(new URL('../data/igra_64_koordinaty.csv', import.meta.url), 'utf8'));
test('T01/T02: CSV BOM, 48+16 unique cells and shared home entries', () => {
    assert.equal(geometry.cells.length, 64);
    assert.equal(new Set(geometry.cells.map(c => `${c.x},${c.y}`)).size, 64);
    assert.deepEqual(Object.values(geometry.starts), [1, 13, 25, 37]);
    for (const home of Object.values(geometry.homes))
        assert.equal(home.length, 5);
});
test('T03: rotational symmetry from CSV', () => {
    for (const c of geometry.cells)
        assert.ok(geometry.cells.some(d => d.x === 14 - c.y && d.y === c.x));
    for (let n = 1; n <= 48; n++) {
        const c = geometry.cells.find(c => c.outer === n)!;
        const d = geometry.cells.find(c => c.outer === (n + 11) % 48 + 1)!;
        assert.deepEqual([d.x, d.y], [14 - c.y, c.x]);
    }
});
test('Invalid geometry rejected', () => assert.throws(() => parseGeometry('ID,Номер внешней,Тип,Шаг дома,X,Y,Примечание\n')));
