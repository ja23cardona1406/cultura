import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, addDays, subDays } from 'date-fns';
import { CalendarIcon, List, ChevronDown, Info, ChevronLeft, Filter, Download, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Activity, Agreement, Institution } from '../../types';
import ActivityDetails from './ActivityDetails';
import DateRangePicker from './DateRangePicker';
import ActivityForm from './ActivityForm';
import { generateActivityReport } from '../../utils/reportGenerator';

interface ActivityCalendarProps {
  agreementId?: string;
  onCreateActivity: () => void;
}

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ 
  agreementId, 
  onCreateActivity 
}) => {
  const [activities, setActivities] = useState<(Activity & { 
    agreement?: Agreement & { institution?: Institution } 
  })[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<(Activity & { 
    agreement?: Agreement & { institution?: Institution } 
  })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<(Activity & { 
    agreement?: Agreement & { institution?: Institution } 
  }) | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State for calendar view options
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  
  // Date range filter
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);
  
  // Refs
  const calendarRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchActivities();
  }, [agreementId]);

  useEffect(() => {
    applyFilters();
  }, [activities, startDate, endDate]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('activities')
        .select(`
          *,
          agreement:agreements (
            *,
            institution:institutions (
              id,
              name,
              logo_url
            )
          )
        `)
        .order('scheduled_date', { ascending: false });
      
      // If agreementId is provided, filter by it
      if (agreementId) {
        query = query.eq('agreement_id', agreementId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setActivities(data || []);
      setFilteredActivities(data || []);
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar las actividades: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...activities];
    
    // Apply date range filter if both dates are set
    if (startDate && endDate) {
      // Create dates with time set to start and end of day to ensure inclusive range
      const startDateWithTime = new Date(startDate);
      startDateWithTime.setHours(0, 0, 0, 0);
      
      const endDateWithTime = new Date(endDate);
      endDateWithTime.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.scheduled_date);
        return activityDate >= startDateWithTime && activityDate <= endDateWithTime;
      });
    }
    
    setFilteredActivities(filtered);
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    setIsDateRangePickerOpen(false);
  };

  const clearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'finalizado':
        return '#10b981'; // green
      case 'en_proceso':
        return '#3b82f6'; // blue
      case 'cancelado':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const formatCalendarEvents = () => {
    return filteredActivities.map(activity => ({
      id: activity.id,
      title: activity.title,
      start: activity.scheduled_date,
      end: new Date(new Date(activity.scheduled_date).getTime() + 3600000).toISOString(), // Add 1 hour by default
      backgroundColor: getStatusColor(activity.status),
      borderColor: getStatusColor(activity.status),
      extendedProps: {
        activity_type: activity.activity_type,
        description: activity.description,
        institution: activity.agreement?.institution?.name,
        institution_logo: activity.agreement?.institution?.logo_url,
        status: activity.status
      }
    }));
  };

  const handleEventClick = (info: any) => {
    const activity = activities.find(act => act.id === info.event.id);
    if (activity) {
      setSelectedActivity(activity);
      setIsDetailsModalOpen(true);
    }
  };

  const handleActivitySubmit = async (formData: any) => {
    try {
      // Combine date and time for scheduled_date
      const dateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
      
      // Handle image upload if provided
      let finalImageUrl = formData.image_url;
      
      if (formData.image_file) {
        const fileName = `activity_${Date.now()}_${formData.image_file.name.replace(/\s+/g, '_')}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('imagenes')
          .upload(fileName, formData.image_file);
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('imagenes')
          .getPublicUrl(fileName);
        
        finalImageUrl = publicUrlData.publicUrl;
      }
      
      if (selectedActivity) {
        // Update existing activity
        const { data: updatedActivity, error: updateError } = await supabase
          .from('activities')
          .update({
            title: formData.title,
            activity_type: formData.activity_type,
            scheduled_date: dateTime.toISOString(),
            description: formData.description,
            attendee_count: formData.attendee_count,
            status: formData.status,
            progress_percentage: formData.progress_percentage,
            image_url: finalImageUrl,
            is_modifiable: formData.status !== 'finalizado',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedActivity.id)
          .select(`
            *,
            agreement:agreements (
              *,
              institution:institutions (
                id,
                name,
                logo_url
              )
            )
          `)
          .single();

        if (updateError) throw updateError;
        
        // Delete existing participants and add new ones
        const { error: deletePartError } = await supabase
          .from('activity_participants')
          .delete()
          .eq('activity_id', selectedActivity.id);
        
        if (deletePartError) throw deletePartError;
        
        // Add updated participants
        if (formData.participants.length > 0) {
          const { error: addPartError } = await supabase
            .from('activity_participants')
            .insert(
              formData.participants.map((p: any) => ({
                ...p,
                activity_id: selectedActivity.id
              }))
            );
          
          if (addPartError) throw addPartError;
        }
        
        // Delete existing observations and add new ones
        const { error: deleteObsError } = await supabase
          .from('observations')
          .delete()
          .eq('activity_id', selectedActivity.id);
        
        if (deleteObsError) throw deleteObsError;
        
        // Add updated observations
        if (formData.observations.length > 0) {
          const { error: addObsError } = await supabase
            .from('observations')
            .insert(
              formData.observations.map((o: any) => ({
                ...o,
                activity_id: selectedActivity.id,
                created_at: new Date().toISOString()
              }))
            );
          
          if (addObsError) throw addObsError;
        }

        // Update the activities list
        setActivities(prev => 
          prev.map(activity => activity.id === selectedActivity.id ? updatedActivity : activity)
        );
        
        setSelectedActivity(updatedActivity);
      }
      
      setIsEditModalOpen(false);
      fetchActivities(); // Refresh the activities list
      
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Hubo un error al guardar la actividad');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta actividad?')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      // First delete related observations
      const { error: obsError } = await supabase
        .from('observations')
        .delete()
        .eq('activity_id', activityId);
      
      if (obsError) throw obsError;
      
      // Then delete related participants
      const { error: partError } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', activityId);
      
      if (partError) throw partError;
      
      // Finally delete the activity
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (deleteError) throw deleteError;

      setActivities(prev => prev.filter(activity => activity.id !== activityId));
      setFilteredActivities(prev => prev.filter(activity => activity.id !== activityId));
      
      if (isDetailsModalOpen) {
        setIsDetailsModalOpen(false);
        setSelectedActivity(null);
      }
    } catch (err) {
      const error = err as Error;
      setError('Error al eliminar la actividad: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditActivity = () => {
    if (selectedActivity) {
      setIsEditModalOpen(true);
    }
  };

  const handleViewChange = (viewType: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    setCalendarView(viewType);
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(viewType);
    }
    setIsViewDropdownOpen(false);
  };

  const renderEventContent = (eventInfo: any) => {
    const { extendedProps } = eventInfo.event;
    
    return (
      <div className="w-full overflow-hidden">
        <div className="text-xs font-semibold mb-1 truncate">
          {eventInfo.timeText && (
            <span className="mr-1">{eventInfo.timeText}</span>
          )}
          {eventInfo.event.title}
        </div>
        <div className="flex items-center text-xs">
          {extendedProps.institution_logo ? (
            <img 
              src={extendedProps.institution_logo} 
              alt={extendedProps.institution} 
              className="w-3 h-3 mr-1 rounded-full"
            />
          ) : null}
          <span className="truncate">{extendedProps.activity_type}</span>
        </div>
      </div>
    );
  };

  const viewOptions = [
    { value: 'dayGridMonth', label: 'Mes', icon: CalendarIcon },
    { value: 'timeGridWeek', label: 'Semana', icon: CalendarIcon },
    { value: 'timeGridDay', label: 'Día', icon: CalendarIcon }
  ];

  const formatDateRange = () => {
    if (startDate && endDate) {
      if (format(startDate, 'dd/MM/yyyy') === format(endDate, 'dd/MM/yyyy')) {
        return `${format(startDate, 'dd/MM/yyyy')}`;
      }
      return `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
    }
    return 'Seleccionar rango de fechas';
  };

  const generateReport = () => {
    generateActivityReport(
      filteredActivities,
      {
        from: startDate,
        to: endDate
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              <span>Vista: {viewOptions.find(opt => opt.value === calendarView)?.label}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {isViewDropdownOpen && (
              <div className="absolute z-10 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                <ul className="py-1">
                  {viewOptions.map((option) => (
                    <li key={option.value}>
                      <button 
                        onClick={() => handleViewChange(option.value as any)}
                        className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${calendarView === option.value ? 'bg-blue-50 text-blue-700' : ''}`}
                      >
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsDateRangePickerOpen(!isDateRangePickerOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${startDate && endDate ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white border-gray-300'} border rounded-md hover:bg-gray-50 transition`}
            >
              <Filter className="h-4 w-4" />
              <span className="truncate max-w-[150px]">{formatDateRange()}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {isDateRangePickerOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-16 px-4">
                <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsDateRangePickerOpen(false)} />
                <div className="relative">
                  <DateRangePicker 
                    startDate={startDate}
                    endDate={endDate}
                    onChange={handleDateRangeChange}
                    onCancel={() => setIsDateRangePickerOpen(false)}
                    onClear={clearDateRange}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="hidden md:flex items-center gap-1 text-sm">
            <div className="flex items-center gap-1 ml-4">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-gray-600">En Proceso</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-600">Finalizado</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-gray-600">Cancelado</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Generar Reporte</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-1 sm:p-4">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">
                {startDate && endDate 
                  ? 'No hay actividades en el rango de fechas seleccionado' 
                  : 'No hay actividades programadas'}
              </p>
              {!startDate && !endDate && (
                <button 
                  onClick={onCreateActivity}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Crear Primera Actividad
                </button>
              )}
              {startDate && endDate && (
                <button 
                  onClick={clearDateRange}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                >
                  Limpiar Filtro
                </button>
              )}
            </div>
          ) : (
            <div className="calendar-container">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={calendarView}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: ''
                }}
                events={formatCalendarEvents()}
                eventContent={renderEventContent}
                eventClick={handleEventClick}
                height="auto"
                locale="es"
                buttonText={{
                  today: 'Hoy'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Activity details modal */}
      {isDetailsModalOpen && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div 
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedActivity(null);
                  }}
                  className="mr-4 flex items-center justify-center h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-semibold">Detalles de la Actividad</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleEditActivity}
                  className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                  disabled={!selectedActivity.is_modifiable}
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={() => handleDeleteActivity(selectedActivity.id)}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ActivityDetails
                activity={selectedActivity}
                onBack={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedActivity(null);
                }}
                onEdit={handleEditActivity}
                onDelete={() => handleDeleteActivity(selectedActivity.id)}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {isEditModalOpen && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <ActivityForm
            activity={selectedActivity}
            onSubmit={handleActivitySubmit}
            onCancel={() => {
              setIsEditModalOpen(false);
            }}
            isEditing={true}
          />
        </div>
      )}
    </div>
  );
};

export default ActivityCalendar;