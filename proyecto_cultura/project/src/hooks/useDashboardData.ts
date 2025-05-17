import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type TimeRange = {
  startDate: Date;
  endDate: Date;
};

export type DashboardStats = {
  activeAgreements: number;
  monthlyActivities: number;
  institutionsCount: number;
  averageRating: number;
};

export type RecentActivity = {
  id: string;
  title: string;
  activityType: string;
  scheduledDate: string;
  status: string;
  rating: number;
  attendeeCount: number;
  institutionName: string;
};

export type TopRatedActivity = {
  id: string;
  title: string;
  rating: number;
  attendeeCount: number;
};

export type TopRatedMember = {
  id: string;
  fullName: string;
  institutionName: string;
  averageRating: number;
  participationCount: number;
};

export type ChartData = {
  activitiesByType: { name: string; value: number }[];
  activitiesByMonth: { name: string; finalizado: number; planned: number }[];
  ratingDistribution: { name: string; value: number }[];
  institutionParticipation: { name: string; value: number }[];
};

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    activeAgreements: 0,
    monthlyActivities: 0,
    institutionsCount: 0,
    averageRating: 0,
  });
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topRatedActivities, setTopRatedActivities] = useState<TopRatedActivity[]>([]);
  const [topRatedMembers, setTopRatedMembers] = useState<TopRatedMember[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    activitiesByType: [],
    activitiesByMonth: [],
    ratingDistribution: [],
    institutionParticipation: [],
  });
  
  const [timeRange, setTimeRange] = useState<TimeRange>({
    startDate: startOfMonth(subMonths(new Date(), 1)),
    endDate: endOfMonth(new Date()),
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Corregido: Utilizamos un formato ISO para las fechas
  const formatDateForSupabase = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const fetchActiveAgreements = async () => {
    try {
      const startDate = formatDateForSupabase(timeRange.startDate);
      const endDate = formatDateForSupabase(timeRange.endDate);
      
      const { count, error } = await supabase
        .from('agreements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('start_date', startDate)
        .lte('end_date', endDate);

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Error fetching active agreements:', err);
      setError((err as Error).message || 'Error fetching active agreements');
      return 0;
    }
  };

  const fetchMonthlyActivities = async () => {
    try {
      const startDate = formatDateForSupabase(timeRange.startDate);
      const endDate = formatDateForSupabase(timeRange.endDate);
      
      const { count, error } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Error fetching monthly activities:', err);
      setError((err as Error).message || 'Error fetching monthly activities');
      return 0;
    }
  };

  const fetchInstitutionsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('institutions')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Error fetching institutions count:', err);
      setError((err as Error).message || 'Error fetching institutions count');
      return 0;
    }
  };

  // Corregido: Cambiado el enfoque para manejar ratings nulos
  const fetchAverageRating = async () => {
    try {
      const startDate = formatDateForSupabase(timeRange.startDate);
      const endDate = formatDateForSupabase(timeRange.endDate);
      
      // Corregido: Simplificando la consulta y manejando el filtro de nulos después
      const { data, error } = await supabase
        .from('activities')
        .select('rating')
        .eq('status', 'finalizado')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (error) throw error;
      
      if (!data || data.length === 0) return 0;
      
      // Filtramos los ratings nulos en JavaScript
      const validRatings = data.filter(d => d.rating !== null).map(d => d.rating!);
      if (validRatings.length === 0) return 0;
      
      const sum = validRatings.reduce((acc, curr) => acc + curr, 0);
      return parseFloat((sum / validRatings.length).toFixed(1));
    } catch (err) {
      console.error('Error fetching average rating:', err);
      setError((err as Error).message || 'Error fetching average rating');
      return 0;
    }
  };

  const fetchRecentActivities = async () => {
    try {
      // Corregido: Simplificando la consulta para evitar problemas de join
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          title,
          activity_type,
          scheduled_date,
          status,
          rating,
          attendee_count,
          agreement_id
        `)
        .order('scheduled_date', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;
      if (!activitiesData) return [];
      
      // Obtenemos datos de instituciones en una consulta separada
      const agreementIds = activitiesData.map(activity => activity.agreement_id).filter(Boolean);
      
      const institutionMap: Record<string, string> = {};
      if (agreementIds.length > 0) {
        const { data: agreementsData } = await supabase
          .from('agreements')
          .select(`
            id,
            institution_id
          `)
          .in('id', agreementIds);
          
        if (agreementsData && agreementsData.length > 0) {
          const institutionIds = agreementsData.map(a => a.institution_id).filter(Boolean);
          
          if (institutionIds.length > 0) {
            const { data: institutionsData } = await supabase
              .from('institutions')
              .select('id, name')
              .in('id', institutionIds);
              
            if (institutionsData) {
              const instMap: Record<string, string> = {};
              institutionsData.forEach(inst => {
                instMap[inst.id] = inst.name;
              });
              
              agreementsData.forEach(agreement => {
                if (agreement.institution_id && instMap[agreement.institution_id]) {
                  institutionMap[agreement.id] = instMap[agreement.institution_id];
                }
              });
            }
          }
        }
      }
      
      return activitiesData.map(activity => {
        let formattedDate = 'Unknown date';
        try {
          formattedDate = format(parseISO(activity.scheduled_date), 'dd/MM/yyyy');
        } catch (e) {
          console.error('Date parsing error:', e);
        }
        
        return {
          id: activity.id,
          title: activity.title || 'No title',
          activityType: activity.activity_type || 'Unknown',
          scheduledDate: formattedDate,
          status: activity.status || 'Unknown',
          rating: activity.rating || 0,
          attendeeCount: activity.attendee_count || 0,
          institutionName: activity.agreement_id && institutionMap[activity.agreement_id] 
            ? institutionMap[activity.agreement_id]
            : 'Unknown institution'
        };
      });
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      setError((err as Error).message || 'Error fetching recent activities');
      return [];
    }
  };

  // Corregido: Simplificado para evitar el filtro not.is.null
  const fetchTopRatedActivities = async () => {
    try {
      const startDate = formatDateForSupabase(timeRange.startDate);
      const endDate = formatDateForSupabase(timeRange.endDate);
      
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, rating, attendee_count')
        .eq('status', 'finalizado')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('rating', { ascending: false });

      if (error) throw error;
      
      if (!data) return [];
      
      // Filtramos los nulos en JavaScript
      return data
        .filter(activity => activity.rating !== null)
        .map(activity => ({
          id: activity.id,
          title: activity.title || 'No title',
          rating: activity.rating || 0,
          attendeeCount: activity.attendee_count || 0,
        }))
        .slice(0, 5);
    } catch (err) {
      console.error('Error fetching top rated activities:', err);
      setError((err as Error).message || 'Error fetching top rated activities');
      return [];
    }
  };

  const fetchTopRatedMembers = async () => {
    try {
      // Corregido: Simplificando la consulta
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          full_name,
          institution_id
        `);

      if (membersError) throw membersError;
      if (!membersData) return [];

      // Obtenemos los nombres de las instituciones
      const institutionIds = membersData
        .map(member => member.institution_id)
        .filter(Boolean);
        
      const institutionMap: Record<string, string> = {};
      if (institutionIds.length > 0) {
        const { data: institutionsData } = await supabase
          .from('institutions')
          .select('id, name')
          .in('id', institutionIds);
          
        if (institutionsData) {
          institutionsData.forEach(inst => {
            institutionMap[inst.id] = inst.name;
          });
        }
      }

      const memberRatings = await Promise.all(
        membersData.map(async (member) => {
          const { data: ratings } = await supabase
            .from('activity_participants')
            .select('rating')
            .eq('member_id', member.id);

          const validRatings = ratings?.filter(r => r.rating !== null).map(r => r.rating) || [];
          const avgRating = validRatings.length > 0
            ? validRatings.reduce((a, b) => a + (b || 0), 0) / validRatings.length
            : 0;

          const institutionName = member.institution_id && institutionMap[member.institution_id]
            ? institutionMap[member.institution_id]
            : 'Unknown';
          
          return {
            id: member.id,
            fullName: member.full_name || 'Unknown',
            institutionName,
            averageRating: parseFloat(avgRating.toFixed(1)),
            participationCount: validRatings.length,
          };
        })
      );

      return memberRatings
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 5);
    } catch (err) {
      console.error('Error fetching top rated members:', err);
      setError((err as Error).message || 'Error fetching top rated members');
      return [];
    }
  };

  // Corregido: Simplificamos las consultas
  const fetchChartData = async () => {
    try {
      const startDate = formatDateForSupabase(timeRange.startDate);
      const endDate = formatDateForSupabase(timeRange.endDate);
      const sixMonthsAgo = formatDateForSupabase(subMonths(timeRange.startDate, 6));
      
      // Actividades por tipo
      const { data: typeData, error: typeError } = await supabase
        .from('activities')
        .select('activity_type')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (typeError) throw typeError;
      
      const typeCount: Record<string, number> = {};
      typeData?.forEach(activity => {
        const type = activity.activity_type || 'Unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      const activitiesByType = Object.entries(typeCount)
        .map(([name, value]) => ({ name, value }));

      // Actividades por mes
      const { data: monthData, error: monthError } = await supabase
        .from('activities')
        .select('scheduled_date, status')
        .gte('scheduled_date', sixMonthsAgo)
        .lte('scheduled_date', endDate);

      if (monthError) throw monthError;
      
      const monthlyData: Record<string, { finalizado: number; planned: number }> = {};
      
      monthData?.forEach(activity => {
        let monthKey = 'Unknown';
        try {
          monthKey = format(parseISO(activity.scheduled_date), 'MMM yy');
        } catch (e) {
          console.error('Date parsing error:', e);
        }
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { finalizado: 0, planned: 0 };
        }
        
        if (activity.status === 'finalizado') {
          monthlyData[monthKey].finalizado += 1;
        } else {
          monthlyData[monthKey].planned += 1;
        }
      });
      
      const activitiesByMonth = Object.entries(monthlyData)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => {
          try {
            const dateA = new Date(`01 ${a.name}`);
            const dateB = new Date(`01 ${b.name}`);
            return dateA.getTime() - dateB.getTime();
          } catch (e) {
            console.error('Date sorting error:', e);
            return 0;
          }
        });

      // Distribución de ratings
      const { data: ratingData, error: ratingError } = await supabase
        .from('activities')
        .select('rating')
        .eq('status', 'finalizado')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (ratingError) throw ratingError;
      
      const ratingCounts: Record<string, number> = {
        '1 estrella': 0,
        '2 estrellas': 0,
        '3 estrellas': 0,
        '4 estrellas': 0,
        '5 estrellas': 0,
      };
      
      ratingData?.forEach(activity => {
        if (activity.rating !== null) {
          const ratingKey = `${activity.rating} ${activity.rating === 1 ? 'estrella' : 'estrellas'}`;
          ratingCounts[ratingKey] = (ratingCounts[ratingKey] || 0) + 1;
        }
      });
      
      const ratingDistribution = Object.entries(ratingCounts)
        .map(([name, value]) => ({ name, value }));

      // Participación por institución
      const { data: agreementsData, error: agreementsError } = await supabase
        .from('agreements')
        .select('id, institution_id');

      if (agreementsError) throw agreementsError;
      
      const agreementsByInstitution: Record<string, string[]> = {};
      
      agreementsData?.forEach(agreement => {
        if (agreement.institution_id) {
          if (!agreementsByInstitution[agreement.institution_id]) {
            agreementsByInstitution[agreement.institution_id] = [];
          }
          agreementsByInstitution[agreement.institution_id].push(agreement.id);
        }
      });
      
      const { data: institutionsData } = await supabase
        .from('institutions')
        .select('id, name');
        
      const institutionNames: Record<string, string> = {};
      institutionsData?.forEach(inst => {
        institutionNames[inst.id] = inst.name;
      });
      
      const institutionActivities: Record<string, number> = {};
      
      for (const [instId, agreementIds] of Object.entries(agreementsByInstitution)) {
        const { count } = await supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .in('agreement_id', agreementIds);
          
        const instName = institutionNames[instId] || 'Unknown';
        institutionActivities[instName] = count || 0;
      }
      
      const institutionParticipation = Object.entries(institutionActivities)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      return {
        activitiesByType,
        activitiesByMonth,
        ratingDistribution,
        institutionParticipation,
      };
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError((err as Error).message || 'Error fetching chart data');
      return {
        activitiesByType: [],
        activitiesByMonth: [],
        ratingDistribution: [],
        institutionParticipation: [],
      };
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [
        activeAgreements,
        monthlyActivities,
        institutionsCount,
        averageRating,
        recentActivitiesData,
        topRatedActivitiesData,
        topRatedMembersData,
        chartDataResult
      ] = await Promise.all([
        fetchActiveAgreements(),
        fetchMonthlyActivities(),
        fetchInstitutionsCount(),
        fetchAverageRating(),
        fetchRecentActivities(),
        fetchTopRatedActivities(),
        fetchTopRatedMembers(),
        fetchChartData()
      ]);

      setStats({
        activeAgreements,
        monthlyActivities,
        institutionsCount,
        averageRating
      });
      
      setRecentActivities(recentActivitiesData);
      setTopRatedActivities(topRatedActivitiesData);
      setTopRatedMembers(topRatedMembersData);
      setChartData(chartDataResult);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError((err as Error).message || 'Error fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  return {
    stats,
    recentActivities,
    topRatedActivities,
    topRatedMembers,
    chartData,
    timeRange,
    setTimeRange,
    loading,
    error,
    refresh: fetchAllData
  };
}