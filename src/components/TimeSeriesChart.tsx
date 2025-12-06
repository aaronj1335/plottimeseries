import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { DataPoint } from '../utils/csvParser';

interface TimeSeriesChartProps {
  data: DataPoint[];
  columns: string[];
  hoveredDate: Date | null;
  onHover: (date: Date | null) => void;
  isolatedSeries: string | null;
  isSticky: boolean;
  onToggleSticky: () => void;
  columnColors: Record<string, string>;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  columns,
  hoveredDate,
  onHover,
  isolatedSeries,
  isSticky,
  onToggleSticky,
  columnColors,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter columns if isolated
  const activeColumns = useMemo(() => {
    return isolatedSeries ? [isolatedSeries] : columns;
  }, [columns, isolatedSeries]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = container.clientWidth;
    const height = Math.max(300, Math.min(700, window.innerHeight * 0.66)); // 66vh, clamped 300-700
    const margin = { top: 20, right: 30, bottom: 30, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const globalMax = d3.max(data, d => Math.max(...activeColumns.map(c => d[c] as number))) || 0;
    const y = d3.scaleLinear()
      .domain([0, globalMax])
      .range([innerHeight, 0]);

    // Grid (Horizontal)
    g.append('g')
      .style('opacity', 0.2)
      .call(d3.axisLeft(y)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
      )
      .call(g => g.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', '#fff');

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    g.append('g').call(d3.axisLeft(y));

    // Lines
    activeColumns.forEach(col => {
      const line = d3.line<DataPoint>()
        .x(d => x(d.date))
        .y(d => y(d[col] as number));

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', columnColors[col])
        .attr('stroke-width', 1.5)
        .attr('d', line);
    });

    // Vertical Rule (Cursor)
    const rule = g.append('line')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
      .style('opacity', 0); // Hidden by default

    // Overlay for hover
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        // Find closest data point
        const index = d3.bisector((d: DataPoint) => d.date).left(data, date);
        const d0 = data[index - 1];
        const d1 = data[index];
        let d = d0;
        if (d1 && d0) {
           d = (date.getTime() - d0.date.getTime() > d1.date.getTime() - date.getTime()) ? d1 : d0;
        } else if (d1) {
            d = d1;
        }

        if (d) {
          onHover(d.date);
        }
      });

    // Handle external hover prop (draw rule)
    if (hoveredDate) {
       const xPos = x(hoveredDate);
       // Ensure xPos is within range to avoid drawing outside
       if (xPos >= 0 && xPos <= innerWidth) {
           rule
             .attr('x1', xPos)
             .attr('x2', xPos)
             .attr('y1', 0)
             .attr('y2', innerHeight)
             .style('opacity', 1);
       }
    }

  }, [data, activeColumns, columnColors, hoveredDate, onHover]); // Re-render on these deps

  return (
    <div style={{
      position: 'relative', // Changed from internal stickiness
      zIndex: 90,
      background: '#242424', // Match body bg
      borderBottom: '1px solid #444',
      color: '#ffffff'
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem' }}>
        <label style={{ fontSize: '0.8rem', cursor: 'pointer', color: '#ffffff' }}>
          <input type="checkbox" checked={isSticky} onChange={onToggleSticky} /> Sticky Plot
        </label>
      </div>
      <div ref={containerRef} style={{ width: '100%' }}>
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
};
