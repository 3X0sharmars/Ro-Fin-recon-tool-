import React, { useState, useRef } from 'react';
import { parseFile } from '../engine/fileParser';

export default function FileUploadZone({ label, onFileParsed }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);
  const [fileData, setFileData] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file) => {
    setError(null);
    if (!file) return;

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      setError('Invalid file format. Please upload .csv, .xlsx, or .xls');
      return;
    }

    setIsParsing(true);
    try {
      const result = await parseFile(file);
      setFileData({
        fileName: result.fileName,
        rowCount: result.rowCount,
        colCount: result.headers.length,
        hasMultipleSheets: result.hasMultipleSheets,
      });
      onFileParsed(result);
    } catch (err) {
      setError(err.message || 'Error parsing file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleReplace = () => {
    setFileData(null);
    onFileParsed(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="font-medium text-text">{label}</div>
      
      {!fileData && (
        <div 
          className={`border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-primary bg-primaryLight' : 'border-border hover:border-primary/50 bg-white'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isParsing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-textSecondary text-sm">Parsing file...</span>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-2 text-textSecondary">📄</div>
              <p className="text-text font-medium text-center">Drop .csv or .xlsx here or Browse</p>
              {error && <p className="text-danger mt-2 text-sm text-center">{error}</p>}
            </>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv" 
          />
        </div>
      )}

      {fileData && (
        <div className="border border-border rounded-md p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">📄</div>
              <div>
                <h4 className="text-text font-medium text-sm truncate max-w-[200px]">{fileData.fileName}</h4>
                <p className="text-textSecondary text-xs">{fileData.rowCount.toLocaleString()} rows • {fileData.colCount} cols</p>
              </div>
            </div>
            <button 
              onClick={handleReplace}
              className="text-xs text-primary hover:text-primaryDark font-medium px-2 py-1 rounded hover:bg-primaryLight transition-colors"
            >
              Replace file
            </button>
          </div>
          {fileData.hasMultipleSheets && (
            <div className="bg-warning/10 text-warning px-2 py-1 rounded text-xs border border-warning/20">
              Multiple sheets detected. Only the first sheet was loaded.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
