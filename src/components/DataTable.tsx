import React, { useRef } from 'react';
import { FormattedDataPoint, formatColumnName, LinkData } from '../dataProcessing';

interface DataTableProps {
  formattedData: FormattedDataPoint[];
  columns: string[];
  hoveredDate: Date | null;
  onHover: (date: Date | null) => void;
}

const renderCellValue = (val: string | Date | LinkData) => {
  if (val && typeof val === 'object' && 'linkText' in val && 'url' in val) {
    return (
      <a 
        href={val.url.toString()} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: '#4da6ff', textDecoration: 'none' }}
        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
      >
        {val.linkText}
      </a>
    );
  }
  return String(val);
};

export const DataTable: React.FC<DataTableProps> = ({ formattedData, columns, hoveredDate, onHover }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
      <table ref={tableRef} className="data-table">
        <thead style={{ position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 10 }}>
          <tr>
            {columns.map(col => {
              const isDate = col.toLowerCase() === 'date';
              return (
                <th 
                  key={col} 
                  style={{ 
                    position: isDate ? 'sticky' : undefined,
                    top: isDate ? 0 : undefined,
                    padding: '12px', 
                    textAlign: isDate ? 'left' : undefined,
                    borderBottom: '1px solid #555' 
                  }}
                >
                  {formatColumnName(col)}
                </th>
              );
            })}
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
                 {columns.map(col => {
                   const isDate = col.toLowerCase() === 'date';
                   const cellValue = isDate ? row.formattedDate : row[col];
                   return (
                     <td 
                       key={col} 
                       style={{ 
                         padding: '8px',
                         textAlign: isDate ? 'left' : undefined
                       }}
                     >
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
