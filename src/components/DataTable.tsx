import React, { useRef } from 'react';
import { isDateColumn, type FormattedDataPoint } from '../dataProcessing.ts';
import { renderCellValue } from './CellValue.tsx';
import { cssVar } from '../theme.ts';

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
              key={row.date.getTime()}
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
