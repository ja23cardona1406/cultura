import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Search, Plus, Trash2, Eye, CheckCircle, Clock, AlertCircle, CalendarDays, List, Filter, Download, ChevronDown, X} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Activity, Agreement, Institution, InstitutionType } from '../types';
import ActivityForm from './activities/ActivityForm';
import ActivityDetails from './activities/ActivityDetails';
import ActivityCalendar from './activities/ActivityCalendar';
import { checkTimeConflicts } from '../utils/dateUtils';
import ConflictWarning from './activities/ConflictWarning';
import DateRangePicker from './activities/DateRangePicker';
import { format } from 'date-fns';
import { generateActivityReport } from '../utils/reportGenerator';
import { useIsMobile, useIsTablet, useIsDesktop } from '../hooks/useMediaQuery';

interface ActivityListProps {
  agreementId?: string;
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

const ActivityList: React.FC<ActivityListProps> = ({ agreementId }) => {
  const [activities, setActivities] = useState<(Activity & {
    agreement?: Agreement & { institution?: Institution }
  })[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<(Activity & {
    agreement?: Agreement & { institution?: Institution }
  })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_proceso' | 'finalizado' | 'cancelado'>('all');
  const [municipalityFilter, setMunicipalityFilter] = useState<string>('all');
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<(Activity & {
    agreement?: Agreement & { institution?: Institution }
  }) | null>(null);
  const [isDetailsView, setIsDetailsView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Date range filter
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);

  // For conflict detection
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [conflictingActivities, setConflictingActivities] = useState<Activity[]>([]);
  const [isConflictWarningOpen, setIsConflictWarningOpen] = useState(false);

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);

  // Responsive design hooks
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setActivities(data || []);
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
      filtered = filtered.filter(activity => 
        activity.agreement?.institution?.type === institutionTypeFilter
      );
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

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    setIsDateRangePickerOpen(false);
  };

  const clearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMunicipalityFilter('all');
    setInstitutionTypeFilter('all');
    setStartDate(null);
    setEndDate(null);
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
      
