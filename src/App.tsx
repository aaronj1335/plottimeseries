import { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { processCSV, spreadDuplicateDates, ColumnStyles, DataPoint, FormattedDataPoint, isSeriesColumn } from './dataProcessing';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { HoverDetails } from './components/HoverDetails';
import { DataTable } from './components/DataTable';
import { getCSVData } from './data';
import { ChartOptions, getChartOptions } from './chartOptions';
import { SERIES_PALETTE } from './palette';

declare global {
  interface Window {
    __INITIAL_CSV__?: string;
    __CHART_OPTIONS__?: ChartOptions;
  }
}

function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [formattedData, setFormattedData] = useState<FormattedDataPoint[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnStyles, setColumnStyles] = useState<ColumnStyles>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartOptions = useMemo(() => getChartOptions(window), []);

  // Interaction State
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [isolatedSeries, setIsolatedSeries] = useState<string | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [spreadDates, setSpreadDates] = useState(true);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const csvString = await getCSVData(window, async () => {
          const response = await fetch('/data.csv');
          if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
          return response.text();
        });

        const result = processCSV(csvString);
        setData(result.data);
        setFormattedData(result.formattedData);
        setColumns(result.columns);
        setColumnStyles(result.columnStyles);

      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Apply date spreading
  const displayData = useMemo(() => {
    if (!spreadDates) return data;
    return spreadDuplicateDates(data);
  }, [data, spreadDates]);

  const displayFormattedData = useMemo(() => {
    if (!spreadDates) return formattedData;
    return formattedData.map((fd, i) => ({ ...fd, date: displayData[i].date }));
  }, [formattedData, displayData, spreadDates]);

  // The columns that actually become lines: everything that isn't the date,
  // isn't opted out with `plot: false`, and holds at least one number. Text
  // columns like a category or a link ride along in the tables but have no
  // series, so they get neither a colour nor a swatch.
  const plottedColumns = useMemo(() => {
    return columns.filter(col =>
      isSeriesColumn(col, columnStyles) && displayData.some(row => typeof row[col] === 'number')
    );
  }, [columns, columnStyles, displayData]);

  // Generate Colors
  const columnColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const colorScale = d3.scaleOrdinal(SERIES_PALETTE);
    plottedColumns.forEach(col => {
      // Always advance the scale so styling one column does not recolor the rest.
      const generated = colorScale(col);
      colors[col] = columnStyles[col]?.color ?? generated;
    });
    return colors;
  }, [plottedColumns, columnStyles]);

  // Handlers
  const handleSelectSeries = (series: string) => {
    setIsolatedSeries(prev => prev === series ? null : series);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const csvString = await file.text();
      const result = processCSV(csvString);

      if (result.data.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      setData(result.data);
      setFormattedData(result.formattedData);
      setColumns(result.columns);
      setColumnStyles(result.columnStyles);
      setIsolatedSeries(null);
      setHoveredDate(null);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="status-message status-message--loading">Loading</div>;
  if (error) return <div className="status-message status-message--error">Error: {error}</div>;

  return (
    <div className="App app-shell">
      <div className={`chart-dock${isSticky ? ' chart-dock--sticky' : ''}`}>
        <TimeSeriesChart
          data={displayData}
          plottedColumns={plottedColumns}
          hoveredDate={hoveredDate}
          onHover={setHoveredDate}
          isolatedSeries={isolatedSeries}
          isSticky={isSticky}
          onToggleSticky={() => setIsSticky(!isSticky)}
          spreadDates={spreadDates}
          onToggleSpreadDates={() => setSpreadDates(!spreadDates)}
          columnColors={columnColors}
          onFileUpload={handleFileUpload}
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
        />
      </div>
      <DataTable
        formattedData={displayFormattedData}
        columns={columns}
        hoveredDate={hoveredDate}
        onHover={setHoveredDate}
        columnStyles={columnStyles}
      />
    </div>
  );
}

export default App;
