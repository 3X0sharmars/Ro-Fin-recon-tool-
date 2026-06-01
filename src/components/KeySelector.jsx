import React, { useState, useMemo } from 'react';
import { checkColumnUniqueness } from '../engine/keyDetection';
import { detectKey } from '../api/geminiClient';

// ── Small sub-components ────────────────────────────────────────────────

function ColumnChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primaryLight text-primary text-xs font-medium px-2 py-1 rounded border border-primary/20">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="text-primary/60 hover:text-primary ml-1 leading-none">×</button>
      )}
    </span>
  );
}

function UniquenessBar({ stats }) {
  if (!stats || stats.totalCount === 0) return null;
  const isGood = stats.isUnique;
  return (
    <div className={`mt-2 text-xs rounded px-3 py-2 border ${isGood
      ? 'bg-primaryLight border-primary/20 text-primary'
      : 'bg-warning/10 border-warning/30 text-warning'}`}>
      {isGood
        ? `✓ ${stats.uniqueCount.toLocaleString()} unique values — key is fully unique across ${stats.totalCount.toLocaleString()} preview rows`
        : `⚠ ${stats.uniqueCount.toLocaleString()} unique values out of ${stats.totalCount.toLocaleString()} rows (${stats.percent}% unique) — duplicates found`}
    </div>
  );
}

// ── Manual Key Section ──────────────────────────────────────────────────

