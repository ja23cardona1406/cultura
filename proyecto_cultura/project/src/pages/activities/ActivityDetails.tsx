import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar, Clock, User, Users, CheckCircle, AlertCircle, FilePlus, Download, Star, MapPin } from 'lucide-react';
import { useIsMobile, useIsTablet } from '../../hooks/useMediaQuery';
import { jsPDF } from 'jspdf';
import { supabase } from '../../lib/supabase';
import type { Activity, Agreement, Institution, Member, ActivityParticipant, Observation, Report } from '../../types';
import ReportForm from './ReportForm';
import RatingForm from './RatingForm';
import StarRating from './StarRating';

interface ActivityDetailsProps {
  activity: Activity & {
    agreement?: Agreement & { institution?: Institution }
  };
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const ActivityDetails: React.FC<ActivityDetailsProps> = ({
  activity,
  onBack,
  onEdit,
  onDelete,
  isDeleting
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const [participants, setParticipants] = useState<(ActivityParticipant & { member?: Member })[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    fetchRelatedData();
    getCurrentUser();
  }, [activity.id]);

  const getCurrentUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      
      if (user) {
        setCurrentUser({ id: user.id });
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error al obtener el usuario actual:', error.message);
    }
  };

  const generatePDF = (reportData: Report) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    const lineHeight = 7;

    doc.setFontSize(20);
    doc.text('Informe de Actividad', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    doc.setFontSize(14);
    doc.text('Detalles de la Actividad', 20, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(12);
    doc.text(`Título: ${activity.title}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Tipo: ${activity.activity_type}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Fecha: ${new Date(activity.scheduled_date).toLocaleDateString()}`, 20, yPosition);
    yPosition += lineHeight;
    
    if (activity.municipality) {
      doc.text(`Municipio: ${activity.municipality}`, 20, yPosition);
      yPosition += lineHeight;
    }
    
    if (activity.agreement?.institution) {
      doc.text(`Institución: ${activity.agreement.institution.name}`, 20, yPosition);
      yPosition += lineHeight;
      
      if (activity.agreement.institution.type) {
        doc.text(`Tipo de institución: ${activity.agreement.institution.type}`, 20, yPosition);
        yPosition += lineHeight;
      }
    }
    
    yPosition += lineHeight;

    doc.setFontSize(14);
    doc.text('Resumen del Informe', 20, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(12);
    const splitSummary = doc.splitTextToSize(reportData.general_summary, pageWidth - 40);
    doc.text(splitSummary, 20, yPosition);
    yPosition += (splitSummary.length * lineHeight) + lineHeight;

    doc.text(`Personas Impactadas: ${reportData.people_impacted}`, 20, yPosition);
    yPosition += lineHeight * 2;

    if (participants.length > 0) {
      doc.setFontSize(14);
      doc.text('Participantes', 20, yPosition);
      yPosition += lineHeight;

      doc.setFontSize(12);
      participants.forEach(participant => {
        if (participant.member) {
          doc.text(`- ${participant.member.full_name} (${participant.role})`, 20, yPosition);
          yPosition += lineHeight;
        }
      });
    }

    doc.save(`informe-${activity.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const fetchRelatedData = async () => {
    try {
      setIsLoading(true);

      const { data: participantsData, error: participantsError } = await supabase
        .from('activity_participants')
        .select(`
          *,
          member:members (*)
        `)
        .eq('activity_id', activity.id);
      
      if (participantsError) throw participantsError;
      
      const { data: observationsData, error: observationsError } = await supabase
        .from('observations')
        .select('*')
        .eq('activity_id', activity.id)
        .order('created_at', { ascending: false });
      
      if (observationsError) throw observationsError;
      
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('activity_id', activity.id)
        .maybeSingle();
      
      if (reportError) throw reportError;
      
      setParticipants(participantsData || []);
      setObservations(observationsData || []);
      setReport(reportData);
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar los datos relacionados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportSubmit = async (formData: {
    general_summary: string;
    people_impacted: number;
  }) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(`Error de autenticación: ${authError.message}`);
      }
      
      if (!user) {
        throw new Error('No hay usuario autenticado. Por favor, inicia sesión nuevamente.');
      }
      
      let savedReport: Report;

      if (report) {
        const { data, error: updateError } = await supabase
          .from('reports')
          .update({
            general_summary: formData.general_summary,
            people_impacted: formData.people_impacted,
          })
          .eq('id', report.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error detallado al actualizar:', updateError);
          throw updateError;
        }
        
        savedReport = data;
        setReport(data);
      } else {
        const { count, error: checkError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('id', user.id);
        
        if (checkError) {
          console.warn('Advertencia: No se pudo verificar si el usuario existe en profiles:', checkError.message);
        }
        
        const { data, error: insertError } = await supabase
          .from('reports')
          .insert([{
            activity_id: activity.id,
            general_summary: formData.general_summary,
            people_impacted: formData.people_impacted,
            generated_by: user.id,
          }])
          .select()
          .single();
        
        if (insertError) {
          console.error('Error detallado al insertar:', insertError);
          
          if (insertError.message.includes('violates foreign key constraint')) {
            throw new Error('Tu usuario no está correctamente vinculado en el sistema. Por favor, contacta al administrador o verifica tu cuenta.');
          }
          
          throw insertError;
        }
        
        savedReport = data;
        setReport(data);
      }
      
      generatePDF(savedReport);
      setIsReportModalOpen(false);
    } catch (err) {
      const error = err as Error;
      setError('Error al guardar el reporte: ' + error.message);
      console.error('Error completo:', err);
    }
  };

  const handleRatingSubmit = async (
    activityRating: number,
    participantRatings: { memberId: string, rating: number }[]
  ) => {
    try {
      const { error: updateActivityError } = await supabase
        .from('activities')
        .update({ rating: activityRating })
        .eq('id', activity.id);

      if (updateActivityError) throw updateActivityError;
      
      const participantUpdates = participantRatings.map(async (p) => {
        const { error: updatePartError } = await supabase
          .from('activity_participants')
          .update({ rating: p.rating })
          .eq('activity_id', activity.id)
          .eq('member_id', p.memberId);
        
        if (updatePartError) throw updatePartError;
      });
      
      await Promise.all(participantUpdates);
      
      setParticipants(prev => prev.map(p => ({
        ...p,
        rating: participantRatings.find(r => r.memberId === p.member_id)?.rating || p.rating
      })));
      
      setIsRatingModalOpen(false);
      
      fetchRelatedData();
    } catch (err) {
      const error = err as Error;
      setError('Error al guardar las calificaciones: ' + error.message);
    }
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

  const getObservationTypeClass = (type: string) => {
    switch(type) {
      case 'Alerta':
        return 'text-red-700 bg-red-100';
      case 'Recordatorio':
        return 'text-yellow-700 bg-yellow-100';
      case 'Retroalimentación':
        return 'text-green-700 bg-green-100';
      default:
        return 'text-blue-700 bg-blue-100';
    }
  };

  const hasParticipantRatings = participants.some(p => p.rating !== null && p.rating > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canGenerateReport = !!currentUser;

  return (
    <div className={`p-6 space-y-6 ${isMobile ? 'px-4' : ''}`}>
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg p-6">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-start'} mb-6`}>
          <div>
            <div className="flex items-center gap-3">
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>{activity.title}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(activity.status)}`}>
                {getStatusIcon(activity.status)}
                <span>{getStatusText(activity.status)}</span>
              </span>
            </div>
            <p className="text-gray-600">{activity.activity_type}</p>
            {activity.municipality && (
              <div className="flex items-center gap-1 mt-1 text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{activity.municipality}</span>
              </div>
            )}
          </div>
          <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
            <button
              onClick={onEdit}
              className={`flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 ${isMobile ? 'flex-1' : ''}`}
              disabled={!activity.is_modifiable}
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className={`flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'flex-1' : ''}`}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>

        {activity.image_url && (
          <div className="mb-6">
            <img
              src={activity.image_url}
              alt={activity.title}
              className="w-full max-h-72 object-cover rounded-lg"
            />
          </div>
        )}

        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-2 gap-6'}`}>
          <div>
            <h3 className="font-medium text-gray-900 mb-3 pb-2 border-b">Información de la Actividad</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Fecha Programada</p>
                  <p>{new Date(activity.scheduled_date).toLocaleDateString()} - {new Date(activity.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Asistentes Esperados</p>
                  <p>{activity.attendee_count} personas</p>
                </div>
              </div>
              
              {activity.status === 'en_proceso' && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Progreso</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${activity.progress_percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {activity.progress_percentage}%
                    </span>
                  </div>
                </div>
              )}

              {activity.rating !== null && activity.rating > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-sm text-gray-500">Calificación General</p>
                    <StarRating initialRating={activity.rating} onChange={() => {}} readOnly size="sm" />
                  </div>
                </div>
              )}
            </div>
            
            <h3 className="font-medium text-gray-900 mt-6 mb-3 pb-2 border-b">Descripción</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{activity.description}</p>
            
            {activity.agreement?.institution && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3 pb-2 border-b">Institución</h3>
                <div className="flex items-center gap-3">
                  {activity.agreement.institution.logo_url ? (
                    <img
                      src={activity.agreement.institution.logo_url}
                      alt={activity.agreement.institution.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{activity.agreement.institution.name}</p>
                    {activity.agreement.institution.type && (
                      <p className="text-sm text-blue-600">
                        {activity.agreement.institution.type}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      Convenio activo desde {new Date(activity.agreement.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 pb-2 border-b w-full">Aliados ({participants.length})</h3>
                {activity.status === 'finalizado' && (
                  <button
                    onClick={() => setIsRatingModalOpen(true)}
                    className="flex items-center gap-1 ml-2 px-3 py-1.5 text-sm bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition-colors"
                  >
                    <Star className="h-4 w-4" />
                    {hasParticipantRatings ? 'Editar Calificaciones' : 'Calificar'}
                  </button>
                )}
              </div>
              
              {participants.length === 0 ? (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-md">
                  No hay participantes registrados
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {participants.map(participant => (
                    participant.member && (
                      <div key={participant.member_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center gap-2">
                          {participant.member.avatar_url ? (
                            <img
                              src={participant.member.avatar_url}
                              alt={participant.member.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                              {participant.member.full_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{participant.member.full_name}</p>
                            <p className="text-xs text-gray-500">{participant.member.institution_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {participant.rating !== null && participant.rating > 0 && (
                            <div className="mr-2">
                              <StarRating initialRating={participant.rating} onChange={() => {}} readOnly size="sm" />
                            </div>
                          )}
                          <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {participant.role}
                          </span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 pb-2 border-b w-full">Observaciones ({observations.length})</h3>
              </div>
              
              {observations.length === 0 ? (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-md">
                  No hay observaciones registradas
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto pr-2 space-y-3">
                  {observations.map(observation => (
                    <div key={observation.id} className="p-3 border rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{observation.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getObservationTypeClass(observation.activity_type)}`}>
                          {observation.activity_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{observation.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(observation.created_at).toLocaleDateString()} {new Date(observation.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900 pb-2 border-b w-full">Informe</h3>
              
              {canGenerateReport ? (
                <button 
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  <FilePlus className="h-4 w-4" />
                  {report ? 'Editar Informe' : 'Generar Informe'}
                </button>
              ) : (
                <button 
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-300 text-gray-600 cursor-not-allowed rounded-md"
                  title="Debes iniciar sesión para generar informes"
                  disabled
                >
                  <FilePlus className="h-4 w-4" />
                  {report ? 'Editar Informe' : 'Generar Informe'}
                </button>
              )}
            </div>
            
            {report ? (
              <div className="border rounded-md p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium">Resumen General</h4>
                  <button
                    onClick={() => generatePDF(report)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Descargar PDF</span>
                  </button>
                </div>
                
                <p className="text-gray-600 mb-4 whitespace-pre-wrap">{report.general_summary}</p>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Personas Impactadas</p>
                      <p className="text-xl font-bold text-blue-800">{report.people_impacted}</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-400 mt-3">
                  Generado el {new Date(report.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-md">
                No hay informe generado para esta actividad
              </div>
            )}
          </div>
        </div>
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <ReportForm
            report={report || undefined}
            onSubmit={handleReportSubmit}
            onCancel={() => setIsReportModalOpen(false)}
            isEditing={!!report}
          />
        </div>
      )}

      {isRatingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <RatingForm
            activity={activity}
            participants={participants}
            onSubmit={handleRatingSubmit}
            onCancel={() => setIsRatingModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ActivityDetails;