import * as d3 from 'd3';

export interface DataPoint {
  date: Date;
  [key: string]: Date | number; // Dynamic series keys
}

export function parseCSV(csvString: string): { data: DataPoint[], columns: string[] } {
  // Use d3.csvParse to get raw objects
  const rawData = d3.csvParse(csvString);
  
  if (rawData.length === 0) return { data: [], columns: [] };

  const columns = rawData.columns.filter(c => c !== 'date');

  const data = rawData.map((d) => {
    if (!d.date) return null;
    const date = new Date(d.date);
    if (isNaN(date.getTime())) return null;

    const point: DataPoint = { date };
    columns.forEach(col => {
      point[col] = +(d[col] || 0);
    });
    return point;
  }).filter((d): d is DataPoint => d !== null);

  return { data, columns };
}
