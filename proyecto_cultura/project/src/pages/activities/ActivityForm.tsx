import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Plus, Clock, AlertCircle, Calendar, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getActivitiesForDay } from '../../utils/dateUtils';
import type { Agreement, Institution, Member, Activity, ActivityParticipant } from '../../types';
import ParticipantSelector from './ParticipantSelector';

interface ActivityFormProps {
  activity?: (Activity & {
    agreement?: Agreement & { institution?: Institution };
    direct_institution?: Institution;
  }) | null;
  agreementId?: string;
  onSubmit: (formData: {
    title: string;
    activity_type: string;
    scheduled_date: string;
    scheduled_time: string;
    description: string;
    attendee_count: number;
    status: 'en_proceso' | 'finalizado' | 'cancelado';
    progress_percentage: number;
    image_url: string;
    image_file: File | null;
    agreement_id?: string;
    institution_id?: string;
    municipality: string;
    participants: ActivityParticipant[];
    observations: { title: string; description: string; activity_type: string; }[];
  }) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
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

const ActivityForm: React.FC<ActivityFormProps> = ({
  activity,
  agreementId,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [agreements, setAgreements] = useState<(Agreement & { institution?: Institution })[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<(Agreement & { institution?: Institution }) | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [institutionType, setInstitutionType] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ActivityParticipant[]>([]);
  const [observations, setObservations] = useState<{
    title: string;
    description: string;
    activity_type: string;
  }[]>([]);
  const [activitiesOnSelectedDate, setActivitiesOnSelectedDate] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>([
    'Taller', 'Capacitación', 'Reunión', 'Evento', 'Visita', 'Otro'
  ]);

  const [formData, setFormData] = useState({
    title: activity?.title || '',
    activity_type: activity?.activity_type || '',
    scheduled_date: activity?.scheduled_date ? new Date(activity.scheduled_date).toISOString().split('T')[0] : '',
    scheduled_time: activity?.scheduled_date ? new Date(activity.scheduled_date).toTimeString().split(' ')[0].substring(0, 5) : '09:00',
    description: activity?.description || '',
    attendee_count: activity?.attendee_count || 0,
    status: activity?.status || 'en_proceso',
    progress_percentage: activity?.progress_percentage || 0,
    image_url: activity?.image_url || '',
    municipality: activity?.municipality || '',
    image_file: null as File | null,
  });

  const [useAgreement, setUseAgreement] = useState<boolean>(!!agreementId || (!!activity?.agreement_id));
  const [imagePreview, setImagePreview] = useState<string | null>(activity?.image_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    activity?.scheduled_date ? new Date(activity.scheduled_date) : null
  );

  useEffect(() => {
    fetchAgreementsAndInstitutions();
  }, []);

  useEffect(() => {
    if (agreementId) {
      const agreement = agreements.find(a => a.id === agreementId);
      if (agreement) {
        setSelectedAgreement(agreement);
        setUseAgreement(true);
        if (agreement.institution) {
          setInstitutionType(agreement.institution.type);
          updateActivityTypesByInstitutionType(agreement.institution.type);
        }
      }
    } else if (activity?.agreement_id) {
      const agreement = agreements.find(a => a.id === activity.agreement_id);
      if (agreement) {
        setSelectedAgreement(agreement);
        setUseAgreement(true);
        if (agreement.institution) {
          setInstitutionType(agreement.institution.type);
          updateActivityTypesByInstitutionType(agreement.institution.type);
        }
      }
    } else if (activity && !activity.agreement_id && activity.direct_institution) {
      setSelectedInstitution(activity.direct_institution);
      setUseAgreement(false);
      setInstitutionType(activity.direct_institution.type);
      updateActivityTypesByInstitutionType(activity.direct_institution.type);
    }
  }, [agreements, institutions, agreementId, activity]);

  useEffect(() => {
    if (activity?.id) {
      fetchParticipants(activity.id);
      fetchObservations(activity.id);
    }
  }, [activity]);

  useEffect(() => {
    if (formData.scheduled_date) {
      fetchActivitiesForDate(new Date(formData.scheduled_date));
    }
  }, [formData.scheduled_date]);

  useEffect(() => {
    filterInstitutionsByAgreementStatus();
  }, [useAgreement, institutions, agreements]);

  const updateActivityTypesByInstitutionType = (type: string | null) => {
    if (type === 'Presencia de territorios') {
      setActivityTypes(['Punto móvil', 'Feria de servicios', 'Capacitación', 'Otro']);
    } else {
      setActivityTypes(['Taller', 'Capacitación', 'Reunión', 'Evento', 'Visita', 'Otro']);
    }
  };

  const fetchAgreementsAndInstitutions = async () => {
    try {
      setIsLoading(true);

      const { data: agreementsData, error: agreementsError } = await supabase
        .from('agreements')
        .select(`
          *,
          institution:institutions (
            id,
            name,
            logo_url,
            type
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (agreementsError) throw agreementsError;
      setAgreements(agreementsData || []);
      
      const { data: institutionsData, error: institutionsError } = await supabase
        .from('institutions')
        .select('*')
        .order('name');
      
      if (institutionsError) throw institutionsError;
      setInstitutions(institutionsData || []);
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar los datos: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterInstitutionsByAgreementStatus = () => {
    if (institutions.length === 0 || agreements.length === 0) {
      setFilteredInstitutions(institutions);
      return;
    }

    const institutionIdsWithActiveAgreements = new Set(
      agreements
        .filter(agreement => agreement.status === 'active')
        .map(agreement => agreement.institution?.id)
        .filter(Boolean)
    );

    let filtered: Institution[] = [];

    if (useAgreement) {
      filtered = institutions.filter(institution => 
        institutionIdsWithActiveAgreements.has(institution.id)
      );
    } else {
      filtered = institutions.filter(institution => 
        !institutionIdsWithActiveAgreements.has(institution.id)
      );
    }

    setFilteredInstitutions(filtered);
  };

  const fetchParticipants = async (activityId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('activity_participants')
        .select('*')
        .eq('activity_id', activityId);

      if (fetchError) throw fetchError;
      setParticipants(data || []);
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar los aliados: ' + error.message);
    }
  };

  const fetchObservations = async (activityId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('observations')
        .select('*')
        .eq('activity_id', activityId);

      if (fetchError) throw fetchError;
      
      if (data) {
        setObservations(data.map(obs => ({
          title: obs.title,
          description: obs.description,
          activity_type: obs.activity_type
        })));
      }
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar las observaciones: ' + error.message);
    }
  };

  const fetchActivitiesForDate = async (date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];

      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .gte('scheduled_date', `${dateStr}T00:00:00`)
        .lt('scheduled_date', `${dateStr}T23:59:59`);
      
      if (fetchError) throw fetchError;
      
      const filteredActivities = activity?.id 
        ? (data || []).filter(a => a.id !== activity.id)
        : (data || []);
      
      setActivitiesOnSelectedDate(filteredActivities);
    } catch (err) {
      console.error('Error fetching activities for date:', err);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'progress_percentage') {
      const percentage = Math.min(100, Math.max(0, parseInt(value) || 0));
      setFormData(prev => ({
        ...prev,
        [name]: percentage
      }));
    } else if (name === 'scheduled_date') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      if (value) {
        setSelectedDate(new Date(value));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image_file: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAgreementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agreementId = e.target.value;
    const agreement = agreements.find(a => a.id === agreementId);
    setSelectedAgreement(agreement || null);
    
    if (agreement?.institution?.type) {
      setInstitutionType(agreement.institution.type);
      updateActivityTypesByInstitutionType(agreement.institution.type);
    }
  };

  const handleInstitutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const institutionId = e.target.value;
    const institution = filteredInstitutions.find(i => i.id === institutionId);
    setSelectedInstitution(institution || null);
    
    if (institution?.type) {
      setInstitutionType(institution.type);
      updateActivityTypesByInstitutionType(institution.type);
    }
  };

  const handleAddObservation = () => {
    setObservations([
      ...observations,
      { title: '', description: '', activity_type: 'Nota' }
    ]);
  };

  const handleObservationChange = (index: number, field: string, value: string) => {
    const updatedObservations = [...observations];
    updatedObservations[index] = {
      ...updatedObservations[index],
      [field]: value
    };
    setObservations(updatedObservations);
  };

  const handleRemoveObservation = (index: number) => {
    setObservations(observations.filter((_, i) => i !== index));
  };

  const handleUseAgreementChange = (newUseAgreement: boolean) => {
    setUseAgreement(newUseAgreement);
    setSelectedAgreement(null);
    setSelectedInstitution(null);
    setParticipants([]);
    setInstitutionType(null);
    updateActivityTypesByInstitutionType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep < 3) {
      nextStep();
      return;
    }

    setError('');
    setIsSubmitting(true);

    if (useAgreement && !selectedAgreement) {
      setError('Debe seleccionar un convenio');
      setIsSubmitting(false);
      return;
    }

    if (!useAgreement && !selectedInstitution) {
      setError('Debe seleccionar una institución');
      setIsSubmitting(false);
      return;
    }

    if (!formData.municipality) {
      setError('Debe seleccionar un municipio');
      setIsSubmitting(false);
      return;
    }

    try {
      const submissionData = {
        title: formData.title,
        activity_type: formData.activity_type,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        description: formData.description,
        attendee_count: formData.attendee_count,
        status: formData.status as 'en_proceso' | 'finalizado' | 'cancelado',
        progress_percentage: formData.progress_percentage,
        image_url: formData.image_url,
        image_file: formData.image_file,
        agreement_id: useAgreement ? selectedAgreement!.id : undefined,
        institution_id: !useAgreement ? selectedInstitution!.id : undefined,
        municipality: formData.municipality,
        participants,
        observations
      };
      
      await onSubmit(submissionData);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Hubo un error al guardar la actividad');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{isEditing ? 'Editar' : 'Nueva'} Actividad</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <ol className="flex items-center w-full">
          <li className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
            <span className={`flex items-center justify-center w-8 h-8 rounded-full border ${
              currentStep >= 1 ? 'border-blue-600 bg-blue-100' : 'border-gray-300'
            }`}>
              1
            </span>
            <span className="ml-2 text-sm">Información Básica</span>
          </li>
          <div className="w-full mx-2 h-0.5 bg-gray-200"></div>
          <li className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
            <span className={`flex items-center justify-center w-8 h-8 rounded-full border ${
              currentStep >= 2 ? 'border-blue-600 bg-blue-100' : 'border-gray-300'
            }`}>
              2
            </span>
            <span className="ml-2 text-sm">Aliados</span>
          </li>
          <div className="w-full mx-2 h-0.5 bg-gray-200"></div>
          <li className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-500'}`}>
            <span className={`flex items-center justify-center w-8 h-8 rounded-full border ${
              currentStep >= 3 ? 'border-blue-600 bg-blue-100' : 'border-gray-300'
            }`}>
              3
            </span>
            <span className="ml-2 text-sm">Observaciones</span>
          </li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2">
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            {!isEditing && !agreementId && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-blue-700">Tipo de Actividad</span>
                  </div>
                </div>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={useAgreement}
                      onChange={() => handleUseAgreementChange(true)}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Con convenio</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useAgreement}
                      onChange={() => handleUseAgreementChange(false)}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Sin convenio</span>
                  </label>
                </div>
              </div>
            )}

            {useAgreement ? (
              <div>
                <label htmlFor="agreement_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Convenio *
                </label>
                <select
                  id="agreement_id"
                  name="agreement_id"
                  value={selectedAgreement?.id || ''}
                  onChange={handleAgreementChange}
                  disabled={!!agreementId || isEditing}
                  required={useAgreement}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Selecciona un convenio</option>
                  {agreements.map(agreement => (
                    <option key={agreement.id} value={agreement.id}>
                      {agreement.institution?.name} - {new Date(agreement.start_date).toLocaleDateString()} - {agreement.institution?.type || 'Sin tipo'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="institution_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Institución *
                </label>
                <select
                  id="institution_id"
                  name="institution_id"
                  value={selectedInstitution?.id || ''}
                  onChange={handleInstitutionChange}
                  required={!useAgreement}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecciona una institución</option>
                  {filteredInstitutions.map(institution => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name} - {institution.type || 'Sin tipo'}
                    </option>
                  ))}
                </select>
                {filteredInstitutions.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    No hay instituciones sin convenios activos disponibles.
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Título de la Actividad *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="municipality" className="block text-sm font-medium text-gray-700 mb-1">
                Municipio *
              </label>
              <select
                id="municipality"
                name="municipality"
                value={formData.municipality}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar municipio</option>
                {MUNICIPALITIES.map(municipality => (
                  <option key={municipality} value={municipality}>
                    {municipality}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="activity_type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Actividad *
              </label>
              <select
                id="activity_type"
                name="activity_type"
                value={formData.activity_type}
                onChange={handleInputChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar tipo</option>
                {activityTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Programada *
                </label>
                <input
                  type="date"
                  id="scheduled_date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="scheduled_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora Programada *
                </label>
                <input
                  type="time"
                  id="scheduled_time"
                  name="scheduled_time"
                  value={formData.scheduled_time}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {activitiesOnSelectedDate.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <h4 className="font-medium text-blue-700">
                    Actividades programadas para el {formData.scheduled_date}
                  </h4>
                </div>
                <ul className="space-y-2 pl-6">
                  {activitiesOnSelectedDate.map(activity => (
                    <li key={activity.id} className="flex items-center gap-2 text-sm text-blue-600">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>{activity.title} ({formatTime(activity.scheduled_date)})</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  Ten en cuenta estos horarios para evitar conflictos.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="attendee_count" className="block text-sm font-medium text-gray-700 mb-1">
                  Número Esperado de Asistentes *
                </label>
                <input
                  type="number"
                  id="attendee_count"
                  name="attendee_count"
                  value={formData.attendee_count}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en_proceso">En Proceso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            {formData.status === 'en_proceso' && (
              <div>
                <label htmlFor="progress_percentage" className="block text-sm font-medium text-gray-700 mb-1">
                  Porcentaje de Progreso *
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    id="progress_percentage"
                    name="progress_percentage"
                    value={formData.progress_percentage}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="5"
                    className="flex-1"
                  />
                  <div className="w-16 text-center bg-gray-100 px-2 py-1 rounded">
                    {formData.progress_percentage}%
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (opcional)</label>
              
              {imagePreview && (
                <div className="mb-3">
                  <div className="relative w-full max-w-md mx-auto">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, image_file: null, image_url: '' }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors duration-200"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Cargar imagen</span>
                      <input
                        id="image-upload"
                        name="image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="pl-1">o arrastrar y soltar</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-blue-50 p-4 rounded-md flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Añadir Aliados</p>
                <p>Seleccione los miembros de las instituciones que participarán en esta actividad y asígneles un rol.</p>
              </div>
            </div>

            {(useAgreement && selectedAgreement) || (!useAgreement && selectedInstitution) ? (
              <ParticipantSelector
                agreementId={useAgreement ? selectedAgreement!.id : (selectedInstitution!.id || '')}
                initialParticipants={participants}
                onChange={setParticipants}
                useAgreement={useAgreement}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                Debe seleccionar {useAgreement ? 'un convenio' : 'una institución'} para poder añadir Aliados
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Observaciones</h3>
              <button
                type="button"
                onClick={handleAddObservation}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200 text-sm"
              >
                <Plus className="h-4 w-4" />
                Añadir Observación
              </button>
            </div>

            {observations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-md">
                <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <p>No hay observaciones registradas</p>
                <button
                  type="button"
                  onClick={handleAddObservation}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Añadir la primera observación
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {observations.map((observation, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveObservation(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    
                    <div className="space-y-3">
                      <div>
                        <label htmlFor={`obs-title-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Título
                        </label>
                        <input
                          type="text"
                          id={`obs-title-${index}`}
                          value={observation.title}
                          onChange={(e) => handleObservationChange(index, 'title', e.target.value)}
                          required
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor={`obs-type-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          id={`obs-type-${index}`}
                          value={observation.activity_type}
                          onChange={(e) => handleObservationChange(index, 'activity_type', e.target.value)}
                          required
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Nota">Nota</option>
                          <option value="Alerta">Alerta</option>
                          <option value="Recordatorio">Recordatorio</option>
                          <option value="Retroalimentación">Retroalimentación</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor={`obs-desc-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Descripción
                        </label>
                        <textarea
                          id={`obs-desc-${index}`}
                          value={observation.description}
                          onChange={(e) => handleObservationChange(index, 'description', e.target.value)}
                          required
                          rows={3}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-4 mt-6 sticky bottom-0 bg-white">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              Anterior
            </button>
          
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting && (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)}
            {currentStep < 3 ? 'Siguiente' : (isEditing ? 'Guardar Cambios' : 'Crear Actividad')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;