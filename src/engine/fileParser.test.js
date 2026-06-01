import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseFile, parseFullFile } from './fileParser';

describe('fileParser module', () => {

  const createCsvFile = (content, fileName = 'test.csv') => {
    return new File([content], fileName, { type: 'text/csv' });
  };

  const createXlsxFile = (rows, fileName = 'test.xlsx') => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new File([new Uint8Array(arrayBuffer)], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  it('should parse a basic CSV correctly', async () => {
    const csvContent = `id, name , value \n1, Alice , 100\n2, Bob, 200`;
    const file = createCsvFile(csvContent);
    
    const result = await parseFile(file);
    
    expect(result.fileName).toBe('test.csv');
    expect(result.headers).toEqual(['id', 'name', 'value']);
    expect(result.previewRows).toHaveLength(2);
    expect(result.previewRows[0]).toEqual({ id: '1', name: 'Alice', value: '100' });
    expect(result.rowCount).toBe(2);
  });

  it('should handle header-only CSV file', async () => {
    const csvContent = `id,name,value\n`;
    const file = createCsvFile(csvContent);
    
    const result = await parseFile(file);
    
    expect(result.headers).toEqual(['id', 'name', 'value']);
    expect(result.previewRows).toHaveLength(0);
    expect(result.rowCount).toBe(0);
  });

  it('should handle empty file', async () => {
    const csvContent = ``;
    const file = createCsvFile(csvContent);
    
    const result = await parseFile(file);
    
    expect(result.headers).toEqual([]);
    expect(result.previewRows).toHaveLength(0);
    expect(result.rowCount).toBe(0);
  });

  it('should trim whitespace from headers and values', async () => {
    const csvContent = `  col1  ,  col2  \n  val1  ,  val2  `;
    const file = createCsvFile(csvContent);
    
    const result = await parseFile(file);
    
    expect(result.headers).toEqual(['col1', 'col2']);
    expect(result.previewRows[0]).toEqual({ col1: 'val1', col2: 'val2' });
  });

  it('should handle mixed data types in CSV', async () => {
    const csvContent = `id,name,isActive,balance\n1,Test,true,150.50`;
    const file = createCsvFile(csvContent);
    
    const result = await parseFile(file);
    
    expect(result.previewRows[0]).toEqual({
      id: '1',
      name: 'Test',
      isActive: 'true',
      balance: '150.50'
    });
  });

  it('should handle BOM in CSV', async () => {
    const csvContent = '\uFEFFid,name\n1,Test';
    const file = createCsvFile(csvContent);
    
    const result = await parseFile(file);
    
    expect(result.headers).toEqual(['id', 'name']);
  });

  it('should parse a header-only XLSX file', async () => {
    const file = createXlsxFile([['id', 'name', 'value']]);

    const result = await parseFile(file);

    expect(result.headers).toEqual(['id', 'name', 'value']);
    expect(result.previewRows).toHaveLength(0);
    expect(result.rowCount).toBe(0);
  });

  it('should support parseFullFile for full CSV content', async () => {
    const file = createCsvFile('id,name\n1,Alice\n2,Bob');
    const result = await parseFullFile(file);

    expect(result.headers).toEqual(['id', 'name']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toEqual({ id: '2', name: 'Bob' });
  });

  it('should cap preview at 1000 rows but count all rows', async () => {
    // Generate a 1500 row CSV
    let csvContent = 'id,value\n';
    for (let i = 1; i <= 1500; i++) {
      csvContent += String(i) + ',val' + String(i) + '\n';
    }
    const file = createCsvFile(csvContent, 'large.csv');
    
    const result = await parseFile(file);
    
    expect(result.previewRows).toHaveLength(1000);
    expect(result.rowCount).toBe(1500);
  });

});
