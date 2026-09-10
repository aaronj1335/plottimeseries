import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  type ColumnStyles,
  type FormattedDataPoint,
  formatColumnName,
  isDateColumn,
  isSeriesColumn,
} from '../dataProcessing.ts';
import { apportionColumnWidths } from '../columnWidths.ts';
import { cellText, EMPTY_VALUE, renderCellValue } from './CellValue.tsx';
import { cssVar } from '../theme.ts';

interface HoverDetailsProps {
  formattedData: FormattedDataPoint[];
  hoveredDate: Date | null;
  columns: string[];
  columnColors: Record<string, string>;
  isolatedSeries: string | null;
  onSelectSeries: (series: string) => void;
  columnStyles?: ColumnStyles;
  onColumnWidths?: (widths: number[] | null) => void;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface Measurement {
  key: string;
  containerWidth: number;
  widths: number[];
}

export const HoverDetails: React.FC<HoverDetailsProps> = ({
  formattedData,
  hoveredDate,
  columns,
  columnColors,
  isolatedSeries,
  onSelectSeries,
  columnStyles = {},
  onColumnWidths,
}) => {
  const currentData = hoveredDate
    ? formattedData.find(d => d.date.getTime() === hoveredDate.getTime())
    : null;

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRowRef = useRef<HTMLTableRowElement>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);

  const widestValues = useMemo(() => {
    const widest: Record<string, string> = {};
    for (const col of columns) widest[col] = EMPTY_VALUE;
    for (const row of formattedData) {
      for (const col of columns) {
        const text = cellText(isDateColumn(col) ? row.formattedDate : row[col]);
        const widestSoFar = widest[col] ?? EMPTY_VALUE;
        if (text.length > widestSoFar.length) widest[col] = text;
      }
    }
    return widest;
  }, [formattedData, columns]);

  const headerLabels = useMemo(
    () => columns.map(col => formatColumnName(col, columnStyles[col])),
    [columns, columnStyles],
  );

  const measureKey = useMemo(
    () => JSON.stringify(columns.map((col, i) => [headerLabels[i], widestValues[col]])),
    [columns, headerLabels, widestValues],
  );

  const columnWidths = measurement?.key === measureKey ? measurement.widths : null;

  useIsomorphicLayoutEffect(() => {
    if (columnWidths) return;
    const container = containerRef.current;
    const headerRow = headerRowRef.current;
    if (!container || !headerRow) return;
    const widths = apportionColumnWidths(
      Array.from(headerRow.cells, cell => cell.getBoundingClientRect().width),
    );
    if (widths.length !== columns.length) return;
    // Measuring rendered geometry is what this effect is for; the
    // `columnWidths` guard above keeps it to one pass per measureKey.
    // eslint-disable-next-line @eslint-react/set-state-in-effect
    setMeasurement({ key: measureKey, containerWidth: container.clientWidth, widths });
  }, [columnWidths, measureKey, columns.length]);

  useEffect(() => {
    onColumnWidths?.(columnWidths);
  }, [columnWidths, onColumnWidths]);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setMeasurement(prev => (prev && prev.containerWidth !== container.clientWidth ? null : prev));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="hover-details"
      style={{
        padding: '1rem',
        background: cssVar('panel'),
        borderBottom: `1px solid ${cssVar('rule')}`,
        overflowX: 'auto',
        color: cssVar('text'),
      }}
    >
      <table
        className="data-table"
        style={{ fontSize: '0.9rem', tableLayout: columnWidths ? 'fixed' : 'auto' }}
      >
        {columnWidths && (
          <colgroup>
            {columns.map((col, i) => (
              <col key={col} style={{ width: `${columnWidths[i]}px` }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr ref={headerRowRef}>
            {columns.map((col, i) => {
              const isDate = isDateColumn(col);
              const isSeries = isSeriesColumn(col, columnStyles);
              return (
                <th
                  key={col}
                  style={{
                    padding: '8px',
                    textAlign: isDate ? 'left' : undefined,
                    cursor: isSeries ? 'pointer' : undefined,
                    opacity: isSeries && isolatedSeries && isolatedSeries !== col ? 0.5 : 1,
                    textDecoration: isSeries && isolatedSeries === col ? 'underline' : 'none',
                    borderBottom: `1px solid ${cssVar('ruleStrong')}`,
                  }}
                  onClick={() => isSeries && onSelectSeries(col)}
                >
                  {headerLabels[i]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {!columnWidths && (
            <tr aria-hidden="true">
              {columns.map((col, i) => (
                <td key={col} style={{ padding: '0 8px', height: 0, border: 0 }}>
                  <div
                    style={{
                      height: 0,
                      overflow: 'hidden',
                      visibility: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div>{headerLabels[i]}</div>
                    <div style={{ fontWeight: 'bold' }}>{widestValues[col]}</div>
                  </div>
                </td>
              ))}
            </tr>
          )}
          <tr>
            {columns.map(col => {
              const isSeries = isSeriesColumn(col, columnStyles);
              return (
                <td key={col} style={{ padding: '4px 8px' }}>
                  {isSeries && (
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: columnColors[col],
                        opacity: isolatedSeries && isolatedSeries !== col ? 0.3 : 1,
                      }}
                    ></div>
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            {columns.map(col => {
              const isDate = isDateColumn(col);
              const isSeries = isSeriesColumn(col, columnStyles);
              const cellValue = isDate ? currentData?.formattedDate : currentData?.[col];
              return (
                <td
                  key={col}
                  style={{
                    padding: '8px',
                    textAlign: isDate ? 'left' : undefined,
                    fontWeight: 'bold',
                    opacity: isSeries && isolatedSeries && isolatedSeries !== col ? 0.5 : 1,
                  }}
                >
                  {renderCellValue(cellValue)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
