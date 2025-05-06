import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Agreement, Institution } from '../../types';

interface AgreementFormProps {
  agreement?: Agreement & { institution?: Institution };
  onSubmit: (formData: {
    institution_id: string;
    start_date: string;
    end_date: string;
    description: string;
  }) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

const AgreementForm: React.FC<AgreementFormProps> = ({
  agreement,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState({
    institution_id: agreement?.institution_id || '',
    start_date: agreement?.start_date ? new Date(agreement.start_date).toISOString().split('T')[0] : '',
    end_date: agreement?.end_date ? new Date(agreement.end_date).toISOString().split('T')[0] : '',
    description: agreement?.description || ''
  });
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('institutions')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;

      setInstitutions(data || []);
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar las instituciones: ' + error.message);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate dates when either start or end date changes
    if (name === 'start_date' || name === 'end_date') {
      validateDates({
        ...formData,
        [name]: value
      });
    }
  };

  const validateDates = (data: typeof formData) => {
    setDateError('');
    
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate < startDate) {
        setDateError('La fecha de finalización debe ser posterior a la fecha de inicio');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    // Final validation before submission
    if (!validateDates(formData)) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Crear una copia del formData para no modificar el estado directamente
      const submissionData = {...formData};
      
      // Sumar un día a la fecha de inicio para compensar el problema de zona horaria
      if (submissionData.start_date) {
        const date = new Date(submissionData.start_date);
        date.setDate(date.getDate() + 1); // Añadir un día
        submissionData.start_date = date.toISOString().split('T')[0];
      }
      
      // También para la fecha de fin si es necesario
      if (submissionData.end_date) {
        const date = new Date(submissionData.end_date);
        date.setDate(date.getDate() + 1); // Añadir un día
        submissionData.end_date = date.toISOString().split('T')[0];
      }
      
      await onSubmit(submissionData);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Hubo un error al guardar el convenio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {isEditing ? 'Editar' : 'Nuevo'} Convenio
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="institution_id" className="block text-sm font-medium text-gray-700 mb-1">
            Institución
          </label>
          <select
            id="institution_id"
            name="institution_id"
            value={formData.institution_id}
            onChange={handleInputChange}
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecciona una institución</option>
            {institutions.map(institution => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Finalización
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {dateError && (
          <div className="p-2 bg-yellow-100 text-yellow-800 rounded-md text-sm">
            {dateError}
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !!dateError}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isEditing ? 'Guardar Cambios' : 'Crear Convenio'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgreementForm;