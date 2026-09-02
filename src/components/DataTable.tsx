import React, { useRef } from 'react';
import { ColumnStyles, FormattedDataPoint, formatColumnName, LinkData } from '../dataProcessing';

interface DataTableProps {
  formattedData: FormattedDataPoint[];
  columns: string[];
  hoveredDate: Date | null;
  onHover: (date: Date | null) => void;
  columnStyles?: ColumnStyles;
}

const renderCellValue = (val: string | Date | LinkData) => {
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
  return String(val);
};

export const DataTable: React.FC<DataTableProps> = ({ formattedData, columns, hoveredDate, onHover, columnStyles = {} }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
      <table ref={tableRef} className="data-table">
        <thead>
          <tr>
            {columns.map(col => {
              const isDate = col.toLowerCase() === 'date';
              return (
                <th key={col} className={isDate ? 'col--date' : undefined}>
                  {formatColumnName(col, columnStyles[col])}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {formattedData.map((row, i) => {
             const isHighlighted = hoveredDate && row.date.getTime() === hoveredDate.getTime();
             const classes = [
               i % 2 === 1 ? 'row--odd' : '',
               isHighlighted ? 'row--active' : '',
             ].filter(Boolean).join(' ');
             return (
               <tr
                 key={i}
                 className={classes || undefined}
                 onMouseEnter={() => onHover(row.date)}
               >
                 {columns.map(col => {
                   const isDate = col.toLowerCase() === 'date';
                   const cellValue = isDate ? row.formattedDate : row[col];
                   return (
                     <td key={col} className={isDate ? 'cell--date' : undefined}>
                      {renderCellValue(cellValue as string | LinkData)}
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