      if (isDetailsView) {
        setIsDetailsView(false);
        setSelectedActivity(null);
      }
    } catch (err) {
      const error = err as Error;
      setError('Error al eliminar la actividad: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const checkForTimeConflicts = (formData: any) => {
    const dateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);

    const conflicts = checkTimeConflicts(
      dateTime.toISOString(),
      activities.filter(a => isEditing ? a.id !== selectedActivity?.id : true)
    );

    if (conflicts.length > 0) {
      setPendingFormData(formData);
      setConflictingActivities(conflicts);
      setIsConflictWarningOpen(true);
      return true;
    }

    return false;
  };

  const handleActivitySubmit = async (formData: any) => {
    const hasConflicts = checkForTimeConflicts(formData);
    if (hasConflicts) {
      return;
    }

    await submitActivityToDatabase(formData);
  };

  const proceedWithConflictingSubmission = async () => {
    if (pendingFormData) {
      await submitActivityToDatabase(pendingFormData);
      setPendingFormData(null);
      setIsConflictWarningOpen(false);
    }
  };

  const cancelConflictingSubmission = () => {
    setIsConflictWarningOpen(false);
  };

  const submitActivityToDatabase = async (formData: any) => {
    setError('');

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
      
      if (isEditing && selectedActivity) {
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
            municipality: formData.municipality,
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
                logo_url,
                type
              )
            )
          `)
          .single();

        if (updateError) throw updateError;
        
        const { error: deletePartError } = await supabase
          .from('activity_participants')
          .delete()
          .eq('activity_id', selectedActivity.id);
        
        if (deletePartError) throw deletePartError;
        
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
        
        const { error: deleteObsError } = await supabase
          .from('observations')
          .delete()
          .eq('activity_id', selectedActivity.id);
        
        if (deleteObsError) throw deleteObsError;
        
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

        setActivities(prev => 
          prev.map(activity => activity.id === selectedActivity.id ? updatedActivity : activity)
        );
        
        setSelectedActivity(updatedActivity);
      } else {
        const { data: newActivity, error: insertError } = await supabase
          .from('activities')
          .insert([{
            agreement_id: formData.agreement_id,
            title: formData.title,
            activity_type: formData.activity_type,
            scheduled_date: dateTime.toISOString(),
            description: formData.description,
            attendee_count: formData.attendee_count,
            status: formData.status,
            progress_percentage: formData.progress_percentage,
            image_url: finalImageUrl,
            municipality: formData.municipality,
            is_modifiable: true
          }])
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

        if (insertError) throw insertError;
        
        if (formData.participants.length > 0) {
          const { error: partError } = await supabase
            .from('activity_participants')
            .insert(
              formData.participants.map((p: any) => ({
                ...p,
                activity_id: newActivity.id
              }))
            );
          
          if (partError) throw partError;
        }
        
        if (formData.observations.length > 0) {
          const { error: obsError } = await supabase
            .from('observations')
            .insert(
              formData.observations.map((o: any) => ({
                ...o,
                activity_id: newActivity.id,
                created_at: new Date().toISOString()
              }))
            );
          
          if (obsError) throw obsError;
        }

        setActivities(prev => [newActivity, ...prev]);
      }
      
      setIsModalOpen(false);
      setIsEditing(false);
    } catch (err) {
      const error = err as Error;
      throw error;
    }
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

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'finalizado':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'en_proceso':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'cancelado':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'finalizado':
        return 'text-green-700 bg-green-100';
      case 'en_proceso':
        return 'text-blue-700 bg-blue-100';
      case 'cancelado':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'finalizado':
        return 'Finalizado';
      case 'en_proceso':
        return 'En Proceso';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatDateRange = () => {
    if (startDate && endDate) {
      if (format(startDate, 'dd/MM/yyyy') === format(endDate, 'dd/MM/yyyy')) {
        return `${format(startDate, 'dd/MM/yyyy')}`;
      }
      return `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
    }
    return 'Seleccionar rango de fechas';
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isDetailsView && selectedActivity) {
    return (
      <div className={`p-${isMobile ? '3' : '6'}`}>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <ActivityForm
              activity={selectedActivity}
              onSubmit={handleActivitySubmit}
              onCancel={() => {
                setIsModalOpen(false);
                setIsEditing(false);
              }}
              isEditing={isEditing}
            />
          </div>
        )}

        <div className={`flex items-center gap-${isMobile ? '2' : '4'} mb-${isMobile ? '4' : '6'}`}>
          <button
            onClick={() => {
              setIsDetailsView(false);
              setSelectedActivity(null);
              setIsEditing(false);
            }}
            className="flex items-center justify-center h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <h1 className={`text-${isMobile ? 'xl' : '2xl'} font-semibold`}>Detalles de la Actividad</h1>
        </div>
        
        <ActivityDetails
          activity={selectedActivity}
          onBack={() => {
            setIsDetailsView(false);
            setSelectedActivity(null);
            setIsEditing(false);
          }}
          onEdit={() => {
            setIsEditing(true);
            setIsModalOpen(true);
          }}
          onDelete={() => handleDeleteActivity(selectedActivity.id)}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-${isMobile ? '4' : '6'} p-${isMobile ? '3' : '6'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'}`}>
        <div>
          <h1 className={`text-${isMobile ? 'xl' : '2xl'} font-semibold text-gray-900`}>Actividades</h1>
          {agreementId && (
            <p className="text-gray-500 text-sm">
              Mostrando actividades para el convenio seleccionado
            </p>
          )}
        </div>
        <div className={`flex ${isMobile ? 'flex-col w-full' : 'items-center'} gap-2`}>
          <div className={`bg-gray-100 p-1 rounded-md flex ${isMobile ? 'w-full' : ''}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              } ${isMobile ? 'flex-1 justify-center' : ''}`}
            >
              <List className="h-4 w-4" />
              <span className={isMobile ? '' : 'hidden sm:inline'}>Lista</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'calendar' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              } ${isMobile ? 'flex-1 justify-center' : ''}`}
            >
              <CalendarDays className="h-4 w-4" />
              <span className={isMobile ? '' : 'hidden sm:inline'}>Calendario</span>
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 ${
              isMobile ? 'w-full justify-center' : ''
            }`}
          >
            <Plus className="h-4 w-4" />
            {isMobile ? 'Nueva' : 'Nueva Actividad'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {viewMode === 'calendar' ? (
        <ActivityCalendar 
          agreementId={agreementId} 
          onCreateActivity={() => setIsModalOpen(true)} 
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className={`p-${isMobile ? '3' : '4'} border-b`}>
            <div className={`flex flex-col ${isMobile ? 'gap-3' : 'md:flex-row md:items-center gap-4'}`}>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar actividades..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className={`flex ${isMobile ? 'flex-col' : 'flex-wrap'} gap-2`}>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className={`py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isMobile ? 'w-full' : 'w-auto'
                  }`}
                >
                  <option value="all">Todos los estados</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                
                <select
                  value={municipalityFilter}
                  onChange={e => setMunicipalityFilter(e.target.value)}
                  className={`py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isMobile ? 'w-full' : 'w-auto'
                  }`}
                >
                  <option value="all">Todos los municipios</option>
                  {MUNICIPALITIES.map(municipality => (
                    <option key={municipality} value={municipality}>{municipality}</option>
                  ))}
                </select>
                
                <select
                  value={institutionTypeFilter}
                  onChange={e => setInstitutionTypeFilter(e.target.value)}
                  className={`py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isMobile ? 'w-full' : 'w-auto'
                  }`}
                >
                  <option value="all">Todos los tipos de institución</option>
                  {INSTITUTION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                
                <div className={`relative ${isMobile ? 'w-full' : 'w-auto'}`}>
                  <button 
                    onClick={() => setIsDateRangePickerOpen(!isDateRangePickerOpen)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm ${
                      startDate && endDate ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white border-gray-300'
                    } border rounded-md hover:bg-gray-50 transition ${isMobile ? 'w-full' : 'w-auto'} justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{formatDateRange()}</span>
                    </div>
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
                  className={`flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition ${
                    isMobile ? 'w-full justify-center' : 'w-auto'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  <span>Generar Reporte</span>
                </button>
              </div>
            </div>
            
            {isFiltering && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </div>

          <div className={`p-${isMobile ? '3' : '6'}`}>
            <div className="space-y-4">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">
                    {isFiltering 
                      ? 'No hay actividades que coincidan con los filtros seleccionados'
                      : 'No hay actividades registradas'}
                  </p>
                  <div className={`flex ${isMobile ? 'flex-col' : 'flex-wrap'} justify-center gap-2`}>
                    {isFiltering && (
                      <button 
                        onClick={clearAllFilters}
                        className={`px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 inline-flex items-center gap-2 ${
                          isMobile ? 'w-full justify-center' : ''
                        }`}
                      >
                        <Filter className="h-4 w-4" />
                        Limpiar Filtros
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2 ${
                        isMobile ? 'w-full justify-center' : ''
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Actividad
                    </button>
                  </div>
                </div>
              ) : (
                filteredActivities.map(activity => (
                  <div 
                    key={activity.id} 
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    <div className={`flex ${isMobile ? 'flex-col' : 'md:flex-row'}`}>
                      {activity.image_url && (
                        <div className={`${isMobile ? 'w-full h-48' : 'md:w-48 h-auto'}`}>
                          <img 
                            src={activity.image_url} 
                            alt={activity.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 p-4">
                        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-start'} mb-2`}>
                          <div>
                            <h3 className="font-semibold text-lg">{activity.title}</h3>
                            <div className="flex flex-wrap gap-2 items-center mt-1">
                              <p className="text-sm text-gray-500">{activity.activity_type}</p>
                              {activity.municipality && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                  {activity.municipality}
                                </span>
                              )}
                              {activity.agreement?.institution?.type && (
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                  {activity.agreement.institution.type}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusBadgeClass(activity.status)
                          } ${isMobile ? 'self-start' : ''}`}>
                            {getStatusIcon(activity.status)}
                            <span>{getStatusText(activity.status)}</span>
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">{activity.description}</p>
                        
                        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'sm:flex-row sm:items-center justify-between gap-2'}`}>
                          <div className="text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(activity.scheduled_date).toLocaleDateString()} - {new Date(activity.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            {activity.agreement?.institution && (
                              <div className="mt-1 flex items-center gap-1 text-blue-600">
                                {activity.agreement.institution.logo_url ? (
                                  <img 
                                    src={activity.agreement.institution.logo_url} 
                                    alt={activity.agreement.institution.name} 
                                    className="h-4 w-4 rounded-full object-cover"
                                  />
                                ) : null}
                                <span>{activity.agreement.institution.name}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className={`flex gap-2 ${isMobile ? 'w-full' : 'self-end sm:self-auto'}`}>
                            <button 
                              onClick={() => {
                                setSelectedActivity(activity);
                                setIsDetailsView(true);
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 ${
                                isMobile ? 'flex-1 justify-center' : ''
                              }`}
                            >
                              <Eye className="h-4 w-4" />
                              <span>Ver Detalles</span>
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={isDeleting}
                              className={`flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isMobile ?  'flex-1 justify-center' : ''
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                              {isMobile && <span>Eliminar</span>}
                            </button>
                          </div>
                        </div>
                        
                        {activity.status === 'en_proceso' && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${activity.progress_percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {activity.progress_percentage}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <ActivityForm
            agreementId={agreementId}
            activity={isEditing ? selectedActivity : undefined}
            onSubmit={handleActivitySubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setIsEditing(false);
            }}
            isEditing={isEditing}
          />
        </div>
      )}

      {isConflictWarningOpen && pendingFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <ConflictWarning 
            conflictingActivities={conflictingActivities}
            newActivityDate={new Date(`${pendingFormData.scheduled_date}T${pendingFormData.scheduled_time}`).toISOString()}
            onProceed={proceedWithConflictingSubmission}
            onCancel={cancelConflictingSubmission}
          />
        </div>
      )}

      {isDetailsView && selectedActivity && (
        <div 
          ref={modalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b sticky top-0 bg-white z-10 flex items-center">
              <button
                onClick={() => {
                  setIsDetailsView(false);
                  setSelectedActivity(null);
                }}
                className="mr-4 flex items-center justify-center h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold">Detalles de la Actividad</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ActivityDetails
                activity={selectedActivity}
                onBack={() => {
                  setIsDetailsView(false);
                  setSelectedActivity(null);
                }}
                onEdit={() => {
                  setIsEditing(true);
                  setIsModalOpen(true);
                }}
                onDelete={() => handleDeleteActivity(selectedActivity.id)}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityList;