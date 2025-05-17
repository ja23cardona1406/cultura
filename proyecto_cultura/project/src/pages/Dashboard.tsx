import React, { useState } from 'react';
import { Building2, Activity, Users, Award, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from './dashboard/StatCard';
import { ActivityList } from './dashboard/ActivityList';
import { TimeRangeSelector } from './dashboard/TimeRangeSelector';
import { LineChart } from './dashboard/charts/LineChart';
import { BarChart } from './dashboard/charts/BarChart';
import { PieChart } from './dashboard/charts/PieChart';
import { CompositeChart } from './dashboard/charts/CompositeChart';
import { MemberRatingsTable } from './dashboard/MemberRatingsTable';
import { useDashboardData } from '../hooks/useDashboardData';

export function Dashboard() {
  const { user } = useAuth();
  const { 
    stats,
    recentActivities,
    topRatedActivities,
    topRatedMembers,
    chartData,
    timeRange,
    setTimeRange,
    loading,
    error,
    refresh
  } = useDashboardData();

  const pieChartColors = [
    '#3B82F6', // blue-500
    '#10B981', // green-500
    '#8B5CF6', // purple-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
  ];

  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4 sm:mb-0">
          Bienvenido, {user?.email || 'Usuario'}
        </h1>
        
        <div className="flex space-x-3">
          <button 
            onClick={handleRefresh} 
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <RefreshCw size={16} className="mr-2" />
            Actualizar
          </button>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error al cargar datos: {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Convenios Activos" 
          value={stats.activeAgreements} 
          icon={Building2} 
          color="blue"
          loading={loading} 
        />
        <StatCard 
          title="Actividades del Período" 
          value={stats.monthlyActivities} 
          icon={Activity} 
          color="green"
          loading={loading} 
        />
        <StatCard 
          title="Instituciones" 
          value={stats.institutionsCount} 
          icon={Users} 
          color="purple"
          loading={loading} 
        />
        <StatCard 
          title="Calificación Promedio" 
          value={stats.averageRating} 
          icon={Award} 
          color="yellow"
          loading={loading} 
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityList 
          activities={recentActivities} 
          loading={loading} 
          title="Actividades Recientes" 
        />
        <MemberRatingsTable 
          members={topRatedMembers} 
          loading={loading} 
          title="Miembros Mejor Calificados" 
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LineChart 
          data={chartData.activitiesByMonth} 
          lines={[
            { dataKey: 'finalizado', color: '#10B981', name: 'Completadas' },
            { dataKey: 'planned', color: '#3B82F6', name: 'Planificadas' }
          ]}
          title="Tendencia de Actividades"
          loading={loading}
        />
        <BarChart 
          data={chartData.institutionParticipation} 
          bars={[
            { dataKey: 'value', color: '#8B5CF6', name: 'Actividades' }
          ]}
          title="Participación por Institución"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieChart 
          data={chartData.activitiesByType} 
          colors={pieChartColors}
          title="Distribución por Tipo de Actividad"
          loading={loading}
        />
        <CompositeChart 
          data={chartData.activitiesByMonth} 
          bars={[
            { dataKey: 'planned', color: '#3B82F6', name: 'Planificadas' }
          ]}
          lines={[
            { dataKey: 'finalizado', color: '#10B981', name: 'Completadas' }
          ]}
          title="Comparativa de Actividades"
          loading={loading}
        />
      </div>
    </div>
  );
}

export default Dashboard;