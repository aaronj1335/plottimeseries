import React from 'react';
import { FormattedDataPoint, formatColumnName } from '../dataProcessing';

interface HoverDetailsProps {
  formattedData: FormattedDataPoint[];
  hoveredDate: Date | null;
  columns: string[];
  columnColors: Record<string, string>;
  isolatedSeries: string | null;
  onSelectSeries: (series: string) => void;
}

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
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #555' }}>Date</th>
            {columns.map(col => (
              <th 
                key={col} 
                style={{ 
                  padding: '8px', 
                  cursor: 'pointer',
                  opacity: isolatedSeries && isolatedSeries !== col ? 0.5 : 1,
                  textDecoration: isolatedSeries === col ? 'underline' : 'none',
                  borderBottom: '1px solid #555'
                }}
                onClick={() => onSelectSeries(col)}
              >
                {formatColumnName(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Row of Colors */}
          <tr>
            <td style={{ padding: '4px 8px' }}></td>
            {columns.map(col => (
              <td 
                key={col} 
                style={{ padding: '4px 8px' }}
              >
                <div style={{ 
                  width: '100%', 
                  height: '6px', 
                  backgroundColor: columnColors[col], 
                  opacity: isolatedSeries && isolatedSeries !== col ? 0.3 : 1
                }}></div>
              </td>
            ))}
          </tr>
          {/* Row of Values */}
          <tr>
            <td style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>
               {currentData ? currentData.formattedDate : '-'}
            </td>
            {columns.map(col => (
              <td 
                key={col} 
                style={{ 
                  padding: '8px', 
                  fontWeight: 'bold',
                  opacity: isolatedSeries && isolatedSeries !== col ? 0.5 : 1
                }}
              >
                {currentData ? (currentData[col] as string) : '-'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
