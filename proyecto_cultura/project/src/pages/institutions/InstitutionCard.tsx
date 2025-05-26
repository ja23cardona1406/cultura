import React from 'react';
import { Building2, Eye, Trash2 } from 'lucide-react';
import type { Institution, InstitutionType } from '../../types';

interface InstitutionCardProps {
  institution: Institution;
  onViewDetails: (institution: Institution) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const InstitutionCard: React.FC<InstitutionCardProps> = ({ 
  institution, 
  onViewDetails,
  onDelete,
  isDeleting
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

type InstitutionType =
  | 'NAF'
  | 'Cultura de la contribución en la escuela'
  | 'Presencia de territorios'
  | 'DIAN';
const getInstitutionTypeLabel = (type: InstitutionType | null): string => {
  if (!type) return 'No especificado';

  const typeLabels: Record<InstitutionType, string> = {
    'NAF': 'NAF',
    'Cultura de la contribución en la escuela': 'Cultura en la escuela',
    'Presencia de territorios': 'Presencia en territorios',
    'DIAN': 'DIAN'
  };

  return typeLabels[type];
};


  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center">
        {institution.logo_url ? (
          <img
            src={institution.logo_url}
            alt={institution.name}
            className="h-12 w-12 rounded-full object-cover mr-3"
          />
        ) : (
          <Building2 className="h-12 w-12 text-gray-500 mr-3" />
        )}
        <div>
          <h3 className="font-medium text-gray-900">{institution.name}</h3>
          <p className="text-sm text-gray-500">NIT: {institution.nit}</p>
          <p className="text-sm text-gray-500">Email: {institution.email}</p>
          <p className="text-sm text-gray-500">Dirección: {institution.address}</p>
          <p className="text-sm text-gray-500">
            Tipo: <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
              {getInstitutionTypeLabel(institution.type)}
            </span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => onViewDetails(institution)}
          className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
        >
          <Eye className="h-4 w-4" />
          <span>Ver Detalles</span>
        </button>
        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4" />
          <span>Eliminar</span>
        </button>
      </div>
    </div>
  );
};

export default InstitutionCard;