import { describe, it, expect } from 'vitest';
import { buildConcatKey, applyKeyToDataset, validateKeyUniqueness, checkColumnUniqueness } from './keyDetection';

describe('keyDetection — buildConcatKey', () => {
  it('joins single column value', () => {
    const row = { id: 'TXN001', name: 'Alice' };
    expect(buildConcatKey(row, ['id'])).toBe('txn001');
  });

  it('joins multiple columns with | separator', () => {
    const row = { date: '2024-01-15', amount: '5000', vendor: 'ACME Corp' };
    expect(buildConcatKey(row, ['date', 'amount', 'vendor'])).toBe('2024-01-15|5000|acme corp');
  });

  it('normalises numbers to fixed-2 decimal', () => {
    const row = { amount: 150 };
    expect(buildConcatKey(row, ['amount'])).toBe('150.00');
  });

  it('trims whitespace and lowercases strings', () => {
    const row = { name: '  ALICE  ' };
    expect(buildConcatKey(row, ['name'])).toBe('alice');
  });

  it('handles null and undefined as empty string', () => {
    const row = { id: null, ref: undefined };
    expect(buildConcatKey(row, ['id', 'ref'])).toBe('|');
  });

  it('handles missing columns gracefully', () => {
    const row = { id: 'A1' };
    expect(buildConcatKey(row, ['id', 'missing'])).toBe('a1|');
  });
});

describe('keyDetection — applyKeyToDataset', () => {
  it('appends __recon_key to each row', () => {
    const rows = [
      { id: 'T1', amount: '100' },
      { id: 'T2', amount: '200' },
    ];
    const result = applyKeyToDataset(rows, ['id']);
    expect(result[0].__recon_key).toBe('t1');
    expect(result[1].__recon_key).toBe('t2');
  });

  it('does not mutate original rows', () => {
    const rows = [{ id: 'T1' }];
    const result = applyKeyToDataset(rows, ['id']);
    expect(rows[0].__recon_key).toBeUndefined();
    expect(result[0].__recon_key).toBe('t1');
  });
});

describe('keyDetection — validateKeyUniqueness', () => {
  it('returns isUnique true when all keys are unique', () => {
    const rows = [
      { __recon_key: 'a' },
      { __recon_key: 'b' },
      { __recon_key: 'c' },
    ];
    const result = validateKeyUniqueness(rows);
    expect(result.isUnique).toBe(true);
    expect(result.uniqueCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.duplicates).toHaveLength(0);
  });

  it('detects duplicates correctly', () => {
    const rows = [
      { __recon_key: 'a' },
      { __recon_key: 'a' },
      { __recon_key: 'b' },
    ];
    const result = validateKeyUniqueness(rows);
    expect(result.isUnique).toBe(false);
    expect(result.uniqueCount).toBe(2);
    expect(result.duplicates).toContain('a');
  });
});

describe('keyDetection — checkColumnUniqueness', () => {
  const rows = [
    { id: 'T1', date: '2024-01', amount: '100' },
    { id: 'T2', date: '2024-01', amount: '200' },
    { id: 'T1', date: '2024-02', amount: '100' },
  ];

  it('detects non-unique single column', () => {
    const result = checkColumnUniqueness(rows, ['id']);
    expect(result.isUnique).toBe(false);
    expect(result.uniqueCount).toBe(2);
    expect(result.totalCount).toBe(3);
  });

  it('detects unique compound key', () => {
    const result = checkColumnUniqueness(rows, ['id', 'date']);
    expect(result.isUnique).toBe(true);
    expect(result.uniqueCount).toBe(3);
  });

  it('returns 100% for empty rows', () => {
    const result = checkColumnUniqueness([], ['id']);
    expect(result.percent).toBe(100);
  });
});
