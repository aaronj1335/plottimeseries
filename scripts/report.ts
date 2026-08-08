import type { ChartOptions } from '../src/chartOptions.ts';

export interface ReportInput {
  template: string;
  js: string;
  css: string;
  csv: string;
  chartOptions: ChartOptions;
}

function inlineJSON(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

export function renderReport({ template, js, css, csv, chartOptions }: ReportInput): string {
  const data =
    `<script>window.__INITIAL_CSV__ = ${inlineJSON(csv)};` +
    `window.__CHART_OPTIONS__ = ${inlineJSON(chartOptions)};</script>`;

  let html = template;
  html = html.replace('<!--PRODUCTION_DATA-->', () => data);
  html = html.replace('<!--PRODUCTION_STYLE-->', () => `<style>${css}</style>`);

  const parts = html.split('<!--PRODUCTION_SCRIPT-->');
  return parts[0] + `<script>${js}</script>` + (parts[1] ?? '');
}
