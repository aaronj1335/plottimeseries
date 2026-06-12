import { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { processCSV, spreadDuplicateDates, DataPoint, FormattedDataPoint } from './dataProcessing';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { HoverDetails } from './components/HoverDetails';
import { DataTable } from './components/DataTable';
import { getCSVData } from './data';

declare global {
  interface Window {
    __INITIAL_CSV__?: string;
  }
}

function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [formattedData, setFormattedData] = useState<FormattedDataPoint[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Generate Colors
  const columnColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    columns.forEach(col => {
      colors[col] = colorScale(col);
    });
    return colors;
  }, [columns]);

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
      setIsolatedSeries(null);
      setHoveredDate(null);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="App">
      <div style={{
        position: isSticky ? 'sticky' : 'static',
        top: 0,
        zIndex: 100,
        backgroundColor: '#242424' // Ensure opacity
      }}>
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
        />
        <HoverDetails
          formattedData={displayFormattedData}
          hoveredDate={hoveredDate}
          columns={columns}
          columnColors={columnColors}
          isolatedSeries={isolatedSeries}
          onSelectSeries={handleSelectSeries}
        />
      </div>
      <DataTable
        formattedData={displayFormattedData}
        columns={columns}
        hoveredDate={hoveredDate}
        onHover={setHoveredDate}
      />
    </div>
  );
}

export default App;
