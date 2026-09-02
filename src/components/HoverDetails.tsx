import React from 'react';
import { ColumnStyles, FormattedDataPoint, formatColumnName, isSeriesColumn, LinkData } from '../dataProcessing';

interface HoverDetailsProps {
  formattedData: FormattedDataPoint[];
  hoveredDate: Date | null;
  columns: string[];
  columnColors: Record<string, string>;
  isolatedSeries: string | null;
  onSelectSeries: (series: string) => void;
  columnStyles?: ColumnStyles;
}

/** Shown in place of a value before the pointer has been anywhere. */
const EMPTY = '—';

/**
 * Whether a column has a line in the chart above, and so is worth a swatch and
 * a click target. A colour is only handed out to columns that are plotted, so
 * its presence is the test -- a text column like a category or a link is listed
 * in the table but has nothing to isolate.
 */
function hasSeries(
  col: string,
  columnColors: Record<string, string>,
  columnStyles: ColumnStyles
): boolean {
  return isSeriesColumn(col, columnStyles) && columnColors[col] != null;
}

const renderCellValue = (val: string | Date | LinkData | undefined) => {
  if (val && typeof val === 'object' && 'linkText' in val && 'url' in val) {
    return (
      <a
        href={val.url.toString()}
        target="_blank"
        rel="noopener noreferrer"
        className="cell-link"
      >
        {val.linkText}
      </a>
    );
  }
  return val == null || val === '' ? EMPTY : String(val);
};

export const HoverDetails: React.FC<HoverDetailsProps> = ({
  formattedData,
  hoveredDate,
  columns,
  columnColors,
  isolatedSeries,
  onSelectSeries,
  columnStyles = {},
}) => {
  const currentData = hoveredDate
    ? formattedData.find(d => d.date.getTime() === hoveredDate.getTime())
    : null;

  return (
    <div className="hover-details">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => {
              const isDate = col.toLowerCase() === 'date';
              const isSeries = hasSeries(col, columnColors, columnStyles);
              const muted = isSeries && isolatedSeries != null && isolatedSeries !== col;
              const classes = [
                'col-header',
                isDate ? 'col--date' : '',
                isSeries ? 'col-header--series' : '',
                muted ? 'col-header--muted' : '',
                isolatedSeries === col ? 'col-header--isolated' : '',
              ].filter(Boolean).join(' ');
              return (
                <th
                  key={col}
                  className={classes}
                  onClick={() => isSeries && onSelectSeries(col)}
                >
                  {formatColumnName(col, columnStyles[col])}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {/* Colour key. Doubles as the isolate control alongside the header. */}
          <tr>
            {columns.map(col => {
              const isSeries = hasSeries(col, columnColors, columnStyles);
              const muted = isolatedSeries != null && isolatedSeries !== col;
              const isolated = isolatedSeries === col;
              return (
                <td key={col} className="swatch-cell">
                  {isSeries && (
                    <div
                      className={`swatch${muted ? ' swatch--muted' : ''}${isolated ? ' swatch--isolated' : ''}`}
                      style={{
                        backgroundColor: columnColors[col],
                        // The isolated series glows in its own colour, matching
                        // the bloom on its line in the plot above.
                        boxShadow: isolated ? `0 0 10px -1px ${columnColors[col]}` : undefined,
                      }}
                    ></div>
                  )}
                </td>
              );
            })}
          </tr>
          {/* Values at the cursor. */}
          <tr>
            {columns.map(col => {
              const isDate = col.toLowerCase() === 'date';
              const isSeries = hasSeries(col, columnColors, columnStyles);
              const cellValue = isDate ? currentData?.formattedDate : currentData?.[col];
              const muted = isSeries && isolatedSeries != null && isolatedSeries !== col;
              const classes = [
                'value-cell',
                isDate ? 'value-cell--date col--date' : '',
                muted ? 'value-cell--muted' : '',
                cellValue == null ? 'value-cell--empty' : '',
              ].filter(Boolean).join(' ');
              return (
                <td key={col} className={classes}>
                  {renderCellValue(cellValue as string | LinkData | undefined)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
