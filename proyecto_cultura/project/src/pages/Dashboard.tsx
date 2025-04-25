import React from 'react';
import { Building2, Activity, Users, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Convenios Activos',
      value: '12',
      icon: Building2,
      color: 'blue'
    },
    {
      title: 'Actividades del Mes',
      value: '28',
      icon: Activity,
      color: 'green'
    },
    {
      title: 'Instituciones',
      value: '15',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Calificación Promedio',
      value: '4.5',
      icon: Award,
      color: 'yellow'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        Bienvenido, {user?.email}
      </h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-full bg-${stat.color}-100 text-${stat.color}-600`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-gray-500">{stat.title}</h2>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Actividades Recientes</h2>
          {/* Add your recent activities content here */}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Estadísticas</h2>
          {/* Add your statistics content here */}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;