import React, { useState, useEffect } from 'react';
import { FileText, Plus, Eye, Trash2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Agreement, Institution } from '../types';
import AgreementForm from './agreements/AgreementForm';
import AgreementDetails from './agreements/AgreementDetails';
import { useIsMobile, useIsTablet, useIsDesktop } from '../hooks/useMediaQuery';

export function Agreements() {
  const [agreements, setAgreements] = useState<(Agreement & { institution?: Institution })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<(Agreement & { institution?: Institution }) | null>(null);
  const [isDetailsView, setIsDetailsView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Responsive design hooks
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('agreements')
        .select(`
          *,
          institution:institutions (
            id,
            name,
            logo_url
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAgreements(data || []);
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar los convenios: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAgreement = async (agreementId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este convenio?')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('agreements')
        .delete()
        .eq('id', agreementId);

      if (deleteError) throw deleteError;

      setAgreements(prev => prev.filter(agreement => agreement.id !== agreementId));
      
      if (isDetailsView) {
        setIsDetailsView(false);
        setSelectedAgreement(null);
      }
    } catch (err) {
      const error = err as Error;
      setError('Error al eliminar el convenio: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAgreementSubmit = async (formData: {
    institution_id: string;
    start_date: string;
    end_date: string;
    description: string;
  }) => {
    setError('');

    try {
      if (isEditing && selectedAgreement) {
        const { data, error: updateError } = await supabase
          .from('agreements')
          .update({
            institution_id: formData.institution_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            description: formData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAgreement.id)
          .select(`
            *,
            institution:institutions (
              id,
              name,
              logo_url
            )
          `)
          .single();

        if (updateError) throw updateError;

        setAgreements(prev => 
          prev.map(agreement => agreement.id === selectedAgreement.id ? data : agreement)
        );
        setSelectedAgreement(data);
      } else {
        const { data, error: insertError } = await supabase
          .from('agreements')
          .insert([{
            institution_id: formData.institution_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            description: formData.description,
            status: 'active'
          }])
          .select(`
            *,
            institution:institutions (
              id,
              name,
              logo_url
            )
          `)
          .single();

        if (insertError) throw insertError;

        setAgreements(prev => [data, ...prev]);
      }
      
      setIsModalOpen(false);
      setIsEditing(false);
    } catch (err) {
      const error = err as Error;
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Agreement Details View
  if (isDetailsView && selectedAgreement) {
    return (
      <div className={`p-${isMobile ? '3' : '6'}`}>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <AgreementForm
              agreement={selectedAgreement}
              onSubmit={handleAgreementSubmit}
              onCancel={() => {
                setIsModalOpen(false);
                setIsEditing(false);
              }}
              isEditing={isEditing}
            />
          </div>
        )}
        
        <AgreementDetails
          agreement={selectedAgreement}
          onBack={() => {
            setIsDetailsView(false);
            setSelectedAgreement(null);
            setIsEditing(false);
          }}
          onEdit={() => {
            setIsEditing(true);
            setIsModalOpen(true);
          }}
          onDelete={() => handleDeleteAgreement(selectedAgreement.id)}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-${isMobile ? '4' : '6'} p-${isMobile ? '3' : '6'}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Convenios</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-${isMobile ? '3' : '4'} py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200`}
        >
          <Plus className={`h-${isMobile ? '3' : '4'} w-${isMobile ? '3' : '4'}`} />
          {isMobile ? 'Nuevo' : 'Nuevo Convenio'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {agreements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay convenios registrados</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Convenio
                </button>
              </div>
            ) : (
              agreements.map((agreement) => (
                <div key={agreement.id} 
                  className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} p-4 border rounded-lg hover:bg-gray-50 transition-colors duration-200`}
                >
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">{agreement.institution?.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Inicio: {new Date(agreement.start_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 ${isMobile ? 'mt-3 ml-8' : ''}`}>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      agreement.status === 'active' 
                        ? 'text-green-700 bg-green-100' 
                        : 'text-red-700 bg-red-100'
                    }`}>
                      {agreement.status === 'active' ? 'Activo' : 'Finalizado'}
                    </span>
                    <button 
                      onClick={() => {
                        setSelectedAgreement(agreement);
                        setIsDetailsView(true);
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      {!isMobile && 'Ver Detalles'}
                    </button>
                    <button
                      onClick={() => handleDeleteAgreement(agreement.id)}
                      disabled={isDeleting}
                      className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <AgreementForm
            agreement={isEditing ? selectedAgreement || undefined : undefined}
            onSubmit={handleAgreementSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setIsEditing(false);
            }}
            isEditing={isEditing}
          />
        </div>
      )}
    </div>
  );
}

export default Agreements;