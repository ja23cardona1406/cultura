import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, addDays, subDays } from 'date-fns';
import { CalendarIcon, List, ChevronDown, Info, ChevronLeft, Filter, Download, Edit2, Trash2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Activity, Agreement, Institution, InstitutionType } from '../../types';
import ActivityDetails from './ActivityDetails';
import DateRangePicker from './DateRangePicker';
import ActivityForm from './ActivityForm';
import { generateActivityReport } from '../../utils/reportGenerator';

interface ActivityCalendarProps {
  agreementId?: string;
  onCreateActivity: () => void;
}

const MUNICIPALITIES = [
  'Vijes',
  'Dagua',
  'Jamundí',
  'Yumbo',
  'Yotoco',
  'Restrepo',
  'Darién',
  'La cumbre',
  'Cali'

];

const INSTITUTION_TYPES: InstitutionType[] = [
  'NAF',
  'Cultura de la contribución en la escuela',
  'Presencia de territorios',
  'DIAN'
];

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({
  agreementId,
  onCreateActivity
}) => {
  const [activities, setActivities] = useState<(Activity & {
    agreement?: Agreement & { institution?: Institution },
    direct_institution?: Institution
  })[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<(Activity & {
    agreement?: Agreement & { institution?: Institution },
    direct_institution?: Institution
  })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<(Activity & {
    agreement?: Agreement & { institution?: Institution },
    direct_institution?: Institution
  }) | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_proceso' | 'finalizado' | 'cancelado'>('all');
  const [municipalityFilter, setMunicipalityFilter] = useState<string>('all');
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<string>('all');

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
  }, [activities, searchTerm, statusFilter, municipalityFilter, institutionTypeFilter, startDate, endDate]);

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
              logo_url,
              type
            )
          )
        `)
        .order('scheduled_date', { ascending: false });

      if (agreementId) {
        query = query.eq('agreement_id', agreementId);
      }

      const { data: activitiesWithAgreements, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // For activities without agreements, fetch their direct institutions
      const activitiesWithoutAgreements = activitiesWithAgreements?.filter(a => !a.agreement_id && a.institution_id) || [];
      
      let activitiesWithDirectInstitutions = [...(activitiesWithAgreements || [])];
      
      if (activitiesWithoutAgreements.length > 0) {
        const institutionIds = activitiesWithoutAgreements.map(a => a.institution_id).filter(Boolean);
        
        if (institutionIds.length > 0) {
          const { data: institutions, error: institutionsError } = await supabase
            .from('institutions')
            .select('*')
            .in('id', institutionIds);
          
          if (institutionsError) throw institutionsError;
          
          // Attach direct institutions to activities
          activitiesWithDirectInstitutions = activitiesWithAgreements?.map(activity => {
            if (!activity.agreement_id && activity.institution_id) {
              const directInstitution = institutions?.find(i => i.id === activity.institution_id);
              return {
                ...activity,
                direct_institution: directInstitution || undefined
              };
            }
            return activity;
          }) || [];
        }
      }

      setActivities(activitiesWithDirectInstitutions);
      setFilteredActivities(activitiesWithDirectInstitutions);
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar las actividades: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...activities];

    if (searchTerm) {
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.activity_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(activity => activity.status === statusFilter);
    }

    if (municipalityFilter !== 'all') {
      filtered = filtered.filter(activity => activity.municipality === municipalityFilter);
    }

    if (institutionTypeFilter !== 'all') {
      filtered = filtered.filter(activity => {
        // Check institution type from either agreement or direct institution
        const institutionType = activity.agreement?.institution?.type || activity.direct_institution?.type;
        return institutionType === institutionTypeFilter;
      });
    }

    if (startDate && endDate) {
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

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMunicipalityFilter('all');
    setInstitutionTypeFilter('all');
    setStartDate(null);
    setEndDate(null);
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
    return filteredActivities.map(activity => {
      // Get institution info from either agreement or direct institution
      const institutionName = activity.agreement?.institution?.name || 
                              activity.direct_institution?.name || 
                              "Institución sin convenio";
      
      const institutionLogo = activity.agreement?.institution?.logo_url || 
                              activity.direct_institution?.logo_url;
      
      const institutionType = activity.agreement?.institution?.type || 
                              activity.direct_institution?.type;
      
      return {
        id: activity.id,
        title: activity.title,
        start: activity.scheduled_date,
        end: new Date(new Date(activity.scheduled_date).getTime() + 3600000).toISOString(),
        backgroundColor: getStatusColor(activity.status),
        borderColor: getStatusColor(activity.status),
        extendedProps: {
          activity_type: activity.activity_type,
          description: activity.description,
          institution: institutionName,
          institution_logo: institutionLogo,
          status: activity.status,
          municipality: activity.municipality,
          institution_type: institutionType
        }
      };
    });
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
      const dateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
      
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
            updated_at: new Date().toISOString(),
            // Don't update agreement_id or institution_id as they should not be modifiable
          })
          .eq('id', selectedActivity.id)
          .select(`
            *,
            agreement:agreements (
              *,
              institution:institutions (
                id,
                name,
                logo_url,
                type
              )
            )
          `)
          .single();

        if (updateError) throw updateError;
        
        // Preserve the direct_institution if it exists
        const updatedActivityWithDirectInst = {
          ...updatedActivity,
          direct_institution: selectedActivity.direct_institution
        };
        
        setActivities(prev => 
          prev.map(activity => activity.id === selectedActivity.id ? updatedActivityWithDirectInst : activity)
        );
        
        setSelectedActivity(updatedActivityWithDirectInst);
      }
      
      setIsEditModalOpen(false);
      fetchActivities();
      
    } catch (err) {
      const error = err as Error;
      throw error;
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta actividad?')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const { error: obsError } = await supabase
        .from('observations')
        .delete()
        .eq('activity_id', activityId);
      
      if (obsError) throw obsError;
      
      const { error: partError } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', activityId);
      
      if (partError) throw partError;
      
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

  // Check if any filter is active
  const isFiltering = 
    searchTerm !== '' || 
    statusFilter !== 'all' || 
    municipalityFilter !== 'all' || 
    institutionTypeFilter !== 'all' || 
    (startDate !== null && endDate !== null);

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
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar actividades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="en_proceso">En Proceso</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <select
            value={municipalityFilter}
            onChange={(e) => setMunicipalityFilter(e.target.value)}
            className="py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los municipios</option>
            {MUNICIPALITIES.map(municipality => (
              <option key={municipality} value={municipality}>{municipality}</option>
            ))}
          </select>

          <select
            value={institutionTypeFilter}
            onChange={(e) => setInstitutionTypeFilter(e.target.value)}
            className="py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los tipos de institución</option>
            {INSTITUTION_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsDateRangePickerOpen(!isDateRangePickerOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                startDate && endDate ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white border-gray-300'
              } border rounded-md hover:bg-gray-50 transition`}
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

          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            <Download className="h-4 w-4" />
            <span>Generar Reporte</span>
          </button>
        </div>
      </div>

      {isFiltering && (
        <div className="flex justify-end">
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <ChevronDown className="h-3 w-3" />
            Limpiar todos los filtros
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-1 sm:p-4">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">
                {isFiltering 
                  ? 'No hay actividades que coincidan con los filtros seleccionados' 
                  : 'No hay actividades programadas'}
              </p>
              {!isFiltering && (
                <button 
                  onClick={onCreateActivity}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Crear Primera Actividad
                </button>
              )}
              {isFiltering && (
                <button 
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                >
                  Limpiar Filtros
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