import React from 'react';
import { Clock, Star } from 'lucide-react';
import type { RecentActivity } from '../../hooks/useDashboardData';

interface ActivityListProps {
  activities: RecentActivity[];
  loading: boolean;
  title: string;
}

export function ActivityList({ activities, loading, title }: ActivityListProps) {
  // Status badge colors
  const statusColors: Record<string, string> = {
    finalizado: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    planned: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const getStatusColor = (status: string) => {
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center">
              <div className="bg-gray-200 h-10 w-10 rounded-full"></div>
              <div className="ml-3 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="mt-2 h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-500 text-center py-6">No hay actividades disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium"
            >
              {getInitials(activity.institutionName)}
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">{activity.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(activity.status)}`}>
                  {activity.status === 'finalizado' ? 'Completada' : 
                   activity.status === 'in_progress' ? 'En progreso' : 
                   activity.status === 'planned' ? 'Planificada' : 'Cancelada'}
                </span>
              </div>
              <div className="mt-1 flex items-center text-xs text-gray-500">
                <div className="flex items-center mr-3">
                  <Clock size={14} className="mr-1" />
                  {activity.scheduledDate}
                </div>
                <div className="flex items-center">
                  <Star size={14} className="mr-1 text-yellow-500" />
                  {activity.rating > 0 ? activity.rating.toFixed(1) : 'Sin calificar'}
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {activity.institutionName} • {activity.activityType}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}