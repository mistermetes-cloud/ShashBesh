import type { Cell, Geometry, Player } from '../../shared/src/index';
export const trackId = (n: number) => `М${String(n).padStart(2, '0')}`;
export function parseGeometry(csv: string): Geometry {
    const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    if (lines.shift() !== 'ID,Номер внешней,Тип,Шаг дома,X,Y,Примечание')
        throw Error('Неверный заголовок CSV');
    const cells: Cell[] = [];
    const homes: Record<number, string[]> = {};
    const starts: Record<number, number> = {};
    const coordinates = new Map<string, Cell>();
    for (const line of lines) {
        const [id, outer, type, step, xs, ys] = line.split(',');
        const x = Number(xs), y = Number(ys);
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || x > 13 || y < 1 || y > 13)
            throw Error('Неверная координата');
        const key = `${x},${y}`;
        if (type === 'Маршрут') {
            if (coordinates.has(key))
                throw Error('Повтор координаты');
            const cell: Cell = { id, outer: Number(outer), x, y, owner: null, homeIndex: null };
            cells.push(cell);
            coordinates.set(key, cell);
        }
        else {
            const owner = Number(type.slice(4)) as Player, index = Number(step) - 1;
            if (![1, 2, 3, 4].includes(owner) || index < 0 || index > 4)
                throw Error('Неверный дом');
            homes[owner] ??= [];
            if (index === 0) {
                const shared = coordinates.get(key);
                if (!shared?.outer)
                    throw Error('Общий вход отсутствует');
                homes[owner][index] = shared.id;
                starts[owner] = shared.outer;
                shared.owner = owner;
                shared.homeIndex = 0;
            }
            else {
                if (coordinates.has(key))
                    throw Error('Повтор координаты');
                const cell: Cell = { id, outer: null, x, y, owner, homeIndex: index };
                cells.push(cell);
                coordinates.set(key, cell);
                homes[owner][index] = id;
            }
        }
    }
    if (cells.length !== 64 || new Set(cells.map(c => c.id)).size !== 64 || cells.filter(c => c.outer).map(c => c.outer).sort((a, b) => a! - b!).join(',') !== Array.from({ length: 48 }, (_, i) => i + 1).join(','))
        throw Error('Неверный маршрут');
    for (const p of [1, 2, 3, 4])
        if (homes[p]?.length !== 5 || starts[p] !== 1 + (p - 1) * 12)
            throw Error('Неверный вход');
    return { cells, homes, starts, corners: [7, 19, 31, 43] };
}
