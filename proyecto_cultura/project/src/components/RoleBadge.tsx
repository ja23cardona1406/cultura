import React from 'react';
import { UserRole } from './UserManagement';

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
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses[role]}`}>
      {roleDisplay[role]}
    </span>
  );
};

export default RoleBadge;