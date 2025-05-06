import type { Activity } from '../types';

export const checkTimeConflicts = (
  scheduledDate: string, 
  activities: Activity[]
): Activity[] => {
  const newActivityDate = new Date(scheduledDate);
  const newActivityDay = new Date(
    newActivityDate.getFullYear(),
    newActivityDate.getMonth(),
    newActivityDate.getDate()
  ).toISOString();
  
  // Get activities on the same day
  const activitiesOnSameDay = activities.filter((activity) => {
    const activityDate = new Date(activity.scheduled_date);
    const activityDay = new Date(
      activityDate.getFullYear(),
      activityDate.getMonth(),
      activityDate.getDate()
    ).toISOString();
    
    return activityDay === newActivityDay;
  });
  
  return activitiesOnSameDay;
};

export const getActivitiesForDay = (
  date: Date, 
  activities: Activity[]
): Activity[] => {
  const day = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).toISOString();
  
  return activities.filter((activity) => {
    const activityDate = new Date(activity.scheduled_date);
    const activityDay = new Date(
      activityDate.getFullYear(),
      activityDate.getMonth(),
      activityDate.getDate()
    ).toISOString();
    
    return activityDay === day;
  });
};

export const formatDateRange = (startDate: Date | null, endDate: Date | null): string => {
  if (!startDate || !endDate) return 'Todas las fechas';
  
  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
};