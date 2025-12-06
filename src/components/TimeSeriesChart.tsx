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

    const width = container.clientWidth;
    const height = Math.max(300, Math.min(700, window.innerHeight * 0.66));
    const margin = { top: 20, right: 30, bottom: 30, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 1. Setup Groups (Idempotent)
    let g = svg.select<SVGGElement>('g.main-group');
    if (g.empty()) {
      svg.attr('width', width).attr('height', height);
      g = svg.append('g').attr('class', 'main-group')
             .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Order matters for layering
      g.append('g').attr('class', 'grid-h').style('opacity', 0.2);
      g.append('g').attr('class', 'axis-x').attr('transform', `translate(0,${innerHeight})`);
      g.append('g').attr('class', 'axis-y');
      g.append('g').attr('class', 'lines-group');
      g.append('line').attr('class', 'cursor-rule')
        .attr('stroke', 'white').attr('stroke-width', 1).attr('stroke-dasharray', '4 4').style('opacity', 0);
      g.append('rect').attr('class', 'hover-overlay')
        .attr('width', innerWidth).attr('height', innerHeight).attr('fill', 'transparent');
    } else {
        // Just update dimensions if needed (simplified: assuming width/height don't change rapidly for now)
        // ideally we'd update attributes here too
    }

    // 2. Scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    // Calculate Y domain based on isolation
    let yMax = 0;
    if (isolatedSeries) {
        yMax = d3.max(data, d => d[isolatedSeries as string] as number) || 0;
    } else {
        yMax = d3.max(data, d => Math.max(...columns.map(c => d[c] as number))) || 0;
    }

    const y = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0]);

    // 3. Transitions
    const t = svg.transition().duration(750) as unknown as d3.Transition<any, any, any, any>;

    // Horizontal Grid
    g.select<SVGGElement>('.grid-h')
      .transition(t)
      .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(() => ''))
      .call(g => g.select('.domain').remove())
      .selectAll('line').attr('stroke', '#fff');

    // Axes
    g.select<SVGGElement>('.axis-x').call(d3.axisBottom(x)); // X usually static unless data changes time range
    g.select<SVGGElement>('.axis-y').transition(t).call(d3.axisLeft(y));

    // 4. Lines
    const lineGenerator = d3.line<DataPoint>().x(d => x(d.date));
    
    // Line for dropping to zero
    const zeroLineGenerator = d3.line<DataPoint>().x(d => x(d.date)).y(y(0));

    const linesGroup = g.select('.lines-group');
    const lines = linesGroup.selectAll<SVGPathElement, string>('path.series-line')
      .data(columns, d => d);

    // Enter
    lines.enter()
      .append('path')
      .attr('class', 'series-line')
      .attr('fill', 'none')
      .attr('stroke-width', 1.5)
      .attr('stroke', col => columnColors[col])
      .attr('d', col => {
          // Start from zero line
          return zeroLineGenerator(data) || '';
      })
      .merge(lines) // Update + Enter
      .transition(t)
      .attr('stroke', col => columnColors[col]) // Ensure color updates if needed
      .attr('d', col => {
        if (isolatedSeries && isolatedSeries !== col) {
           return zeroLineGenerator(data) || '';
        }
        // Active line
        return lineGenerator.y(d => y(d[col] as number))(data) || '';
      });

    // Exit
    lines.exit().remove();

    // 5. Interactions (Cursor & Overlay)
    // Update overlay handlers to use fresh closure variables (data, scales)
    g.select('.hover-overlay')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const index = d3.bisector((d: DataPoint) => d.date).left(data, date);
        const d0 = data[index - 1];
        const d1 = data[index];
        let d = d0;
        if (d1 && d0) {
           d = (date.getTime() - d0.date.getTime() > d1.date.getTime() - date.getTime()) ? d1 : d0;
        } else if (d1) {
            d = d1;
        }
        if (d) onHover(d.date);
      });

    const rule = g.select('.cursor-rule');
    if (hoveredDate) {
       const xPos = x(hoveredDate);
       if (xPos >= 0 && xPos <= innerWidth) {
           rule
             .attr('x1', xPos).attr('x2', xPos)
             .attr('y1', 0).attr('y2', innerHeight)
             .style('opacity', 1);
       } else {
           rule.style('opacity', 0);
       }
    } else {
       rule.style('opacity', 0);
    }

  }, [data, columns, isolatedSeries, columnColors, hoveredDate, onHover]);

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
