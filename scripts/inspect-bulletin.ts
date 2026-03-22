/**
 * One-time script to inspect the EC Oil Bulletin XLSX structure.
 * Downloads the file and dumps header rows + column mapping.
 *
 * Usage: npx tsx scripts/inspect-bulletin.ts
 */
import ExcelJS from 'exceljs';

const EC_OIL_BULLETIN_URL =
  'https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en';

async function main() {
  console.log('Downloading EC Oil Bulletin...');
  const res = await fetch(EC_OIL_BULLETIN_URL, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buf = await res.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(buf) as any);

  console.log('\n=== Sheet Names ===');
  workbook.eachSheet((ws) => console.log(ws.name));

  const sheetName = 'Prices with taxes';
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) {
    console.error(`Sheet "${sheetName}" not found!`);
    process.exit(1);
  }

  console.log(`\n=== Total Rows: ${ws.rowCount} ===`);

  // Dump first 4 rows (headers + first data row)
  console.log('\n=== Header Rows (1-4) ===');
  for (let r = 1; r <= Math.min(4, ws.rowCount); r++) {
    const row = ws.getRow(r);
    console.log(`\n--- Row ${r} (${row.cellCount} cells) ---`);
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const val = cell.value;
      if (val != null && String(val).trim() !== '') {
        console.log(`  [${colNumber}] ${val}`);
      }
    });
  }

  // Try to discover the column pattern
  console.log('\n=== Column Discovery ===');
  const headerRow1 = ws.getRow(1);
  const headerRow2 = ws.getRow(2);
  const headerRow3 = ws.getRow(3);

  const maxCol = ws.columnCount;
  const columnMap: { col: number; header1: string; header2: string; header3: string }[] = [];

  for (let c = 1; c <= maxCol; c++) {
    const h1 = String(headerRow1.getCell(c).value ?? '').trim();
    const h2 = String(headerRow2.getCell(c).value ?? '').trim();
    const h3 = String(headerRow3.getCell(c).value ?? '').trim();
    if (h1 || h2 || h3) {
      columnMap.push({ col: c, header1: h1, header2: h2, header3: h3 });
    }
  }

  console.log('\nAll non-empty header cells:');
  console.log('Col | Row 1 | Row 2 | Row 3');
  console.log('----|-------|-------|------');
  for (const { col, header1, header2, header3 } of columnMap) {
    console.log(`${String(col).padStart(3)} | ${header1.substring(0, 30).padEnd(30)} | ${header2.substring(0, 30).padEnd(30)} | ${header3.substring(0, 30).padEnd(30)}`);
  }

  // Count data rows (non-null date in column 1)
  let dataRows = 0;
  let firstDate: ExcelJS.CellValue = null;
  let lastDate: ExcelJS.CellValue = null;
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 4) return;
    const val = row.getCell(1).value;
    if (val != null) {
      dataRows++;
      if (!firstDate) firstDate = val;
      lastDate = val;
    }
  });

  console.log(`\n=== Data Summary ===`);
  console.log(`Data rows (with dates): ${dataRows}`);
  console.log(`First date value: ${firstDate}`);
  console.log(`Last date value: ${lastDate}`);
}

main().catch(console.error);
