import { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { processCSV, DataPoint, FormattedDataPoint } from './dataProcessing';
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
          data={data}
          columns={columns}
          hoveredDate={hoveredDate}
          onHover={setHoveredDate}
          isolatedSeries={isolatedSeries}
          isSticky={isSticky}
          onToggleSticky={() => setIsSticky(!isSticky)}
          columnColors={columnColors}
        />
        <HoverDetails
          formattedData={formattedData}
          hoveredDate={hoveredDate}
          columns={columns}
          columnColors={columnColors}
          isolatedSeries={isolatedSeries}
          onSelectSeries={handleSelectSeries}
        />
      </div>
      <DataTable
        formattedData={formattedData}
        columns={columns}
        hoveredDate={hoveredDate}
        onHover={setHoveredDate}
      />
    </div>
  );
}

export default App;
