import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function stripBom(value) {
  if (typeof value !== 'string') return value;
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function trimObjectValues(obj) {
  const newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const trimmedKey = stripBom(String(key)).trim();
    if (typeof value === 'string') {
      newObj[trimmedKey] = stripBom(value).trim();
    } else {
      newObj[trimmedKey] = value;
    }
  }
  return newObj;
}

function tableRowsFromWorksheet(worksheet) {
  const table = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!Array.isArray(table) || table.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = table[0].map(header => stripBom(String(header || '')).trim());
  const rows = table.slice(1).map(rowArray => {
    const rowObject = {};
    headers.forEach((header, index) => {
      rowObject[header] = rowArray[index] ?? '';
    });
    return trimObjectValues(rowObject);
  }).filter(row => !Object.values(row).every(value => value === '' || value === null || value === undefined));

  return { headers, rows };
}

/**
 * Parses a file (CSV or XLSX) and returns a normalised structure.
 * Returns: { headers: string[], previewRows: object[], fileName: string, rowCount: number, originalFile: File, hasMultipleSheets: boolean }
 */
export async function parseFile(file) {
  const fileName = file.name;
  const fileExtension = fileName.split('.').pop().toLowerCase();

  return new Promise((resolve, reject) => {
    if (fileExtension === 'csv') {
      // First pass: get headers and up to 1000 preview rows
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: 1000,
        complete: function(results) {
          let headers = [];
          if (results.meta && results.meta.fields) {
            let rawHeaders = results.meta.fields;
            if (rawHeaders.length > 0 && rawHeaders[0].startsWith('\uFEFF')) {
              rawHeaders[0] = rawHeaders[0].substring(1);
            }
            headers = rawHeaders.map(f => f.trim());
          }
          
          const previewRows = results.data.map(trimObjectValues);
          let rowCount = previewRows.length;

          // If we hit exactly 1000 rows, there might be more. Do a fast counting pass.
          if (rowCount === 1000) {
            let totalRowCount = 0;
            Papa.parse(file, {
              header: true,
              skipEmptyLines: true,
              step: function() {
                totalRowCount++;
              },
              complete: function() {
                resolve({
                  headers,
                  previewRows,
                  fileName,
                  rowCount: totalRowCount,
                  originalFile: file,
                  hasMultipleSheets: false,
                });
              },
              error: function(err) {
                reject(err);
              }
            });
          } else {
            resolve({
              headers,
              previewRows,
              fileName,
              rowCount,
              originalFile: file,
              hasMultipleSheets: false,
            });
          }
        },
        error: function(err) {
          reject(err);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Use SheetJS for XLSX
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const hasMultipleSheets = workbook.SheetNames.length > 1;
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const { headers, rows } = tableRowsFromWorksheet(worksheet);
          const rowCount = rows.length;
          const previewRows = rows.slice(0, 1000);

          resolve({
            headers,
            previewRows,
            fileName,
            rowCount,
            originalFile: file,
            hasMultipleSheets,
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function(err) {
        reject(err);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Unsupported file format. Please upload .csv, .xlsx, or .xls"));
    }
  });
}

/**
 * Parses the ENTIRE file into memory. Used during the reconciliation step.
 */
export async function parseFullFile(file) {
  const fileName = file.name;
  const fileExtension = fileName.split('.').pop().toLowerCase();

  return new Promise((resolve, reject) => {
    if (fileExtension === 'csv') {
      const allRows = [];
      let headers = [];
      let isFirstRow = true;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        step: function(results) {
          if (isFirstRow && results.meta && results.meta.fields) {
             let rawHeaders = results.meta.fields;
             if (rawHeaders.length > 0 && rawHeaders[0].startsWith('\uFEFF')) {
                 rawHeaders[0] = rawHeaders[0].substring(1);
             }
             headers = rawHeaders.map(f => f.trim());
             isFirstRow = false;
          }
          allRows.push(trimObjectValues(results.data));
        },
        complete: function() {
          resolve({
            headers,
            rows: allRows,
          });
        },
        error: function(err) {
          reject(err);
        }
      });
    } else {
      // XLSX
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const { headers, rows } = tableRowsFromWorksheet(worksheet);

          resolve({
            headers,
            rows,
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function(err) {
        reject(err);
      };
      reader.readAsArrayBuffer(file);
    }
  });
}
