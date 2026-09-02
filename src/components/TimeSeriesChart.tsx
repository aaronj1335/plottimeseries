import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { DataPoint, formatDate } from '../dataProcessing';
import { ChartOptions } from '../chartOptions';

const CLIP_ID = 'plot-area-clip';
const GRID_ID = 'plot-micro-grid';
const GLOW_ID = 'series-glow';
const PLOT_BG_ID = 'plot-bg';
const AREA_ID = 'area-grad';

/** Length of the arms on the brackets drawn at the corners of the plot area. */
const CORNER_ARM = 11;

/**
 * Long enough to read as a deliberate movement, short enough that a reader
 * flipping between series is never waiting on the chart.
 */
const MORPH_MS = 620;
const DRAW_MS = 900;
/** The cursor has to feel welded to the pointer, so this is nearly instant. */
const CURSOR_MS = 90;

interface TimeSeriesChartProps {
  data: DataPoint[];
  /** Columns that become lines, already filtered and in legend order. */
  plottedColumns: string[];
  hoveredDate: Date | null;
  onHover: (date: Date | null) => void;
  isolatedSeries: string | null;
  isSticky: boolean;
  onToggleSticky: () => void;
  spreadDates: boolean;
  onToggleSpreadDates: () => void;
  columnColors: Record<string, string>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  chartOptions?: ChartOptions;
}

/** Scales and geometry from the last full draw, so the cursor can reuse them. */
interface PlotFrame {
  x: d3.ScaleTime<number, number>;
  y: d3.ScaleLinear<number, number>;
  innerWidth: number;
  innerHeight: number;
  visibleColumns: string[];
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Axis labels want to be scannable, not exact -- the exact value is one hover
 * away in the readout. So large magnitudes get an SI suffix (`820k`, `1.2M`)
 * instead of a nine-character comma-grouped number that crowds the plot.
 */
function formatTick(value: d3.NumberValue): string {
  const n = Number(value);
  if (n === 0) return '0';
  return Math.abs(n) >= 1000 ? d3.format('~s')(n) : d3.format('~f')(n);
}

function formatCount(n: number): string {
  return d3.format(',')(n);
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  plottedColumns,
  hoveredDate,
  onHover,
  isolatedSeries,
  isSticky,
  onToggleSticky,
  spreadDates,
  onToggleSpreadDates,
  columnColors,
  onFileUpload,
  chartOptions = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<PlotFrame | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Bumped after every full draw so the cursor effect re-runs against the new
  // scales without having to depend on -- and so re-run the transitions of --
  // everything the draw depends on.
  const [frameVersion, setFrameVersion] = useState(0);

  const dateExtent = useMemo(() => d3.extent(data, d => d.date), [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Full draw: background, scales, axes, series. Deliberately does *not* depend
  // on `hoveredDate` -- moving the mouse must not restart a 600ms transition.
  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);

    const width = dimensions.width;
    const height = dimensions.height;
    if (width === 0 || height === 0) return;

    const margin = { top: 18, right: 24, bottom: 28, left: 64 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) return;

    const reduceMotion = prefersReducedMotion();

    // 1. Structure (idempotent). The order of these appends is the paint order:
    // ground, grid, axes, series, then everything the cursor drives.
    let g = svg.select<SVGGElement>('g.main-group');
    if (g.empty()) {
      const defs = svg.append('defs');

      defs.append('clipPath').attr('id', CLIP_ID).append('rect');

      // Engineering paper inside the plot: a 12px cross-hatch, faint enough to
      // read as texture rather than as gridlines competing with the real ones.
      const pattern = defs.append('pattern')
        .attr('id', GRID_ID)
        .attr('width', 12).attr('height', 12)
        .attr('patternUnits', 'userSpaceOnUse');
      pattern.append('path')
        .attr('d', 'M12 0 H0 V12')
        .attr('fill', 'none')
        .attr('stroke', 'rgba(148,163,184,0.07)')
        .attr('stroke-width', 0.5);

      // A pool of light under the data, so the panel has a centre.
      const bgGradient = defs.append('radialGradient')
        .attr('id', PLOT_BG_ID)
        .attr('cx', '50%').attr('cy', '0%').attr('r', '110%');
      bgGradient.append('stop').attr('offset', '0%').attr('stop-color', '#151b27');
      bgGradient.append('stop').attr('offset', '55%').attr('stop-color', '#0c0f16');
      bgGradient.append('stop').attr('offset', '100%').attr('stop-color', '#07090d');

      // Fill under an isolated series. Its stops are recoloured per selection.
      const areaGradient = defs.append('linearGradient')
        .attr('id', AREA_ID)
        .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
      areaGradient.append('stop').attr('class', 'area-stop-top').attr('offset', '0%');
      areaGradient.append('stop').attr('class', 'area-stop-bottom').attr('offset', '100%');

      // Bloom. Applied once to the whole series group rather than per path, so
      // eleven lines cost one filter pass; SourceGraphic is merged back on top
      // so the lines themselves stay hairline-crisp over their own halo.
      const filter = defs.append('filter')
        .attr('id', GLOW_ID)
        .attr('x', '-10%').attr('y', '-10%')
        .attr('width', '120%').attr('height', '120%');
      filter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 1.6).attr('result', 'blurred');
      filter.append('feComponentTransfer').attr('in', 'blurred').attr('result', 'dimmed')
        .append('feFuncA').attr('type', 'linear').attr('slope', 0.42);
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'dimmed');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');

      g = svg.append('g').attr('class', 'main-group');

      g.append('rect').attr('class', 'plot-bg').attr('fill', `url(#${PLOT_BG_ID})`);
      g.append('rect').attr('class', 'plot-grid').attr('fill', `url(#${GRID_ID})`);
      g.append('g').attr('class', 'grid-h');
      g.append('line').attr('class', 'zero-rule').style('opacity', 0);
      g.append('g').attr('class', 'axis axis-x');
      g.append('g').attr('class', 'axis axis-y');
      g.append('g').attr('class', 'frame');
      g.append('g').attr('class', 'lines-group')
        .attr('clip-path', `url(#${CLIP_ID})`)
        .attr('filter', `url(#${GLOW_ID})`)
        .append('path').attr('class', 'area-fill').attr('fill', `url(#${AREA_ID})`).style('opacity', 0);
      g.append('g').attr('class', 'focus-group').attr('clip-path', `url(#${CLIP_ID})`);
      g.append('line').attr('class', 'cursor-rule').style('opacity', 0);
      g.append('g').attr('class', 'cursor-label-group').style('opacity', 0);
      g.append('rect').attr('class', 'hover-overlay').attr('fill', 'transparent');

      const labelGroup = g.select('.cursor-label-group');
      labelGroup.append('rect').attr('class', 'cursor-label-bg').attr('rx', 3).attr('height', 16);
      labelGroup.append('text').attr('class', 'cursor-label').attr('text-anchor', 'middle').attr('dy', '0.72em');
    }

    svg.attr('width', width).attr('height', height);
    g.attr('transform', `translate(${margin.left},${margin.top})`);

    g.select('.plot-bg').attr('width', innerWidth).attr('height', innerHeight);
    g.select('.plot-grid').attr('width', innerWidth).attr('height', innerHeight);
    g.select<SVGGElement>('.axis-x').attr('transform', `translate(0,${innerHeight})`);
    g.select<SVGGElement>('.hover-overlay').attr('width', innerWidth).attr('height', innerHeight);
    svg.select(`#${CLIP_ID} rect`)
      .attr('x', 0).attr('y', 0).attr('width', innerWidth).attr('height', innerHeight);

