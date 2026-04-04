import React from 'react';
import { FormattedDataPoint, formatColumnName, LinkData } from '../dataProcessing';

interface HoverDetailsProps {
  formattedData: FormattedDataPoint[];
  hoveredDate: Date | null;
  columns: string[];
  columnColors: Record<string, string>;
  isolatedSeries: string | null;
  onSelectSeries: (series: string) => void;
}

const renderCellValue = (val: string | Date | LinkData | undefined) => {
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
  return String(val ?? '-');
};

export const HoverDetails: React.FC<HoverDetailsProps> = ({
  formattedData,
  hoveredDate,
  columns,
  columnColors,
  isolatedSeries,
  onSelectSeries,
}) => {
  const currentData = hoveredDate 
    ? formattedData.find(d => d.date.getTime() === hoveredDate.getTime()) 
    : null;

  return (
    <div style={{ 
      padding: '1rem', 
      background: '#333', 
      borderBottom: '1px solid #444', 
      overflowX: 'auto',
      color: '#ffffff'
    }}>
      <table className="data-table" style={{ fontSize: '0.9rem' }}>
        <thead>
          <tr>
            {columns.map(col => {
              const isDate = col.toLowerCase() === 'date';
              return (
                <th 
                  key={col} 
                  style={{ 
                    padding: '8px', 
                    textAlign: isDate ? 'left' : undefined,
                    cursor: isDate ? undefined : 'pointer',
                    opacity: !isDate && isolatedSeries && isolatedSeries !== col ? 0.5 : 1,
                    textDecoration: !isDate && isolatedSeries === col ? 'underline' : 'none',
                    borderBottom: '1px solid #555'
                  }}
                  onClick={() => !isDate && onSelectSeries(col)}
                >
                  {formatColumnName(col)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {/* Row of Colors */}
          <tr>
            {columns.map(col => {
              const isDate = col.toLowerCase() === 'date';
              return (
                <td 
                  key={col} 
                  style={{ padding: '4px 8px' }}
                >
                  {!isDate && (
                    <div style={{ 
                      width: '100%', 
                      height: '6px', 
                      backgroundColor: columnColors[col], 
                      opacity: isolatedSeries && isolatedSeries !== col ? 0.3 : 1
                    }}></div>
                  )}
                </td>
              );
            })}
          </tr>
          {/* Row of Values */}
          <tr>
            {columns.map(col => {
              const isDate = col.toLowerCase() === 'date';
              const cellValue = isDate ? currentData?.formattedDate : currentData?.[col];
              return (
                <td 
                  key={col} 
                  style={{ 
                    padding: '8px', 
                    textAlign: isDate ? 'left' : undefined,
                    fontWeight: 'bold',
                    opacity: !isDate && isolatedSeries && isolatedSeries !== col ? 0.5 : 1
                  }}
                >
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
