import React, { useRef } from 'react';
import { DataPoint } from '../utils/csvParser';
import { NumberFormatter } from '../utils/numberFormatting';
import { formatColumnName } from '../utils/textFormatting';

interface DataTableProps {
  data: DataPoint[];
  columns: string[];
  hoveredDate: Date | null;
  onHover: (date: Date | null) => void;
  formatters: Record<string, NumberFormatter>;
}

export const DataTable: React.FC<DataTableProps> = ({ data, columns, hoveredDate, onHover, formatters }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  // Auto-scroll to highlighted row is tricky without interfering with manual scroll.
  // We'll just highlight for now.

  return (
      <table ref={tableRef} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
        <thead style={{ position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 10 }}>
          <tr>
            <th style={{ position: 'sticky', top: 0, padding: '12px', textAlign: 'left', borderBottom: '1px solid #555' }}>Date</th>
            {columns.map(col => (
              <th key={col} style={{ padding: '12px', borderBottom: '1px solid #555' }}>{formatColumnName(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
             const isHighlighted = hoveredDate && row.date.getTime() === hoveredDate.getTime();
             return (
               <tr 
                 key={i}
                 style={{ backgroundColor: isHighlighted ? '#444' : (i % 2 === 0 ? '#2a2a2a' : '#242424') }}
                 onMouseEnter={() => onHover(row.date)}
               >
                 <td style={{ padding: '8px', textAlign: 'left' }}>{row.date.toISOString().split('T')[0]}</td>
                 {columns.map(col => (
                   <td key={col} style={{ padding: '8px' }}>
                    {formatters[col] ? formatters[col](row[col] as number) : String(row[col])}
                  </td>
                 ))}
               </tr>
             );
          })}
        </tbody>
      </table>
  );
};
