import React from 'react';
import { AlertCircle, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { Activity } from '../../types';

interface ConflictWarningProps {
  conflictingActivities: Activity[];
  newActivityDate: string;
  onProceed: () => void;
  onCancel: () => void;
}

const ConflictWarning: React.FC<ConflictWarningProps> = ({
  conflictingActivities,
  newActivityDate,
  onProceed,
  onCancel
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM, yyyy");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "HH:mm");
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0">
          <AlertCircle className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Posible conflicto de horario</h2>
          <p className="text-gray-600 mt-1">
            Existen {conflictingActivities.length} actividade(s) programada(s) para el mismo día ({formatDate(newActivityDate)})
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
        <h3 className="text-sm font-medium text-amber-800 mb-2">Actividades programadas:</h3>
        <ul className="space-y-3">
          {conflictingActivities.map((activity) => (
            <li key={activity.id} className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-amber-700 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">{activity.title}</p>
                <div className="flex items-center mt-1">
                  <Calendar className="h-3 w-3 text-amber-600 mr-1" />
                  <p className="text-xs text-amber-700">
                    {formatTime(activity.scheduled_date)}
                  </p>
                </div>
                <p className="text-xs text-amber-600 mt-0.5">{activity.activity_type}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        ¿Deseas continuar con la creación de esta actividad o ajustar el horario para evitar conflictos?
      </p>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
        >
          Ajustar Horario
        </button>
        <button
          onClick={onProceed}
          className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors duration-200"
        >
          Continuar de Todos Modos
        </button>
      </div>
    </div>
  );
};

export default ConflictWarning;