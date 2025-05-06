import React from 'react';
import { Eye } from 'lucide-react';
import type { Member } from '../../types';

interface MemberCardProps {
  member: Member;
  onViewDetails: (member: Member) => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ 
  member, 
  onViewDetails 
}) => {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors duration-200">
      <div className="flex items-center gap-2">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.full_name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
            {member.full_name.charAt(0)}
          </div>
        )}
        <div>
          <span className="font-medium">{member.full_name}</span>
          <p className="text-xs text-gray-500">{member.role}</p>
        </div>
      </div>
      <button
        onClick={() => onViewDetails(member)}
        className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors duration-200"
        aria-label="Ver detalles"
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
};

export default MemberCard;