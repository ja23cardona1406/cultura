import React from 'react';
import { ChevronLeft, Edit2, Eye, Plus, Trash2 } from 'lucide-react';
import type { Institution, Member, InstitutionType } from '../../types';
import MemberCard from './MemberCard';
import { useIsMobile, useIsTablet } from '../../hooks/useMediaQuery';

interface InstitutionDetailsProps {
  institution: Institution;
  members: Member[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddMember: () => void;
  onViewMember: (member: Member) => void;
  isDeleting: boolean;
}

const InstitutionDetails: React.FC<InstitutionDetailsProps> = ({
  institution,
  members,
  onBack,
  onEdit,
  onDelete,
  onAddMember,
  onViewMember,
  isDeleting
}) => {
  const isMobile = useIsMobile();
  
  const getInstitutionTypeLabel = (type: InstitutionType | null): string => {
  if (!type) return 'No especificado';

  const typeLabels: Record<InstitutionType, string> = {
    'NAF': 'NAF',
    'Cultura de la contribución en la escuela': 'Cultura en la escuela',
    'Presencia de territorios': 'Presencia en territorios',
    'DIAN': 'DIAN',
  };

  // Retorna la etiqueta si existe, sino un valor por defecto
  return typeLabels[type] ?? 'Tipo desconocido';
};


  return (
    <div className={`space-y-${isMobile ? '4' : '6'}`}>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Volver
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          Detalles de la Institución
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            {institution.logo_url ? (
              <img
                src={institution.logo_url}
                alt={institution.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xl font-medium">
                  {institution.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{institution.name}</h2>
              <p className="text-sm text-gray-500">NIT: {institution.nit}</p>
              <div className="mt-1">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {getInstitutionTypeLabel(institution.type)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
            >
              <Edit2 className="h-4 w-4" />
              {!isMobile && 'Editar'}
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              {!isMobile && 'Eliminar'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-4 pb-2 border-b">
              Información de Contacto
            </h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                <span className="text-sm text-gray-500 block">Email:</span>
                {institution.email}
              </p>
              <p className="text-gray-600">
                <span className="text-sm text-gray-500 block">Dirección:</span>
                {institution.address}
              </p>
              <p className="text-gray-600">
                <span className="text-sm text-gray-500 block">Tipo de Institución:</span>
                {getInstitutionTypeLabel(institution.type)}
              </p>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 pb-2 border-b w-full">
                Miembros
              </h3>
            </div>
            
            <button
              onClick={onAddMember}
              className={`flex items-center gap-2 mb-4 px-${isMobile ? '3' : '4'} py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 w-full justify-center`}
            >
              <Plus className="h-4 w-4" />
              Agregar Miembro
            </button>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {members.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No hay miembros registrados
                </p>
              ) : (
                members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {member.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{member.full_name}</h4>
                        <p className="text-sm text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onViewMember(member)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionDetails;