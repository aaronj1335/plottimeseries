import React, { useRef } from 'react';
import { isDateColumn, type FormattedDataPoint } from '../dataProcessing.ts';
import { renderCellValue } from './CellValue.tsx';
import { cssVar } from '../theme.ts';

/**
 * A row is identified by where it sits in the data rather than by its date. A
 * date is neither unique -- rows may share one -- nor stable, since the
 * "spread duplicate dates" toggle rewrites it. Keyed by date, React cannot pair
 * the rows it had with the rows it is given when the toggle flips, and leaves
 * the ones it loses track of in the table beside the rows it renders fresh.
 */
export function rowKeys(formattedData: FormattedDataPoint[]): string[] {
  return formattedData.map((_, index) => String(index));
}

interface DataTableProps {
  formattedData: FormattedDataPoint[];
  columns: string[];
  hoveredDate: Date | null;
  onHover: (date: Date | null) => void;
  columnWidths?: number[] | null;
}

export const DataTable: React.FC<DataTableProps> = ({
  formattedData,
  columns,
  hoveredDate,
  onHover,
  columnWidths,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const pinnedWidths = columnWidths?.length === columns.length ? columnWidths : null;
  const keys = rowKeys(formattedData);

  return (
    <table
      ref={tableRef}
      className="data-table"
      style={{ tableLayout: pinnedWidths ? 'fixed' : 'auto' }}
    >
      {pinnedWidths && (
        <colgroup>
          {columns.map((col, i) => (
            <col key={col} style={{ width: `${pinnedWidths[i]}px` }} />
          ))}
        </colgroup>
      )}
      <tbody>
        {formattedData.map((row, i) => {
          const isHighlighted = hoveredDate && row.date.getTime() === hoveredDate.getTime();
          return (
            <tr
              key={keys[i]}
              style={{
                backgroundColor: isHighlighted
                  ? cssVar('rowHover')
                  : cssVar(i % 2 === 0 ? 'groundAlt' : 'ground'),
              }}
              onMouseEnter={() => onHover(row.date)}
            >
              {columns.map(col => {
                const isDate = isDateColumn(col);
                return (
                  <td
                    key={col}
                    style={{
                      padding: '8px',
                      textAlign: isDate ? 'left' : undefined,
                    }}
                  >
                    {renderCellValue(isDate ? row.formattedDate : row[col])}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
