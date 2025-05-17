import React, { useState } from 'react';
import { format, addDays, subDays, isAfter, isBefore, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useIsMobile, useIsTablet } from '../../hooks/useMediaQuery';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  onCancel: () => void;
  onClear: () => void;
}

const getDaysInMonth = (year: number, month: number) => {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  
  const days = [];
  const startDay = startOfMonth.getDay();
  
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  
  for (let i = 1; i <= endOfMonth.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
};

const presets = [
  { label: 'Últimos 7 días', getRange: () => [subDays(new Date(), 6), new Date()] },
  { label: 'Últimos 30 días', getRange: () => [subDays(new Date(), 29), new Date()] },
  { label: 'Este mes', getRange: () => {
    const now = new Date();
    return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)];
  }},
  { label: 'Mes anterior', getRange: () => {
    const now = new Date();
    return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)];
  }},
  { label: 'Hoy', getRange: () => {
    const now = new Date();
    return [now, now];
  }}
];

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  onCancel,
  onClear
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState<'start' | 'end'>(startDate ? 'end' : 'start');
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);
  
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const days = getDaysInMonth(year, month);
  const nextMonthDays = getDaysInMonth(year, month + 1);
  
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const isPastDate = (date: Date) => {
    return false;
  };
  
  const isSelectedDate = (date: Date) => {
    if (!tempStartDate) return false;
    if (tempEndDate) {
      return isSameDay(date, tempStartDate) || 
             isSameDay(date, tempEndDate) || 
             (isAfter(date, tempStartDate) && isBefore(date, tempEndDate));
    }
    return isSameDay(date, tempStartDate);
  };
  
  const isStartDate = (date: Date) => {
    return tempStartDate && isSameDay(date, tempStartDate);
  };
  
  const isEndDate = (date: Date) => {
    return tempEndDate && isSameDay(date, tempEndDate);
  };
  
  const isInHoverRange = (date: Date) => {
    if (selecting === 'end' && tempStartDate && hoverDate) {
      return isAfter(date, tempStartDate) && isBefore(date, hoverDate);
    }
    return false;
  };
  
  const handleDateClick = (date: Date) => {
    if (isPastDate(date)) return;
    
    if (selecting === 'start') {
      setTempStartDate(date);
      setTempEndDate(null);
      setSelecting('end');
    } else {
      if (tempStartDate && isBefore(date, tempStartDate)) {
        setTempEndDate(tempStartDate);
        setTempStartDate(date);
      } else {
        setTempEndDate(date);
      }
      setSelecting('start');
    }
  };
  
  const handleMouseEnter = (date: Date) => {
    if (!isPastDate(date)) {
      setHoverDate(date);
    }
  };
  
  const handleMouseLeave = () => {
    setHoverDate(null);
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  return (
    <div className={`bg-white shadow-xl rounded-lg ${isMobile ? 'w-full p-3' : 'w-auto max-w-[600px] p-4'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Seleccionar rango de fechas</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className={`${!isMobile ? 'md:col-span-1 border-r pr-4' : ''}`}>
          <h4 className="font-medium mb-2 text-gray-700">Rangos predefinidos</h4>
          <ul className="space-y-2">
            {presets.map((preset, index) => (
              <li key={index}>
                <button
                  onClick={() => {
                    const [start, end] = preset.getRange();
                    setTempStartDate(start);
                    setTempEndDate(end);
                    setSelecting('start');
                  }}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  {preset.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className={`${isMobile ? 'col-span-1' : 'md:col-span-2'}`}>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'sm:grid-cols-2'} gap-4`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <button
                  onClick={prevMonth}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h4 className="font-medium">
                  {format(new Date(year, month, 1), 'MMMM yyyy', { locale: es })}
                </h4>
                <button
                  onClick={nextMonth}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {daysOfWeek.map((day, index) => (
                  <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
                
                {days.map((date, index) => (
                  <div key={index} className="aspect-square">
                    {date ? (
                      <button
                        className={`w-full h-full flex items-center justify-center text-sm rounded-full transition-colors
                          ${isPastDate(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'} 
                          ${isSelectedDate(date) ? 'bg-blue-100' : ''} 
                          ${isStartDate(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''} 
                          ${isEndDate(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                          ${isInHoverRange(date) || (hoverDate && selecting === 'end' && isAfter(hoverDate, tempStartDate!) && isBefore(date, hoverDate)) ? 'bg-blue-50' : ''}
                        `}
                        onClick={() => handleDateClick(date)}
                        onMouseEnter={() => handleMouseEnter(date)}
                        onMouseLeave={handleMouseLeave}
                        disabled={isPastDate(date)}
                      >
                        {date.getDate()}
                      </button>
                    ) : (
                      <div className="w-full h-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {!isMobile && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">
                    {format(new Date(year, month + 1, 1), 'MMMM yyyy', { locale: es })}
                  </h4>
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {daysOfWeek.map((day, index) => (
                    <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                  
                  {nextMonthDays.map((date, index) => (
                    <div key={index} className="aspect-square">
                      {date ? (
                        <button
                          className={`w-full h-full flex items-center justify-center text-sm rounded-full transition-colors
                            ${isSelectedDate(date) ? 'bg-blue-100' : ''} 
                            ${isStartDate(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''} 
                            ${isEndDate(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                            ${isInHoverRange(date) || (hoverDate && selecting === 'end' && isAfter(hoverDate, tempStartDate!) && isBefore(date, hoverDate)) ? 'bg-blue-50' : ''}
                          `}
                          onClick={() => handleDateClick(date)}
                          onMouseEnter={() => handleMouseEnter(date)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {date.getDate()}
                        </button>
                      ) : (
                        <div className="w-full h-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <div>
          {tempStartDate && (
            <div className={`text-sm ${isMobile ? 'flex flex-col' : ''}`}>
              <span className="text-gray-500 mr-1">Desde:</span>
              <span className="font-medium">{format(tempStartDate, 'dd/MM/yyyy')}</span>
              {tempEndDate && (
                <>
                  <span className={`text-gray-500 ${isMobile ? 'mt-1' : 'mx-1'}`}>Hasta:</span>
                  <span className="font-medium">{format(tempEndDate, 'dd/MM/yyyy')}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={() => {
              if (tempStartDate && tempEndDate && isSameDay(tempStartDate, tempEndDate)) {
                onChange(tempStartDate, tempEndDate);
              } else if (tempStartDate && !tempEndDate) {
                onChange(tempStartDate, tempStartDate);
              } else {
                onChange(tempStartDate, tempEndDate);
              }
            }}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={!tempStartDate}
          >
            <Check className="h-4 w-4" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;