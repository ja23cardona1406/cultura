import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

type TimeRangeOption = {
  label: string;
  getValue: () => { startDate: Date; endDate: Date };
};

type TimeRangeSelectorProps = {
  value: { startDate: Date; endDate: Date };
  onChange: (range: { startDate: Date; endDate: Date }) => void;
};

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentMonth = new Date();
  
  const options: TimeRangeOption[] = [
    {
      label: 'Este mes',
      getValue: () => ({
        startDate: startOfMonth(currentMonth),
        endDate: endOfMonth(currentMonth)
      })
    },
    {
      label: 'Último mes',
      getValue: () => {
        const lastMonth = subMonths(currentMonth, 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth)
        };
      }
    },
    {
      label: 'Últimos 3 meses',
      getValue: () => ({
        startDate: startOfMonth(subMonths(currentMonth, 2)),
        endDate: endOfMonth(currentMonth)
      })
    },
    {
      label: 'Últimos 6 meses',
      getValue: () => ({
        startDate: startOfMonth(subMonths(currentMonth, 5)),
        endDate: endOfMonth(currentMonth)
      })
    },
    {
      label: 'Este año',
      getValue: () => ({
        startDate: new Date(currentMonth.getFullYear(), 0, 1),
        endDate: new Date(currentMonth.getFullYear(), 11, 31)
      })
    },
    {
      label: 'Año pasado',
      getValue: () => ({
        startDate: new Date(currentMonth.getFullYear() - 1, 0, 1),
        endDate: new Date(currentMonth.getFullYear() - 1, 11, 31)
      })
    }
  ];

  const getCurrentRangeLabel = () => {
    // Try to find a matching predefined option
    const matchedOption = options.find(option => {
      const range = option.getValue();
      return (
        range.startDate.toISOString().split('T')[0] === value.startDate.toISOString().split('T')[0] &&
        range.endDate.toISOString().split('T')[0] === value.endDate.toISOString().split('T')[0]
      );
    });
    
    if (matchedOption) {
      return matchedOption.label;
    }
    
    // Custom range
    return `${format(value.startDate, 'dd MMM yyyy', { locale: es })} - ${format(value.endDate, 'dd MMM yyyy', { locale: es })}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
      >
        <Calendar size={18} />
        <span>{getCurrentRangeLabel()}</span>
        <ChevronDown size={16} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-md bg-white shadow-lg z-10 ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={index}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => {
                  onChange(option.getValue());
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1"></div>
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-gray-500 mb-2">Rango personalizado</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  onClick={() => {
                    onChange({
                      startDate: subMonths(value.startDate, 1),
                      endDate: value.endDate
                    });
                  }}
                >
                  -1 Mes
                </button>
                <button 
                  className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  onClick={() => {
                    onChange({
                      startDate: value.startDate,
                      endDate: addMonths(value.endDate, 1)
                    });
                  }}
                >
                  +1 Mes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}