    // 2. Scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    let yMax = 0;
    let yMin = 0;
    if (isolatedSeries) {
      yMax = d3.max(data, d => d[isolatedSeries as string] as number) || 0;
      yMin = d3.min(data, d => d[isolatedSeries as string] as number) || 0;
    } else {
      yMax = d3.max(data, d => Math.max(...plottedColumns.map(c => d[c] as number))) || 0;
      yMin = d3.min(data, d => Math.min(...plottedColumns.map(c => d[c] as number))) || 0;
    }
    if (yMin > 0) {
      yMin = 0;
    }

    // Explicit chart settings win over the data-derived domain.
    if (chartOptions.yMax != null) yMax = chartOptions.yMax;
    if (chartOptions.yMin != null) yMin = chartOptions.yMin;

    const y = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    // 3. Transitions
    const t = svg.transition()
      .duration(reduceMotion ? 0 : MORPH_MS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .ease(d3.easeCubicOut) as unknown as d3.Transition<any, any, any, any>;

    const yTicks = Math.max(3, Math.min(8, Math.floor(innerHeight / 46)));
    const xTicks = Math.max(2, Math.floor(innerWidth / 120));

    // Horizontal grid
    g.select<SVGGElement>('.grid-h')
      .transition(t)
      .call(d3.axisLeft(y).ticks(yTicks).tickSize(-innerWidth).tickFormat(() => ''))
      .call(g => g.select('.domain').remove());

    // Axes
    g.select<SVGGElement>('.axis-x')
      .transition(t)
      .call(d3.axisBottom(x).ticks(xTicks).tickSizeOuter(0).tickPadding(8));
    g.select<SVGGElement>('.axis-y')
      .transition(t)
      .call(d3.axisLeft(y).ticks(yTicks).tickSizeOuter(0).tickPadding(8).tickFormat(formatTick));

    // The baseline gets its own weight: on a chart that mixes signs, zero is
    // the one gridline that means something.
    const zeroRule = g.select<SVGLineElement>('.zero-rule');
    if (yMin < 0 && yMax > 0) {
      zeroRule.attr('x1', 0).attr('x2', innerWidth)
        .transition(t)
        .attr('y1', y(0)).attr('y2', y(0))
        .style('opacity', 1);
    } else {
      zeroRule.transition(t).style('opacity', 0);
    }

    // Corner brackets -- the frame of an instrument rather than a box around a
    // picture, so only the corners are drawn.
    const corners: string[] = [
      `M0,${CORNER_ARM} V0 H${CORNER_ARM}`,
      `M${innerWidth - CORNER_ARM},0 H${innerWidth} V${CORNER_ARM}`,
      `M${innerWidth},${innerHeight - CORNER_ARM} V${innerHeight} H${innerWidth - CORNER_ARM}`,
      `M${CORNER_ARM},${innerHeight} H0 V${innerHeight - CORNER_ARM}`,
    ];
    g.select('.frame').selectAll<SVGPathElement, string>('path.frame-corner')
      .data(corners)
      .join(enter => enter.append('path').attr('class', 'frame-corner'))
      .attr('d', d => d);

    // 4. Series
    const lineGenerator = d3.line<DataPoint>().x(d => x(d.date));
    const baseline = Math.min(Math.max(0, yMin), yMax);
    const zeroLineGenerator = d3.line<DataPoint>().x(d => x(d.date)).y(y(baseline));

    const pathFor = (col: string): string => {
      if (isolatedSeries && isolatedSeries !== col) return zeroLineGenerator(data) || '';
      return lineGenerator.y(d => y(d[col] as number))(data) || '';
    };

    const linesGroup = g.select('.lines-group');

    // Area under the isolated series. Only one series can be isolated, so one
    // gradient is recoloured rather than one being kept per column.
    const areaPath = linesGroup.select<SVGPathElement>('.area-fill');
    if (isolatedSeries && plottedColumns.includes(isolatedSeries)) {
      const color = columnColors[isolatedSeries];
      svg.select(`#${AREA_ID} .area-stop-top`).attr('stop-color', color).attr('stop-opacity', 0.3);
      svg.select(`#${AREA_ID} .area-stop-bottom`).attr('stop-color', color).attr('stop-opacity', 0);
      const area = d3.area<DataPoint>()
        .x(d => x(d.date))
        .y0(y(baseline))
        .y1(d => y(d[isolatedSeries] as number));
      areaPath.transition(t).attr('d', area(data) || '').style('opacity', 1);
    } else {
      areaPath.transition(t).style('opacity', 0);
    }

    const lines = linesGroup.selectAll<SVGPathElement, string>('path.series-line')
      .data(plottedColumns, d => d);

    const entered = lines.enter()
      .append('path')
      .attr('class', 'series-line')
      .attr('fill', 'none')
      .attr('stroke-width', 1.6)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('stroke', col => columnColors[col])
      .attr('d', col => pathFor(col));

    // New series draw themselves on, left to right, staggered by column order.
    // getTotalLength is only meaningful once the path has a `d`, which is why
    // this runs after the attribute above rather than inside the append chain.
    if (!reduceMotion) {
      entered.each(function (_col, i) {
        const length = this.getTotalLength();
        if (!length) return;
        d3.select(this)
          .attr('stroke-dasharray', `${length} ${length}`)
          .attr('stroke-dashoffset', length)
          .transition('draw')
          .duration(DRAW_MS)
          .delay(i * 55)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0)
          .on('end interrupt', function () {
            // Leaving a dasharray behind would break any later `d` transition.
            d3.select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
          });
      });
    }

    entered.merge(lines)
      .transition(t)
      .attr('stroke', col => columnColors[col])
      // Isolating flattens the others onto the baseline; fading them at the
      // same time keeps the selected line unambiguous while they travel.
      .style('opacity', col => (isolatedSeries && isolatedSeries !== col ? 0.12 : 1))
      .attr('d', col => pathFor(col));

    lines.exit().remove();

    // 5. Pointer tracking. The overlay is re-bound here because the handler
    // closes over `data` and the scales.
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

    frameRef.current = {
      x,
      y,
      innerWidth,
      innerHeight,
      visibleColumns: isolatedSeries ? [isolatedSeries] : plottedColumns,
    };
    setFrameVersion(v => v + 1);
  }, [data, plottedColumns, isolatedSeries, columnColors, onHover, dimensions, chartOptions]);

  // Cursor: rule, per-series markers and the date chip. Split out from the draw
  // above so a mousemove touches only these few elements.
  useEffect(() => {
    const frame = frameRef.current;
    if (!svgRef.current || !frame) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('g.main-group');
    if (g.empty()) return;

    const { x, y, innerWidth, innerHeight, visibleColumns } = frame;
    const rule = g.select<SVGLineElement>('.cursor-rule');
    const labelGroup = g.select<SVGGElement>('.cursor-label-group');
    const focusGroup = g.select<SVGGElement>('.focus-group');
    const duration = prefersReducedMotion() ? 0 : CURSOR_MS;

    const xPos = hoveredDate ? x(hoveredDate) : null;

    const xTicks = g.selectAll<SVGGElement, Date>('.axis-x .tick');

    if (hoveredDate == null || xPos == null || xPos < 0 || xPos > innerWidth) {
      rule.style('opacity', 0);
      labelGroup.style('opacity', 0);
      focusGroup.selectAll('*').remove();
      xTicks.selectAll('text').style('opacity', 1);
      return;
    }

    rule
      .attr('y1', 0).attr('y2', innerHeight)
      .style('opacity', 1)
      .transition().duration(duration).ease(d3.easeCubicOut)
      .attr('x1', xPos).attr('x2', xPos);

    // Date chip, pinned to the x axis and kept inside the plot at both ends.
    const label = labelGroup.select<SVGTextElement>('text').text(formatDate(hoveredDate));
    const textWidth = label.node()?.getComputedTextLength() ?? 60;
    const boxWidth = textWidth + 14;
    const clampedX = Math.min(Math.max(xPos, boxWidth / 2), innerWidth - boxWidth / 2);
    labelGroup.select('rect').attr('x', -boxWidth / 2).attr('y', 0).attr('width', boxWidth);
    labelGroup
      .attr('transform', `translate(${clampedX},${innerHeight + 5})`)
      .style('opacity', 1);

    // The chip sits in the axis's own row, so any tick label it would land on
    // steps aside rather than being half-covered by it.
    const chipLeft = clampedX - boxWidth / 2;
    const chipRight = clampedX + boxWidth / 2;
    xTicks.each(function (tick) {
      const tickLabel = d3.select(this).select<SVGTextElement>('text');
      const node = tickLabel.node();
      if (!node) return;
      // Tick labels are centred on the tick, so compare spans rather than
      // points -- otherwise the chip clips the first character of its
      // neighbour instead of replacing the label outright.
      const half = node.getComputedTextLength() / 2 + 5;
      const tickX = x(tick);
      tickLabel.style('opacity', tickX + half > chipLeft && tickX - half < chipRight ? 0 : 1);
    });

    // A marker per visible series, sitting exactly on the datum -- the cursor
    // snaps to real samples, so these never float between points.
    const row = data.find(d => d.date.getTime() === hoveredDate.getTime());

    const points = row
      ? visibleColumns
        .filter(col => typeof row[col] === 'number')
        .map(col => ({ col, value: row[col] as number }))
      : [];

    const dots = focusGroup.selectAll<SVGGElement, { col: string; value: number }>('g.focus')
      .data(points, d => d.col);

    const dotsEnter = dots.enter().append('g').attr('class', 'focus');
    dotsEnter.append('circle').attr('class', 'focus-halo').attr('r', 6).style('opacity', 0);
    dotsEnter.append('circle').attr('class', 'focus-dot').attr('r', 0);

    const merged = dotsEnter.merge(dots);
    merged
      .transition().duration(duration).ease(d3.easeCubicOut)
      .attr('transform', d => `translate(${xPos},${y(d.value)})`);
    merged.select('.focus-halo')
      .attr('stroke', d => columnColors[d.col])
      .transition().duration(160)
      .style('opacity', 0.45);
    merged.select('.focus-dot')
      .attr('fill', d => columnColors[d.col])
      .transition().duration(160).ease(d3.easeCubicOut)
      .attr('r', 3);

    dots.exit().remove();
  }, [hoveredDate, frameVersion, columnColors, data]);

  const dateRange = dateExtent[0] && dateExtent[1]
    ? `${formatDate(dateExtent[0])} → ${formatDate(dateExtent[1])}`
    : '—';

  return (
    <div className="chart-panel">
      <div className="chart-toolbar">
        <span className="brand">
          <span className="brand-dot" />
          Time Series
        </span>
        <span className="readout">
          <span className="readout-item">
            <span className="readout-key">n</span>
            <span className="readout-value">{formatCount(data.length)}</span>
          </span>
          <span className="readout-item">
            <span className="readout-key">series</span>
            <span className="readout-value">
              {isolatedSeries ? `1 / ${plottedColumns.length}` : formatCount(plottedColumns.length)}
            </span>
          </span>
          <span className="readout-item">
            <span className="readout-key">span</span>
            <span className="readout-value">{dateRange}</span>
          </span>
        </span>
        <span className="toolbar-spacer" />
        <span className="toolbar-controls">
          <label className={`toggle${isSticky ? ' toggle--on' : ''}`}>
            <input type="checkbox" checked={isSticky} onChange={onToggleSticky} /> Sticky
          </label>
          <label className={`toggle${spreadDates ? ' toggle--on' : ''}`}>
            <input type="checkbox" checked={spreadDates} onChange={onToggleSpreadDates} /> Spread Dates
          </label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="upload-button"
          >
            Upload CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv"
            onChange={onFileUpload}
          />
        </span>
      </div>
      <div ref={containerRef} className="chart-container">
        <svg ref={svgRef} className="chart-svg"></svg>
      </div>
    </div>
  );
};
