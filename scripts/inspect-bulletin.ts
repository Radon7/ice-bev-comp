/**
 * One-time script to inspect the EC Oil Bulletin XLSX structure.
 * Downloads the file and dumps header rows + column mapping.
 *
 * Usage: npx tsx scripts/inspect-bulletin.ts
 */
import * as XLSX from 'xlsx';

const EC_OIL_BULLETIN_URL =
  'https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en';

async function main() {
  console.log('Downloading EC Oil Bulletin...');
  const res = await fetch(EC_OIL_BULLETIN_URL, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  console.log('\n=== Sheet Names ===');
  console.log(wb.SheetNames.join('\n'));

  const sheetName = 'Prices with taxes';
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`Sheet "${sheetName}" not found!`);
    process.exit(1);
  }

  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });

  console.log(`\n=== Total Rows: ${rows.length} ===`);

  // Dump first 4 rows (headers + first data row)
  console.log('\n=== Header Rows (0-3) ===');
  for (let r = 0; r < Math.min(4, rows.length); r++) {
    const row = rows[r];
    console.log(`\n--- Row ${r} (${row.length} columns) ---`);
    for (let c = 0; c < row.length; c++) {
      if (row[c] != null && String(row[c]).trim() !== '') {
        console.log(`  [${c}] ${row[c]}`);
      }
    }
  }

  // Try to discover the column pattern
  console.log('\n=== Column Discovery ===');
  const headerRow0 = rows[0] || [];
  const headerRow1 = rows[1] || [];
  const headerRow2 = rows[2] || [];

  // Look for country/fuel patterns in headers
  const columnMap: { col: number; header0: string; header1: string; header2: string }[] = [];
  const maxCol = Math.max(headerRow0.length, headerRow1.length, headerRow2.length);

  for (let c = 0; c < maxCol; c++) {
    const h0 = headerRow0[c] != null ? String(headerRow0[c]).trim() : '';
    const h1 = headerRow1[c] != null ? String(headerRow1[c]).trim() : '';
    const h2 = headerRow2[c] != null ? String(headerRow2[c]).trim() : '';
    if (h0 || h1 || h2) {
      columnMap.push({ col: c, header0: h0, header1: h1, header2: h2 });
    }
  }

  console.log('\nAll non-empty header cells:');
  console.log('Col | Row 0 | Row 1 | Row 2');
  console.log('----|-------|-------|------');
  for (const { col, header0, header1, header2 } of columnMap) {
    console.log(`${String(col).padStart(3)} | ${header0.substring(0, 30).padEnd(30)} | ${header1.substring(0, 30).padEnd(30)} | ${header2.substring(0, 30).padEnd(30)}`);
  }

  // Count data rows (non-null date in column 0)
  let dataRows = 0;
  let firstDate: string | number | null = null;
  let lastDate: string | number | null = null;
  for (let i = 3; i < rows.length; i++) {
    if (rows[i][0] != null) {
      dataRows++;
      if (!firstDate) firstDate = rows[i][0];
      lastDate = rows[i][0];
    }
  }
  console.log(`\n=== Data Summary ===`);
  console.log(`Data rows (with dates): ${dataRows}`);
  console.log(`First date value: ${firstDate}`);
  console.log(`Last date value: ${lastDate}`);

  // Specifically check columns 128-129 (Italy)
  console.log(`\n=== Italy Columns (128-129) ===`);
  for (let r = 0; r < 3; r++) {
    console.log(`Row ${r}: [128]="${rows[r]?.[128]}" [129]="${rows[r]?.[129]}"`);
  }
}

main().catch(console.error);
