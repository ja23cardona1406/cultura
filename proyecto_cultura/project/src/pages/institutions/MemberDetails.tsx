import React from 'react';
import { ChevronLeft, Edit2, Trash2 } from 'lucide-react';
import type { Member } from '../../types';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface MemberDetailsProps {
  member: Member;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const MemberDetails: React.FC<MemberDetailsProps> = ({
  member,
  onBack,
  onEdit,
  onDelete,
  isDeleting
}) => {
  const isMobile = useIsMobile();

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
          Detalles del Miembro
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.full_name}
                className="w-16 h-16 object-cover rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-xl">
                  {member.full_name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{member.full_name}</h2>
              <p className="text-sm text-gray-500">{member.role}</p>
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
                {member.email}
              </p>
              <p className="text-gray-600">
                <span className="text-sm text-gray-500 block">Teléfono:</span>
                {member.phone || 'No especificado'}
              </p>
              <p className="text-gray-600">
                <span className="text-sm text-gray-500 block">Departamento:</span>
                {member.department || 'No especificado'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;