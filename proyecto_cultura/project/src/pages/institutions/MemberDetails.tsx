import React from 'react';
import { ChevronLeft, Edit2, Trash2 } from 'lucide-react';
import type { Member } from '../../types';

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
  return (
    <div className="space-y-6">
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

      <div className="bg-white rounded-lg shadow-md p-6 animate-fadeIn">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.full_name}
                className="w-24 h-24 object-cover rounded-full shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                {member.full_name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{member.full_name}</h2>
              <p className="text-gray-600">{member.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3 pb-2 border-b">Información de Contacto</h3>
            <div className="space-y-3">
              <p className="text-gray-600 flex flex-col">
                <span className="text-sm text-gray-500">Email:</span>
                <span>{member.email}</span>
              </p>
              <p className="text-gray-600 flex flex-col">
                <span className="text-sm text-gray-500">Teléfono:</span>
                <span>{member.phone || 'No especificado'}</span>
              </p>
              <p className="text-gray-600 flex flex-col">
                <span className="text-sm text-gray-500">Departamento:</span>
                <span>{member.department || 'No especificado'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;