import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { format } from 'prettier';
import { DataTable } from './DataTable.tsx';
import { parseCSV } from '../utils/csvParser.ts';
import { analyzeColumnFormatters, FormattedDataPoint } from '../utils/numberFormatting.ts';
import { assertSnapshot } from '../testing/snapshot.ts';
import assert from 'node:assert';

const testFilePath = fileURLToPath(import.meta.url);

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

async function renderDataTableToString(): Promise<string> {
  const { formattedData, columns } = prepareFormattedData();
  const element = React.createElement(DataTable, {
    formattedData,
    columns,
    hoveredDate: null,
    onHover: () => { },
  });
  const html = renderToStaticMarkup(element);
  return format(html, { parser: 'html' });
}

test('DataTable renders correctly', async (t) => {
  const rendered = await renderDataTableToString();
  await assertSnapshot(t, rendered, { testFilePath, extension: '.html' });
});

test('Date parsing and formatting', () => {
  const dateString = '2023-01-01';
  const dateObject = new Date(dateString);

  assert.strictEqual(dateObject.toISOString(), '2023-01-01T00:00:00.000Z');
  assert.strictEqual(dateObject.getTimezoneOffset(), 360);
  assert.strictEqual(Intl.DateTimeFormat().resolvedOptions().timeZone, 'America/Chicago');

  assert.strictEqual(dateObject.toLocaleString(), '12/31/2022, 6:00:00 PM');
})