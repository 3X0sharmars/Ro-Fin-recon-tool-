import React from 'react';

// Generates A, B, C... Z, AA, AB... for column headers
function getColumnName(index) {
  let name = '';
  let i = index;
  while (i >= 0) {
    name = String.fromCharCode((i % 26) + 65) + name;
    i = Math.floor(i / 26) - 1;
  }
  return name;
}

export default function DataPreviewTable({ headers, rows, fileName, totalRows }) {
  if (!headers || !rows || headers.length === 0) {
    return <div className="text-textSecondary text-sm p-4 border border-border rounded bg-surface">No data available to preview.</div>;
  }

  // Display max 10 rows for the preview
  const displayRows = rows.slice(0, 10);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-text">{fileName} Preview</span>
        <span className="text-textSecondary">{headers.length} Columns • {totalRows.toLocaleString()} Rows</span>
      </div>
      
      <div className="border border-border rounded overflow-hidden relative">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead>
              {/* Spreadsheet-like column letter headers */}
              <tr className="bg-surface border-b border-border">
                <th className="bg-surface border-r border-border p-1 w-10 text-center text-textSecondary text-xs sticky left-0 z-20"></th>
                {headers.map((_, idx) => (
                  <th key={`col-${idx}`} className="border-r border-border p-1 text-center font-normal text-textSecondary text-xs min-w-[100px]">
                    {getColumnName(idx)}
                  </th>
                ))}
              </tr>
              {/* Actual data headers */}
              <tr className="bg-surface border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)] sticky top-0 z-10">
                <th className="bg-surface border-r border-border p-2 text-center text-textSecondary font-normal sticky left-0 z-20 shadow-[1px_0_2px_rgba(0,0,0,0.05)]">#</th>
                {headers.map((header, idx) => (
                  <th key={`h-${idx}`} className="border-r border-border p-2 font-semibold text-text text-xs max-w-[200px] truncate" title={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, rowIdx) => (
                <tr key={`r-${rowIdx}`} className="border-b border-border hover:bg-surface/50 transition-colors">
                  <td className="bg-surface border-r border-border p-2 text-center text-textSecondary text-xs sticky left-0 z-10">
                    {rowIdx + 1}
                  </td>
                  {headers.map((header, colIdx) => {
                    const value = row[header];
                    const displayValue = value === null || value === undefined ? '' : String(value);
                    const isTruncated = displayValue.length > 30;
                    
                    return (
                      <td key={`c-${colIdx}`} className="border-r border-border p-2 text-text text-xs max-w-[200px] truncate" title={isTruncated ? displayValue : undefined}>
                        {isTruncated ? `${displayValue.substring(0, 30)}...` : displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalRows > 10 && (
        <div className="text-xs text-textSecondary text-center italic mt-1">
          Showing first 10 rows of {totalRows.toLocaleString()}
        </div>
      )}
    </div>
  );
}
