import { describe, expect, it } from 'vitest';
import { sortByUsage } from './usage';

describe('sortByUsage', () => {
  it('puts the most used first and breaks ties by name', () => {
    const items = [
      { id: '1', name: 'Ropa' },
      { id: '2', name: 'Alimentos' },
      { id: '3', name: 'Alcohol' },
      { id: '4', name: 'Unused' },
    ];
    const usage = new Map([['1', 10], ['2', 835], ['3', 10]]);
    expect(sortByUsage(items, usage).map((i) => i.name)).toEqual(['Alimentos', 'Alcohol', 'Ropa', 'Unused']);
  });

  it('does not mutate its input', () => {
    const items = [{ id: '1', name: 'b' }, { id: '2', name: 'a' }];
    sortByUsage(items, new Map());
    expect(items[0]?.name).toBe('b');
  });
});
