import React, { ReactNode } from 'react';

interface Column {
  header: string;
  accessor: string;
  cell?: (value: any, row: any) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: any) => void;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  columns,
  data,
  emptyMessage = "No data available",
  className = "",
  onRowClick
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      {/* Regular table for non-mobile views */}
      <table className="hidden sm:table min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIdx) => (
            <tr 
              key={rowIdx} 
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column, colIdx) => (
                <td key={colIdx} className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}>
                  {column.cell ? column.cell(row[column.accessor], row) : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Card view for mobile */}
      <div className="sm:hidden space-y-4">
        {data.map((row, rowIdx) => (
          <div 
            key={rowIdx} 
            className={`bg-white p-4 rounded-lg shadow border border-gray-200 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((column, colIdx) => (
              !column.hideOnMobile && (
                <div key={colIdx} className="py-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.header}
                  </div>
                  <div className="mt-1">
                    {column.cell ? column.cell(row[column.accessor], row) : row[column.accessor]}
                  </div>
                </div>
              )
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResponsiveTable;