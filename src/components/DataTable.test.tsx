import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { format } from 'prettier';
import { DataTable } from './DataTable.tsx';
import { parseCSV } from '../utils/csvParser.ts';
import { analyzeColumnFormatters, FormattedDataPoint } from '../utils/numberFormatting.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_FILE = path.join(__dirname, '__snapshots__', 'DataTable.golden.html');

// CSV with:
// - date column with date strings
// - pct_change: values between -1 and 1 (will be formatted as percentages)
// - amount: values from -100 to 100, mix of decimals and values between -1 and 1
// - category: string values
const sampleCsv = `date,pct_change,amount,category
2023-01-01,0.15,45.5,High
2023-01-02,-0.8,-99.25,Low
2023-01-03,0.02,0.75,Medium
2023-01-04,1.0,100,High
2023-01-05,-0.33,-5.5,Low
2023-01-06,0.5,0.05,Medium`;

function prepareFormattedData(): { formattedData: FormattedDataPoint[]; columns: string[] } {
  const { data, columns } = parseCSV(sampleCsv);
  const formatters = analyzeColumnFormatters(data, columns);

  const formattedData: FormattedDataPoint[] = data.map(row => {
    const formatted: FormattedDataPoint = {
      date: row.date,
      formattedDate: row.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    columns.forEach(col => {
      const val = row[col];
      if (typeof val === 'number') {
        formatted[col] = formatters[col](val);
      } else {
        formatted[col] = String(val);
      }
    });
    return formatted;
  });

  return { formattedData, columns };
}

function renderDataTableToString(): string {
  const { formattedData, columns } = prepareFormattedData();
  const element = React.createElement(DataTable, {
    formattedData,
    columns,
    hoveredDate: null,
    onHover: () => { },
  });
  return renderToStaticMarkup(element);
}

test('DataTable renders correctly (snapshot test)', async () => {
  const rendered = renderDataTableToString();
  const formatted = await format(rendered, { parser: 'html' });

  if (!fs.existsSync(GOLDEN_FILE)) {
    fs.mkdirSync(path.dirname(GOLDEN_FILE), { recursive: true });
    fs.writeFileSync(GOLDEN_FILE, formatted, 'utf-8');
    console.log(`Golden file created at ${GOLDEN_FILE}. Re-run tests to validate.`);
    return;
  }

  const golden = fs.readFileSync(GOLDEN_FILE, 'utf-8');
  assert.strictEqual(
    formatted,
    golden,
    'DataTable rendered output does not match golden snapshot. ' +
    'If the change is intentional, delete the golden file and re-run tests to regenerate it.'
  );
});
