import React, { useState } from 'react';
import { Star, Save, X, UserCheck } from 'lucide-react';
import StarRating from './StarRating';
import type { Activity, ActivityParticipant, Member } from '../../types';

interface RatingFormProps {
  activity: Activity;
  participants: (ActivityParticipant & { member?: Member })[];
  onSubmit: (activityRating: number, participantRatings: { memberId: string, rating: number }[]) => Promise<void>;
  onCancel: () => void;
}

const RatingForm: React.FC<RatingFormProps> = ({
  activity,
  participants,
  onSubmit,
  onCancel
}) => {
  const [activityRating, setActivityRating] = useState<number>(activity.rating || 0);
  const [participantRatings, setParticipantRatings] = useState<{ memberId: string, rating: number }[]>(
    participants.map(p => ({ 
      memberId: p.member_id, 
      rating: p.rating || 0 
    }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleParticipantRatingChange = (memberId: string, rating: number) => {
    setParticipantRatings(prev => 
      prev.map(p => p.memberId === memberId ? { ...p, rating } : p)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await onSubmit(activityRating, participantRatings);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Error al guardar las calificaciones');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400" />
          <h2 className="text-xl font-semibold">Calificación de Desempeño</h2>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border-b pb-4">
          <h3 className="font-medium text-gray-900 mb-3">Calificación General de la Actividad</h3>
          <div className="p-4 bg-blue-50 rounded-md">
            <p className="mb-3 text-blue-700 text-sm">{activity.title}</p>
            <div className="flex items-center">
              <StarRating 
                initialRating={activityRating} 
                onChange={setActivityRating}
                size="lg"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900">Calificación de Participantes</h3>
          </div>
          
          {participants.length === 0 ? (
            <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-md">
              No hay participantes registrados para calificar
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {participants.map(participant => (
                participant.member && (
                  <div key={participant.member_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      {participant.member.avatar_url ? (
                        <img
                          src={participant.member.avatar_url}
                          alt={participant.member.full_name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {participant.member.full_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{participant.member.full_name}</p>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {participant.role}
                        </span>
                      </div>
                    </div>
                    <StarRating 
                      initialRating={participantRatings.find(p => p.memberId === participant.member_id)?.rating || 0} 
                      onChange={(rating) => handleParticipantRatingChange(participant.member_id, rating)}
                    />
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Calificaciones
          </button>
        </div>
      </form>
    </div>
  );
};

export default RatingForm;