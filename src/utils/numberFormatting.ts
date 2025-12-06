import { DataPoint } from './csvParser';

export type NumberFormatter = (val: number) => string;

export interface FormattedDataPoint {
  date: Date;
  [key: string]: string | Date;
}

export function analyzeColumnFormatters(data: DataPoint[], columns: string[]): Record<string, NumberFormatter> {
  const formatters: Record<string, NumberFormatter> = {};

  columns.forEach(col => {
    // 1. Gather stats (min/max)
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
      // Default fallback for empty columns or non-numbers
      formatters[col] = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return;
    }

    // 2. Determine format based on range
    if (min >= -2 && max <= 2) {
      // Range [-2, 2]: Format as percentage
      formatters[col] = (val: number) => val.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } else if (min >= -10 && max <= 10) {
      // Range [-10, 10]: Format as decimal with 1 place
      formatters[col] = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } else {
      // Outside [-10, 10]: Format as integer
      formatters[col] = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
  });

  return formatters;
}
