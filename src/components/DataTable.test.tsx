import assert from 'node:assert';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { format } from 'prettier';
import { DataTable, rowKeys } from './DataTable.tsx';
import { processCSV, spreadDuplicateDates } from '../dataProcessing.ts';
import { defined } from '../testing/assertions.ts';
import { assertSnapshot } from '../testing/snapshot.ts';

const testFilePath = fileURLToPath(import.meta.url);

const duplicateDatesCsv = `date,value
2023-01-01,1
2023-01-02,2
2023-01-02,3
2023-01-03,4`;

const sampleCsv = `date,pct_change,amount,category
2023-01-01,0.15,45.5,High
2023-01-02,-0.8,-99.25,Low
2023-01-03,0.02,0.75,Medium
2023-01-04,1.0,100,High
2023-01-05,-0.33,-5.5,Low
2023-01-06,0.5,0.05,Medium`;

async function renderDataTableToString(): Promise<string> {
  const { formattedData, columns } = processCSV(sampleCsv);
  const element = React.createElement(DataTable, {
    formattedData,
    columns,
    hoveredDate: null,
    onHover: () => {},
  });
  const html = renderToStaticMarkup(element);
  return format(html, { parser: 'html' });
}

test('DataTable renders correctly', async t => {
  const rendered = await renderDataTableToString();
  assertSnapshot(t, rendered, { testFilePath, extension: '.html' });
});

test('DataTable renders correctly with styled columns', async t => {
  const csv = `date,ratio{type: percent\\, places: 2},revenue{type: currency, label: 'Net revenue'}
2023-01-01,0.15,45.5
2023-01-02,-0.8,-99.25`;
  const { formattedData, columns } = processCSV(csv);
  const element = React.createElement(DataTable, {
    formattedData,
    columns,
    hoveredDate: null,
    onHover: () => {},
  });
  const html = renderToStaticMarkup(element);
  const rendered = await format(html, { parser: 'html' });

  assertSnapshot(t, rendered, { testFilePath, extension: '.html' });
});

test('DataTable keys rows that share a date apart from each other', () => {
  const { formattedData } = processCSV(duplicateDatesCsv);
  const keys = rowKeys(formattedData);

  assert.strictEqual(new Set(keys).size, formattedData.length);
});

test('DataTable keys a row the same whether or not duplicate dates are spread', () => {
  const { data, formattedData } = processCSV(duplicateDatesCsv);
  // How the app feeds the table while "spread duplicate dates" is on: the same
  // rows, wearing the dates the spread moved them to.
  const spread = spreadDuplicateDates(data);
  const spreadFormatted = formattedData.map((row, i) => ({
    ...row,
    date: defined(spread[i], 'spread row').date,
  }));

  assert.deepStrictEqual(rowKeys(spreadFormatted), rowKeys(formattedData));
});

test('DataTable renders correctly when date column is not the first column', async t => {
  const csv = `val1,date,val2\n10,2023-01-01,20`;
  const { formattedData, columns } = processCSV(csv);
  const element = React.createElement(DataTable, {
    formattedData,
    columns,
    hoveredDate: null,
    onHover: () => {},
  });
  const html = renderToStaticMarkup(element);
  const rendered = await format(html, { parser: 'html' });

  assertSnapshot(t, rendered, { testFilePath, extension: '.html' });
});
