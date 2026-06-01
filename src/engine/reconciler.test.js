import { describe, it, expect } from 'vitest';
import { reconcile } from './reconciler';

describe('reconciler', () => {
  it('classifies matching keys correctly', () => {
    const sheet1 = [
      { __recon_key: 'a' },
      { __recon_key: 'b' },
    ];
    const sheet2 = [
      { __recon_key: 'b' },
      { __recon_key: 'c' },
    ];

    const { rows, summary } = reconcile(sheet1, sheet2);

    expect(summary.totalUniqueKeys).toBe(3);
    expect(summary.matchCount).toBe(1);
    expect(summary.onlySheet1Count).toBe(1);
    expect(summary.onlySheet2Count).toBe(1);
    expect(rows.find(r => r.uniqueKey === 'a').status).toBe('Only Sheet 1');
    expect(rows.find(r => r.uniqueKey === 'b').status).toBe('Match between sheets');
    expect(rows.find(r => r.uniqueKey === 'c').status).toBe('Only Sheet 2');
  });

  it('flags duplicate keys within a single sheet', () => {
    const sheet1 = [
      { __recon_key: 'dup' },
      { __recon_key: 'dup' },
      { __recon_key: 'unique1' },
    ];
    const sheet2 = [
      { __recon_key: 'unique2' },
    ];

    const { rows, summary } = reconcile(sheet1, sheet2);

    expect(summary.duplicatesSheet1).toBe(1);
    expect(summary.duplicatesSheet2).toBe(0);
    const dupRow = rows.find(r => r.uniqueKey === 'dup');
    expect(dupRow.sheet1Match).toBe('Duplicate (2 occurrences)');
    expect(dupRow.sheet2Match).toBe('No');
    expect(dupRow.status).toBe('Only Sheet 1');
  });

  it('handles empty datasets gracefully', () => {
    const { rows, summary } = reconcile([], []);
    expect(summary.totalUniqueKeys).toBe(0);
    expect(rows).toHaveLength(0);
  });
});
