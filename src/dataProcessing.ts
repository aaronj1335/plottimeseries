import * as d3 from 'd3';

export interface DataPoint {
  date: Date;
  [key: string]: Date | number | string;
}

export interface FormattedDataPoint {
  date: Date;
  formattedDate: string;
  [key: string]: string | Date;
}

export type NumberFormatter = (val: number) => string;

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatColumnName(name: string): string {
  if (!name) return name;
  const withSpaces = name.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export function parseCSV(csvString: string): { data: DataPoint[], columns: string[] } {
  const rawData = d3.csvParse(csvString);

  if (rawData.length === 0) return { data: [], columns: [] };

  const columns = rawData.columns.filter(c => c.toLowerCase() !== 'date');

  const data = rawData.map((d) => {
    if (!d.date && !d.Date) return null;
    const date = new Date(d.date || d.Date);
    if (isNaN(date.getTime())) return null;

    const point: DataPoint = { date };
    columns.forEach(col => {
      const rawValue = d[col] || '';
      const numValue = +rawValue;
      point[col] = isNaN(numValue) ? rawValue : numValue;
    });
    return point;
  }).filter((d): d is DataPoint => d !== null);

  return { data, columns };
}

export function analyzeColumnFormatters(data: DataPoint[], columns: string[]): Record<string, NumberFormatter> {
  const formatters: Record<string, NumberFormatter> = {};

  columns.forEach(col => {
    let min = Infinity;
    let max = -Infinity;
    let hasNumbers = false;

    data.forEach(row => {
      const val = row[col];
      if (typeof val === 'number') {
        hasNumbers = true;
        if (val < min) min = val;
        if (val > max) max = val;
      }
    });

    if (!hasNumbers) {
      formatters[col] = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return;
    }

    if (min >= -2 && max <= 2) {
      formatters[col] = (val: number) => val.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } else if (min >= -10 && max <= 10) {
      formatters[col] = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } else {
      formatters[col] = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
  });

  return formatters;
}

export function processCSV(csvString: string): { data: DataPoint[], formattedData: FormattedDataPoint[], columns: string[] } {
  const { data, columns } = parseCSV(csvString);
  
  if (data.length === 0) {
    return { data: [], formattedData: [], columns: [] };
  }

  const formatters = analyzeColumnFormatters(data, columns);

  const formattedData = data.map(row => {
    const formatted: FormattedDataPoint = {
      date: row.date,
      formattedDate: formatDate(row.date),
    };
    columns.forEach(col => {
      const val = row[col];
      if (typeof val === 'number' && formatters[col]) {
        formatted[col] = formatters[col](val);
      } else {
        formatted[col] = String(val);
      }
    });
    return formatted;
  });

  return { data, formattedData, columns };
}
