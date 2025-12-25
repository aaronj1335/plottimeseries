import React, { useRef } from 'react';
import { FormattedDataPoint, formatColumnName } from '../dataProcessing';

interface DataTableProps {
  formattedData: FormattedDataPoint[];
  columns: string[];
  hoveredDate: Date | null;
  onHover: (date: Date | null) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ formattedData, columns, hoveredDate, onHover }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
      <table ref={tableRef} className="data-table">
        <thead style={{ position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 10 }}>
          <tr>
            <th style={{ position: 'sticky', top: 0, padding: '12px', textAlign: 'left', borderBottom: '1px solid #555' }}>Date</th>
            {columns.map(col => (
              <th key={col} style={{ padding: '12px', borderBottom: '1px solid #555' }}>{formatColumnName(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {formattedData.map((row, i) => {
             const isHighlighted = hoveredDate && row.date.getTime() === hoveredDate.getTime();
             return (
               <tr
                 key={i}
                 style={{ backgroundColor: isHighlighted ? '#444' : (i % 2 === 0 ? '#2a2a2a' : '#242424') }}
                 onMouseEnter={() => onHover(row.date)}
               >
                 <td style={{ padding: '8px', textAlign: 'left' }}>{row.formattedDate}</td>
                 {columns.map(col => (
                   <td key={col} style={{ padding: '8px' }}>
                    {row[col] as string}
                  </td>
                 ))}
               </tr>
             );
          })}
        </tbody>
      </table>
  );
};
