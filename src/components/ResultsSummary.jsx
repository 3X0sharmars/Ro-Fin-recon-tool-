import React, { useMemo, useState } from 'react';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Match between sheets', label: 'Matches' },
  { value: 'Only Sheet 1', label: 'Only Sheet 1' },
  { value: 'Only Sheet 2', label: 'Only Sheet 2' },
];

function StatusBadge({ status }) {
  const classes = {
    'Match between sheets': 'bg-primaryLight text-primary border-primary/30',
    'Only Sheet 1': 'bg-warning/10 text-warning border-warning/30',
    'Only Sheet 2': 'bg-orange-100 text-orange-700 border-orange-200',
  };

  return (
    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${classes[status] || 'bg-surface text-textSecondary border-border'}`}>
      {status}
    </span>
  );
}

export default function ResultsSummary({ results, summary, file1Label, file2Label }) {
  const [filter, setFilter] = useState('all');

  const filteredResults = useMemo(() => {
    if (filter === 'all') return results;
    return results.filter(row => row.status === filter);
  }, [filter, results]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded border border-border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-textSecondary">Total Keys</div>
          <div className="mt-2 text-2xl font-semibold text-text">{summary.totalUniqueKeys.toLocaleString()}</div>
        </div>
        <div className="rounded border border-border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-textSecondary">Matches</div>
          <div className="mt-2 text-2xl font-semibold text-primary">{summary.matchCount.toLocaleString()}</div>
        </div>
        <div className="rounded border border-border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-textSecondary">Only {file1Label}</div>
          <div className="mt-2 text-2xl font-semibold text-warning">{summary.onlySheet1Count.toLocaleString()}</div>
        </div>
        <div className="rounded border border-border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-textSecondary">Only {file2Label}</div>
          <div className="mt-2 text-2xl font-semibold text-orange-700">{summary.onlySheet2Count.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-textSecondary">
          Showing {Math.min(filteredResults.length, 50).toLocaleString()} of {results.length.toLocaleString()} result rows
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-xs uppercase tracking-wide text-textSecondary">Filter</label>
          <select
            id="statusFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-border rounded px-3 py-2 text-sm bg-white text-text"
          >
            {FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-border bg-white">
        <table className="min-w-full text-left text-sm border-collapse">
          <thead className="bg-surface text-textSecondary text-[11px] uppercase tracking-wide">
            <tr>
              <th className="p-3 border-b border-border">#</th>
              <th className="p-3 border-b border-border">Unique Key</th>
              <th className="p-3 border-b border-border">Sheet 1 Match</th>
              <th className="p-3 border-b border-border">Sheet 2 Match</th>
              <th className="p-3 border-b border-border">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.slice(0, 50).map((row, index) => (
              <tr key={`${row.uniqueKey}-${index}`} className="border-b border-border hover:bg-surface/70 transition-colors">
                <td className="p-3 text-textSecondary">{index + 1}</td>
                <td className="p-3 text-text break-words max-w-xl">{row.uniqueKey}</td>
                <td className="p-3 text-textSecondary">{row.sheet1Match}</td>
                <td className="p-3 text-textSecondary">{row.sheet2Match}</td>
                <td className="p-3"><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
