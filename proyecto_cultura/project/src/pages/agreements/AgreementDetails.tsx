import React from 'react';
import { ChevronLeft, Edit2, Trash2, Building2, Calendar, Clock } from 'lucide-react';
import type { Agreement, Institution } from '../../types';
import { useIsMobile, useIsTablet } from '../../hooks/useMediaQuery';

interface AgreementDetailsProps {
  agreement: Agreement & { institution?: Institution };
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const AgreementDetails: React.FC<AgreementDetailsProps> = ({
  agreement,
  onBack,
  onEdit,
  onDelete,
  isDeleting
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-4'} mb-6`}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Volver
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          Detalles del Convenio
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className={`${isMobile ? 'flex-col gap-4' : 'flex justify-between items-start'} mb-6`}>
          <div className="flex items-center gap-4">
            {agreement.institution?.logo_url ? (
              <img
                src={agreement.institution.logo_url}
                alt={agreement.institution.name}
                className={`object-cover rounded-lg ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}
              />
            ) : (
              <Building2 className={`text-gray-400 ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`} />
            )}
            <div>
              <h2 className="text-xl font-semibold">{agreement.institution?.name}</h2>
              <span className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${
                agreement.status === 'active' 
                  ? 'text-green-700 bg-green-100' 
                  : 'text-red-700 bg-red-100'
              }`}>
                {agreement.status === 'active' ? 'Activo' : 'Finalizado'}
              </span>
            </div>
          </div>
          <div className={`flex gap-2 ${isMobile ? 'mt-4' : ''}`}>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-2 gap-6'}`}>
          <div>
            <h3 className="font-medium text-gray-900 mb-3 pb-2 border-b">Información del Convenio</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Fecha de Inicio</p>
                  <p>{new Date(agreement.start_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              {agreement.end_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Finalización</p>
                    <p>{new Date(agreement.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Última Actualización</p>
                  <p>{new Date(agreement.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-3 pb-2 border-b">Descripción</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{agreement.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgreementDetails;