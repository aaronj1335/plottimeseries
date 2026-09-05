import { useCallback, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  EMPTY_CSV,
  processCSV,
  spreadDuplicateDates,
  type ProcessedCSV,
} from './dataProcessing.ts';
import { TimeSeriesChart } from './components/TimeSeriesChart.tsx';
import { HoverDetails } from './components/HoverDetails.tsx';
import { DataTable } from './components/DataTable.tsx';
import { getCSVData } from './data.ts';
import { cssVar } from './theme.ts';
import { type ChartOptions, getChartOptions } from './chartOptions.ts';

declare global {
  interface Window {
    __INITIAL_CSV__?: string;
    __CHART_OPTIONS__?: ChartOptions;
  }
}

function App() {
  const [dataset, setDataset] = useState<ProcessedCSV>(EMPTY_CSV);
  const { data, formattedData, columns, columnStyles } = dataset;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartOptions = useMemo(() => getChartOptions(window), []);

  const [columnWidths, setColumnWidths] = useState<number[] | null>(null);

  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [isolatedSeries, setIsolatedSeries] = useState<string | null>(null);
  // Both plot toggles start on: the chart is the point of the page, so it
  // should stay in view while the table scrolls, and rows that share a date
  // should be visible as separate points rather than one hiding the others.
  const [isSticky, setIsSticky] = useState(true);
  const [spreadDates, setSpreadDates] = useState(true);

  const loadCSV = useCallback(async (readCSV: () => Promise<string>) => {
    setLoading(true);
    setError(null);

    try {
      const result = processCSV(await readCSV());
      if (result.data.length === 0) throw new Error('No valid data found in CSV');

      setDataset(result);
      setIsolatedSeries(null);
      setHoveredDate(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reading the page's own CSV is the external system this effect is for;
    // `loadCSV` raises the loading flag before it awaits anything.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCSV(() =>
      getCSVData(window, async () => {
        const response = await fetch('/data.csv');
        if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
        return response.text();
      }),
    );
  }, [loadCSV]);

  const displayData = useMemo(() => {
    if (!spreadDates) return data;
    return spreadDuplicateDates(data);
  }, [data, spreadDates]);

  const displayFormattedData = useMemo(() => {
    if (!spreadDates) return formattedData;
    return formattedData.map((fd, i) => ({ ...fd, date: displayData[i]?.date ?? fd.date }));
  }, [formattedData, displayData, spreadDates]);

  const columnColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    columns.forEach(col => {
      const generated = colorScale(col);
      colors[col] = columnStyles[col]?.color ?? generated;
    });
    return colors;
  }, [columns, columnStyles]);

  const handleSelectSeries = (series: string) => {
    setIsolatedSeries(prev => (prev === series ? null : series));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadCSV(() => file.text());
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="App">
      <div
        style={{
          position: isSticky ? 'sticky' : 'static',
          top: 0,
          zIndex: 100,
          backgroundColor: cssVar('ground'),
        }}
      >
        <TimeSeriesChart
          data={displayData}
          columns={columns}
          hoveredDate={hoveredDate}
          onHover={setHoveredDate}
          isolatedSeries={isolatedSeries}
          isSticky={isSticky}
          onToggleSticky={() => setIsSticky(!isSticky)}
          spreadDates={spreadDates}
          onToggleSpreadDates={() => setSpreadDates(!spreadDates)}
          columnColors={columnColors}
          onFileUpload={handleFileUpload}
          columnStyles={columnStyles}
          chartOptions={chartOptions}
        />
        <HoverDetails
          formattedData={displayFormattedData}
          hoveredDate={hoveredDate}
          columns={columns}
          columnColors={columnColors}
          isolatedSeries={isolatedSeries}
          onSelectSeries={handleSelectSeries}
          columnStyles={columnStyles}
          onColumnWidths={setColumnWidths}
        />
      </div>
      <div className="data-table-container">
        <DataTable
          formattedData={displayFormattedData}
          columns={columns}
          hoveredDate={hoveredDate}
          onHover={setHoveredDate}
          columnWidths={columnWidths}
        />
      </div>
    </div>
  );
}

export default App;
