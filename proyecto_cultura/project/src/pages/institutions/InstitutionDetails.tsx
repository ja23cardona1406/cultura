import React from 'react';
import { ChevronLeft, Edit2, Eye, Plus, Trash2 } from 'lucide-react';
import type { Institution, Member } from '../../types';
import MemberCard from './MemberCard';

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
          Detalles de la Institución
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 animate-fadeIn">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            {institution.logo_url ? (
              <img
                src={institution.logo_url}
                alt={institution.name}
                className="w-24 h-24 object-cover rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">Sin logo</span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{institution.name}</h2>
              <p className="text-gray-600">NIT: {institution.nit}</p>
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
            <h3 className="font-medium text-gray-900 mb-2 pb-2 border-b">Información de Contacto</h3>
            <div className="space-y-2 mt-3">
              <p className="text-gray-600 flex flex-col">
                <span className="text-sm text-gray-500">Email:</span>
                <span>{institution.email}</span>
              </p>
              <p className="text-gray-600 flex flex-col">
                <span className="text-sm text-gray-500">Dirección:</span>
                <span>{institution.address}</span>
              </p>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 pb-2 border-b w-full">Miembros</h3>
            </div>
            
            <button
              onClick={onAddMember}
              className="flex items-center gap-2 mb-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm w-full justify-center"
            >
              <Plus className="h-4 w-4" />
              Agregar Miembro
            </button>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {members.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No hay miembros registrados
                </p>
              ) : (
                members.map(member => (
                  <MemberCard 
                    key={member.id} 
                    member={member} 
                    onViewDetails={onViewMember}
                  />
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