import React, { useEffect, useState } from 'react';
import FileUploadZone from './components/FileUploadZone';
import DataPreviewTable from './components/DataPreviewTable';
import KeySelector from './components/KeySelector';
import ResultsSummary from './components/ResultsSummary';
import { parseFullFile } from './engine/fileParser';
import { applyKeyToDataset, validateKeyUniqueness } from './engine/keyDetection';
import { reconcile } from './engine/reconciler';
import { buildOutputWorkbook, downloadWorkbook } from './engine/outputBuilder';

// Step indicator
function StepIndicator({ currentStep }) {
  const steps = ['Upload Files', 'Configure Key', 'Reconcile', 'Download'];
  return (
    <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 text-sm font-medium overflow-x-auto">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = currentStep === stepNum;
        const isDone = currentStep > stepNum;
        return (
          <React.Fragment key={stepNum}>
            {i > 0 && <span className="text-border text-xs">→</span>}
            <div className={`flex items-center gap-2 whitespace-nowrap ${
              isActive ? 'text-primary' : isDone ? 'text-primary/60' : 'text-textSecondary'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                ${isActive ? 'bg-primary text-white'
                : isDone ? 'bg-primary/20 text-primary'
                : 'border border-border text-textSecondary'}`}>
                {isDone ? '✓' : stepNum}
              </span>
              {label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function App() {
  const [step, setStep] = useState(1);
  const [sheet1Data, setSheet1Data] = useState(null);
  const [sheet2Data, setSheet2Data] = useState(null);
  const [keyConfig, setKeyConfig] = useState(null); // { sheet1Columns, sheet2Columns, rationale, mode, fullRows1, fullRows2, uniqueness }
  const [showPreview1, setShowPreview1] = useState(false);
  const [showPreview2, setShowPreview2] = useState(false);
  const [isBuildingKey, setIsBuildingKey] = useState(false);
  const [keyBuildError, setKeyBuildError] = useState(null);
  const [keyBuildWarnings, setKeyBuildWarnings] = useState([]);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState(null);

  const bothUploaded = sheet1Data && sheet2Data;

  const handleKeyConfirmed = async (config) => {
    if (!sheet1Data?.originalFile || !sheet2Data?.originalFile) return;

    setIsBuildingKey(true);
    setKeyBuildError(null);
    setKeyBuildWarnings([]);

    try {
      const [full1, full2] = await Promise.all([
        parseFullFile(sheet1Data.originalFile),
        parseFullFile(sheet2Data.originalFile),
      ]);

      const keyed1 = applyKeyToDataset(full1.rows, config.sheet1Columns);
      const keyed2 = applyKeyToDataset(full2.rows, config.sheet2Columns);
      const uniq1 = validateKeyUniqueness(keyed1);
      const uniq2 = validateKeyUniqueness(keyed2);

      const warnings = [];
      if (!uniq1.isUnique) {
        warnings.push(`Sheet 1 key produced ${uniq1.duplicates.length} duplicate value(s).`);
      }
      if (!uniq2.isUnique) {
        warnings.push(`Sheet 2 key produced ${uniq2.duplicates.length} duplicate value(s).`);
      }

      setKeyConfig({
        ...config,
        fullRows1: keyed1,
        fullRows2: keyed2,
        uniqueness: {
          sheet1: uniq1,
          sheet2: uniq2,
        },
      });
      setKeyBuildWarnings(warnings);
      setStep(3);
      setReconcileResult(null);
    } catch (err) {
      setKeyBuildError(err.message || 'Unable to build reconciliation keys from the full dataset.');
    } finally {
      setIsBuildingKey(false);
    }
  };

  useEffect(() => {
    const persisted = localStorage.getItem('dataReconBannerCollapsed');
    setBannerCollapsed(persisted === 'true');
  }, []);

  const getSafeFileName = (name) => {
    return String(name || '')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9 _-]/g, '_')
      .trim() || 'Dataset';
  };

  const getOutputFileName = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `Reconciliation_${getSafeFileName(sheet1Data?.fileName)}_vs_${getSafeFileName(sheet2Data?.fileName)}_${date}.xlsx`;
  };

  const handleRunReconciliation = () => {
    if (!keyConfig?.fullRows1 || !keyConfig?.fullRows2) return;
    setIsReconciling(true);
    const result = reconcile(keyConfig.fullRows1, keyConfig.fullRows2);
    setReconcileResult(result);
    setIsReconciling(false);
    setStep(4);
  };

  const handleDownload = () => {
    if (!reconcileResult || !keyConfig) return;
    const workbook = buildOutputWorkbook(
      keyConfig.fullRows1,
      keyConfig.fullRows2,
      reconcileResult.rows,
      sheet1Data.fileName,
      sheet2Data.fileName,
    );
    const filename = getOutputFileName();
    const size = downloadWorkbook(workbook, filename);
    setDownloadInfo({ filename, size, rows1: keyConfig.fullRows1.length, rows2: keyConfig.fullRows2.length, results: reconcileResult.rows.length });
  };

  const handleReset = () => {
    setStep(1);
    setSheet1Data(null);
    setSheet2Data(null);
    setKeyConfig(null);
    setReconcileResult(null);
    setShowPreview1(false);
    setShowPreview2(false);
    setKeyBuildWarnings([]);
    setKeyBuildError(null);
    setDownloadInfo(null);
  };

  const toggleBanner = () => {
    const next = !bannerCollapsed;
    setBannerCollapsed(next);
    localStorage.setItem('dataReconBannerCollapsed', next ? 'true' : 'false');
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-text">
      {/* Header */}
      <header className="h-12 border-b border-border bg-white flex items-center px-4 shadow-sm">
        <span className="font-bold text-primary text-lg tracking-tight">DataRecon</span>
        <span className="ml-3 text-border">|</span>
        <span className="ml-3 text-textSecondary text-sm hidden sm:inline">Financial Reconciliation Tool</span>
      </header>

      {/* Tool banner */}
      <div className={`border-b border-border bg-white px-4 py-2 transition-all ${bannerCollapsed ? 'h-12 overflow-hidden' : ''}`}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-textSecondary truncate">
            Upload two financial datasets · Select or auto-detect a unique key · Download a three-sheet reconciliation report
          </p>
          <button
            onClick={toggleBanner}
            className="text-xs text-primary hover:text-primaryDark font-medium"
          >
            {bannerCollapsed ? 'Show info' : 'Hide'}
          </button>
        </div>
      </div>

      {/* Stepper */}
      <StepIndicator currentStep={step} />

      <main className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-8">

        {/* ── STEP 1: Upload ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-text">Upload your datasets</h2>
            <p className="text-textSecondary text-sm">Upload two financial datasets in .csv or .xlsx format to begin reconciliation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileUploadZone
              label="Dataset 1"
              onFileParsed={data => { setSheet1Data(data); setKeyConfig(null); if (!data) setStep(1); }}
            />
            <FileUploadZone
              label="Dataset 2"
              onFileParsed={data => { setSheet2Data(data); setKeyConfig(null); if (!data) setStep(1); }}
            />
          </div>

          {/* Preview toggles */}
          {sheet1Data && (
            <div className="mt-4">
              <button
                onClick={() => setShowPreview1(v => !v)}
                className="text-xs text-primary hover:text-primaryDark font-medium"
              >
                {showPreview1 ? '▲ Hide' : '▼ Show'} Dataset 1 preview
              </button>
              {showPreview1 && (
                <div className="mt-2">
                  <DataPreviewTable
                    headers={sheet1Data.headers}
                    rows={sheet1Data.previewRows}
                    fileName={sheet1Data.fileName}
                    totalRows={sheet1Data.rowCount}
                  />
                </div>
              )}
            </div>
          )}
          {sheet2Data && (
            <div className="mt-4">
              <button
                onClick={() => setShowPreview2(v => !v)}
                className="text-xs text-primary hover:text-primaryDark font-medium"
              >
                {showPreview2 ? '▲ Hide' : '▼ Show'} Dataset 2 preview
              </button>
              {showPreview2 && (
                <div className="mt-2">
                  <DataPreviewTable
                    headers={sheet2Data.headers}
                    rows={sheet2Data.previewRows}
                    fileName={sheet2Data.fileName}
                    totalRows={sheet2Data.rowCount}
                  />
                </div>
              )}
            </div>
          )}

          {/* CTA: Proceed to Step 2 */}
          {bothUploaded && step === 1 && (
            <button
              onClick={() => setStep(2)}
              className="mt-6 px-6 py-2.5 bg-primary text-white rounded text-sm font-medium hover:bg-primaryDark transition-colors shadow-sm"
            >
              Proceed to Key Configuration →
            </button>
          )}
        </section>

        {/* ── STEP 2: Configure Key ── */}
        {step >= 2 && (
          <section className="border-t border-border pt-8">
            {isBuildingKey && (
              <div className="mb-4 rounded border border-primary/20 bg-primaryLight px-4 py-3 text-sm text-primary">
                Building reconciliation keys from both datasets… please wait.
              </div>
            )}
            {keyBuildError && (
              <div className="mb-4 rounded border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {keyBuildError}
              </div>
            )}
            <KeySelector
              sheet1Data={sheet1Data}
              sheet2Data={sheet2Data}
              onKeyConfirmed={handleKeyConfirmed}
              isBuildingKey={isBuildingKey}
            />
          </section>
        )}

        {/* ── STEP 3: Reconciliation ── */}
        {step >= 3 && keyConfig && (
          <section className="border-t border-border pt-8">
            <div className="mb-6 rounded border border-border bg-white p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text">Reconcile the datasets</h2>
                  <p className="text-textSecondary text-sm">
                    Compare both datasets using the confirmed reconciliation key and identify matches or unmatched rows.
                  </p>
                </div>
                <button
                  onClick={handleRunReconciliation}
                  disabled={isReconciling}
                  className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded text-sm font-medium hover:bg-primaryDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isReconciling ? 'Reconciling…' : 'Run Reconciliation'}
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-border bg-surface p-4 text-sm">
                  <div className="font-semibold text-text">Key</div>
                  <div className="mt-2 text-textSecondary text-xs">
                    Dataset 1: <strong>{keyConfig.sheet1Columns.join(' × ')}</strong>
                  </div>
                  <div className="mt-1 text-textSecondary text-xs">
                    Dataset 2: <strong>{keyConfig.sheet2Columns.join(' × ')}</strong>
                  </div>
                </div>
                {keyConfig.rationale && (
                  <div className="rounded border border-border bg-surface p-4 text-sm">
                    <div className="font-semibold text-text">Why this key?</div>
                    <p className="mt-2 text-textSecondary text-xs">{keyConfig.rationale}</p>
                  </div>
                )}
              </div>
            </div>

            {reconcileResult ? (
              <ResultsSummary
                results={reconcileResult.rows}
                summary={reconcileResult.summary}
                file1Label="Sheet 1"
                file2Label="Sheet 2"
              />
            ) : (
              <div className="rounded border border-border bg-surface p-6 text-sm text-textSecondary">
                Run reconciliation to generate a summary of matches and unmatched keys.
              </div>
            )}
          </section>
        )}

        {/* ── STEP 4: Download ── */}
        {step >= 4 && reconcileResult && (
          <section className="border-t border-border pt-8">
            <div className="mb-6 rounded border border-border bg-white p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text">Download your reconciliation report</h2>
                  <p className="text-textSecondary text-sm">
                    Export a three-sheet .xlsx file with source data and reconciliation results.
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded text-sm font-medium hover:bg-primaryDark transition-colors"
                >
                  Download Results (.xlsx)
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded border border-border bg-surface p-4 text-sm">
                  <div className="font-semibold text-text">Sheet 1 rows</div>
                  <div className="mt-2 text-textSecondary text-xs">{keyConfig.fullRows1.length.toLocaleString()} rows</div>
                </div>
                <div className="rounded border border-border bg-surface p-4 text-sm">
                  <div className="font-semibold text-text">Sheet 2 rows</div>
                  <div className="mt-2 text-textSecondary text-xs">{keyConfig.fullRows2.length.toLocaleString()} rows</div>
                </div>
                <div className="rounded border border-border bg-surface p-4 text-sm">
                  <div className="font-semibold text-text">Reconciliation rows</div>
                  <div className="mt-2 text-textSecondary text-xs">{reconcileResult.rows.length.toLocaleString()} unique keys</div>
                </div>
              </div>

              {downloadInfo && (
                <div className="mt-4 rounded border border-primary/20 bg-primaryLight p-4 text-sm text-primary">
                  <div>Downloaded: <strong>{downloadInfo.filename}</strong></div>
                  <div className="mt-1 text-textSecondary text-xs">Estimated file size: {(downloadInfo.size / 1024).toFixed(1)} KB</div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={handleReset}
                  className="px-5 py-2 border border-border rounded text-sm text-textSecondary hover:bg-surface transition-colors"
                >
                  Start New Reconciliation
                </button>
                <p className="text-xs text-textSecondary">
                  The downloaded workbook includes Sheet 1 Data, Sheet 2 Data, and Reconciliation Results.
                </p>
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

export default App;
