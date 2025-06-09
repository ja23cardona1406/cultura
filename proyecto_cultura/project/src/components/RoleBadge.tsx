import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: UserRole;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const badgeClasses = {
    admin: 'bg-purple-100 text-purple-800',
    dian: 'bg-blue-100 text-blue-800',
    institucion: 'bg-yellow-100 text-yellow-800',
    user: 'bg-green-100 text-green-800'
  };

  const roleDisplay = {
    admin: 'Administrador',
    dian: 'DIAN',
    institucion: 'Institución',
    user: 'Usuario'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClasses[role]}`}>
      {roleDisplay[role]}
    </span>
  );
};

export default RoleBadge;