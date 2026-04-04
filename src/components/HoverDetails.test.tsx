import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { format } from 'prettier';
import { HoverDetails } from './HoverDetails.tsx';
import { processCSV } from '../dataProcessing.ts';
import { assertSnapshot } from '../testing/snapshot.ts';

const testFilePath = fileURLToPath(import.meta.url);

const sampleCsv = `date,pct_change,amount,category
2023-01-01,0.15,45.5,High
2023-01-02,-0.8,-99.25,Low`;

const columnColors = {
  pct_change: 'red',
  amount: 'green',
  category: 'blue',
};

test('HoverDetails renders correctly without hovered date', async (t) => {
  const { formattedData, columns } = processCSV(sampleCsv);
  const element = React.createElement(HoverDetails, {
    formattedData,
    hoveredDate: null,
    columns,
    columnColors,
    isolatedSeries: null,
    onSelectSeries: () => { },
  });
  const html = renderToStaticMarkup(element);
  const rendered = await format(html, { parser: 'html' });

  await assertSnapshot(t, rendered, { testFilePath, extension: '.html' });
});

test('HoverDetails renders correctly with hovered date', async (t) => {
  const { formattedData, columns } = processCSV(sampleCsv);
  const element = React.createElement(HoverDetails, {
    formattedData,
    hoveredDate: formattedData[0].date,
    columns,
    columnColors,
    isolatedSeries: null,
    onSelectSeries: () => { },
  });
  const html = renderToStaticMarkup(element);
  const rendered = await format(html, { parser: 'html' });

  await assertSnapshot(t, rendered, { testFilePath, extension: '.html' });
});

test('HoverDetails renders correctly when date column is not the first column', async (t) => {
  const csv = `val1,date,val2\n10,2023-01-01,20`;
  const { formattedData, columns } = processCSV(csv);
  const element = React.createElement(HoverDetails, {
    formattedData,
    hoveredDate: formattedData[0].date,
    columns,
    columnColors: { val1: 'red', val2: 'blue' },
    isolatedSeries: null,
    onSelectSeries: () => { },
  });
  const html = renderToStaticMarkup(element);
  const rendered = await format(html, { parser: 'html' });

  await assertSnapshot(t, rendered, { testFilePath, extension: '.html' });
});
