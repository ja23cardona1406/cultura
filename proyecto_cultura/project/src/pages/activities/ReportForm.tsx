import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import type { Report } from '../../types';

interface ReportFormProps {
  report?: Report;
  onSubmit: (formData: {
    general_summary: string;
    people_impacted: number;
  }) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

const ReportForm: React.FC<ReportFormProps> = ({
  report,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState({
    general_summary: report?.general_summary || '',
    people_impacted: report?.people_impacted || 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'people_impacted') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Hubo un error al guardar el informe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">{isEditing ? 'Editar' : 'Generar'} Informe</h2>
        </div>
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
          <label htmlFor="general_summary" className="block text-sm font-medium text-gray-700 mb-1">
            Resumen General *
          </label>
          <textarea
            id="general_summary"
            name="general_summary"
            value={formData.general_summary}
            onChange={handleInputChange}
            required
            rows={6}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Escribe un resumen detallado de los resultados y logros de la actividad..."
          />
        </div>

        <div>
          <label htmlFor="people_impacted" className="block text-sm font-medium text-gray-700 mb-1">
            Número de Personas Impactadas *
          </label>
          <input
            type="number"
            id="people_impacted"
            name="people_impacted"
            value={formData.people_impacted}
            onChange={handleInputChange}
            min="0"
            required
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
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isEditing ? 'Actualizar Informe' : 'Generar Informe'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportForm;