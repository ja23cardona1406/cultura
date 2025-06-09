import React from 'react';
import { User } from 'lucide-react';
import { User as UserType } from '../types';

interface UserAvatarProps {
  user: UserType;
  size?: 'sm' | 'md' | 'lg';
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <>
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.full_name}
          className={`${sizeClasses[size]} rounded-full object-cover bg-gray-100`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center`}>
          <User className={`${iconSizes[size]} text-gray-500`} />
        </div>
      )}
    </>
  );
};

export default UserAvatar;