function ManualKeySection({ sheet1Data, sheet2Data, onKeyConfirmed, isBuildingKey }) {
  const [s1Col, setS1Col] = useState('');
  const [s2Col, setS2Col] = useState('');
  const [extraS1Cols, setExtraS1Cols] = useState([]);
  const [extraS2Cols, setExtraS2Cols] = useState([]);

  const s1Cols = s1Col ? [s1Col, ...extraS1Cols] : [];
  const s2Cols = s2Col ? [s2Col, ...extraS2Cols] : [];

  const s1Stats = useMemo(() => {
    if (!s1Col) return null;
    return checkColumnUniqueness(sheet1Data.previewRows, s1Cols);
  }, [s1Col, extraS1Cols, sheet1Data]);

  const s2Stats = useMemo(() => {
    if (!s2Col) return null;
    return checkColumnUniqueness(sheet2Data.previewRows, s2Cols);
  }, [s2Col, extraS2Cols, sheet2Data]);

  const namesMatch = s1Col && s2Col && s1Col === s2Col;
  const canConfirm = s1Col && s2Col;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sheet 1 column selector */}
        <div>
          <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">
            Dataset 1 Key Column
          </label>
          <select
            value={s1Col}
            onChange={e => { setS1Col(e.target.value); setExtraS1Cols([]); }}
            className="w-full border border-border rounded px-3 py-2 text-sm text-text bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">— Select a column —</option>
            {sheet1Data.headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>

          {/* Extra columns for compound key */}
          {s1Col && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1 mb-1">
                <ColumnChip label={s1Col} />
                {extraS1Cols.map(c => (
                  <ColumnChip key={c} label={c} onRemove={() => setExtraS1Cols(prev => prev.filter(x => x !== c))} />
                ))}
              </div>
              <select
                value=""
                onChange={e => { if (e.target.value) setExtraS1Cols(prev => [...prev, e.target.value]); }}
                className="w-full border border-dashed border-border rounded px-2 py-1 text-xs text-textSecondary bg-white focus:outline-none"
              >
                <option value="">+ Add another column to key</option>
                {sheet1Data.headers
                  .filter(h => h !== s1Col && !extraS1Cols.includes(h))
                  .map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          <UniquenessBar stats={s1Stats} />
        </div>

        {/* Sheet 2 column selector */}
        <div>
          <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">
            Dataset 2 Key Column
          </label>
          <select
            value={s2Col}
            onChange={e => { setS2Col(e.target.value); setExtraS2Cols([]); }}
            className="w-full border border-border rounded px-3 py-2 text-sm text-text bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">— Select a column —</option>
            {sheet2Data.headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>

          {s2Col && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1 mb-1">
                <ColumnChip label={s2Col} />
                {extraS2Cols.map(c => (
                  <ColumnChip key={c} label={c} onRemove={() => setExtraS2Cols(prev => prev.filter(x => x !== c))} />
                ))}
              </div>
              <select
                value=""
                onChange={e => { if (e.target.value) setExtraS2Cols(prev => [...prev, e.target.value]); }}
                className="w-full border border-dashed border-border rounded px-2 py-1 text-xs text-textSecondary bg-white focus:outline-none"
              >
                <option value="">+ Add another column to key</option>
                {sheet2Data.headers
                  .filter(h => h !== s2Col && !extraS2Cols.includes(h))
                  .map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          <UniquenessBar stats={s2Stats} />
        </div>
      </div>

      {namesMatch && (
        <p className="text-xs text-textSecondary italic">
          ✓ Both datasets use the column name <strong>{s1Col}</strong> — they will be matched directly.
        </p>
      )}
      {s1Col && s2Col && !namesMatch && (
        <p className="text-xs text-warning italic">
          ⚠ Column names differ (<strong>{s1Col}</strong> vs <strong>{s2Col}</strong>). DataRecon will still match them by value — verify they contain the same data.
        </p>
      )}

      <button
        disabled={!canConfirm || isBuildingKey}
        onClick={() => onKeyConfirmed({ sheet1Columns: s1Cols, sheet2Columns: s2Cols, rationale: null, mode: 'manual' })}
        className="self-start px-5 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primaryDark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isBuildingKey ? 'Building key…' : 'Confirm Key & Proceed'}
      </button>
    </div>
  );
}

// ── AI Auto-Detect Section ──────────────────────────────────────────────

function AIDetectSection({ sheet1Data, sheet2Data, onKeyConfirmed, isBuildingKey }) {
  const [status, setStatus] = useState('idle'); // idle | detecting | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showRationale, setShowRationale] = useState(false);

  // Allow user to override AI suggestion
  const [overrideS1, setOverrideS1] = useState([]);
  const [overrideS2, setOverrideS2] = useState([]);

  const activeS1 = overrideS1.length > 0 ? overrideS1 : (result?.sheet1Columns || []);
  const activeS2 = overrideS2.length > 0 ? overrideS2 : (result?.sheet2Columns || []);

  const s1Stats = useMemo(() => {
    if (activeS1.length === 0) return null;
    return checkColumnUniqueness(sheet1Data.previewRows, activeS1);
  }, [activeS1, sheet1Data]);

  const s2Stats = useMemo(() => {
    if (activeS2.length === 0) return null;
    return checkColumnUniqueness(sheet2Data.previewRows, activeS2);
  }, [activeS2, sheet2Data]);

  const handleDetect = async () => {
    setStatus('detecting');
    setError(null);
    setResult(null);
    setOverrideS1([]);
    setOverrideS2([]);
    try {
      const detected = await detectKey({
        sheet1Headers: sheet1Data.headers,
        sheet2Headers: sheet2Data.headers,
        sheet1Sample: sheet1Data.previewRows.slice(0, 100),
        sheet2Sample: sheet2Data.previewRows.slice(0, 100),
      });
      setResult(detected);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {status === 'idle' && (
        <div className="text-sm text-textSecondary">
          Click <strong>Detect Key</strong> to send column structure and a sample of up to 100 rows to Gemini AI for analysis. Your full data stays in the browser.
        </div>
      )}

      {/* Detect / Re-detect button */}
      {(status === 'idle' || status === 'error' || status === 'done') && (
        <button
          onClick={handleDetect}
          className="self-start px-5 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primaryDark transition-colors flex items-center gap-2"
        >
          <span>🔍</span>
          {status === 'done' ? 'Re-detect Key' : 'Detect Key'}
        </button>
      )}

      {/* Detecting state */}
      {status === 'detecting' && (
        <div className="flex items-center gap-3 text-sm text-textSecondary py-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Analysing column structure…</span>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Result */}
      {status === 'done' && result && (
        <div className="flex flex-col gap-4 border border-border rounded p-4 bg-white">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-text text-sm">AI-Detected Key</h4>
            <button
              onClick={() => setShowRationale(r => !r)}
              className="text-xs text-primary hover:text-primaryDark"
            >
              {showRationale ? 'Hide rationale' : 'Why this key?'}
            </button>
          </div>

          {showRationale && (
            <div className="bg-surface border border-border rounded px-3 py-2 text-xs text-textSecondary italic">
              {result.rationale}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-2">Dataset 1 Columns</p>
              <div className="flex flex-wrap gap-1 mb-1">
                {activeS1.map(c => <ColumnChip key={c} label={c} />)}
              </div>
              <select
                value=""
                onChange={e => {
                  const val = e.target.value;
                  if (val === '__reset') { setOverrideS1([]); return; }
                  if (val) setOverrideS1(prev =>
                    prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                  );
                }}
                className="mt-1 w-full border border-dashed border-border rounded px-2 py-1 text-xs text-textSecondary bg-white"
              >
                <option value="">Override AI selection…</option>
                <option value="__reset">↺ Reset to AI suggestion</option>
                {sheet1Data.headers.map(h => (
                  <option key={h} value={h}>{activeS1.includes(h) ? `✓ ${h}` : h}</option>
                ))}
              </select>
              <UniquenessBar stats={s1Stats} />
            </div>

            <div>
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-2">Dataset 2 Columns</p>
              <div className="flex flex-wrap gap-1 mb-1">
                {activeS2.map(c => <ColumnChip key={c} label={c} />)}
              </div>
              <select
                value=""
                onChange={e => {
                  const val = e.target.value;
                  if (val === '__reset') { setOverrideS2([]); return; }
                  if (val) setOverrideS2(prev =>
                    prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                  );
                }}
                className="mt-1 w-full border border-dashed border-border rounded px-2 py-1 text-xs text-textSecondary bg-white"
              >
                <option value="">Override AI selection…</option>
                <option value="__reset">↺ Reset to AI suggestion</option>
                {sheet2Data.headers.map(h => (
                  <option key={h} value={h}>{activeS2.includes(h) ? `✓ ${h}` : h}</option>
                ))}
              </select>
              <UniquenessBar stats={s2Stats} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <div className="flex-1 text-xs text-textSecondary">
              Key: <strong>{activeS1.join(' × ')}</strong> (Dataset 1) ↔ <strong>{activeS2.join(' × ')}</strong> (Dataset 2)
            </div>
            <button
              disabled={activeS1.length === 0 || activeS2.length === 0 || isBuildingKey}
              onClick={() => onKeyConfirmed({
                sheet1Columns: activeS1,
                sheet2Columns: activeS2,
                rationale: result.rationale,
                mode: 'ai',
              })}
              className="px-5 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primaryDark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isBuildingKey ? 'Building key…' : 'Confirm Key & Proceed'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main KeySelector Component ──────────────────────────────────────────

export default function KeySelector({ sheet1Data, sheet2Data, onKeyConfirmed, isBuildingKey }) {
  const [mode, setMode] = useState('manual'); // 'manual' | 'ai'

  if (!sheet1Data || !sheet2Data) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold text-text mb-1">Configure Reconciliation Key</h2>
        <p className="text-textSecondary text-sm">
          Select how to identify matching rows between the two datasets.
        </p>
      </div>

      {/* Segmented control */}
      <div className="flex rounded overflow-hidden border border-border w-fit">
        <button
          onClick={() => setMode('manual')}
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-primary text-white'
              : 'bg-white text-textSecondary hover:bg-surface'
          }`}
        >
          Manual Key
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`px-5 py-2 text-sm font-medium transition-colors border-l border-border ${
            mode === 'ai'
              ? 'bg-primary text-white'
              : 'bg-white text-textSecondary hover:bg-surface'
          }`}
        >
          🤖 AI Auto-Detect
        </button>
      </div>

      {/* Panel */}
      <div className="border border-border rounded-lg p-5 bg-white">
        {mode === 'manual' ? (
          <ManualKeySection
            sheet1Data={sheet1Data}
            sheet2Data={sheet2Data}
            onKeyConfirmed={onKeyConfirmed}
            isBuildingKey={isBuildingKey}
          />
        ) : (
          <AIDetectSection
            sheet1Data={sheet1Data}
            sheet2Data={sheet2Data}
            onKeyConfirmed={onKeyConfirmed}
            isBuildingKey={isBuildingKey}
          />
        )}
      </div>
    </div>
  );
}
