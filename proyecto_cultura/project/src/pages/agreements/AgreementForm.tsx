import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Agreement, Institution } from '../../types';

interface AgreementFormProps {
  agreement?: Agreement & { institution?: Institution };
  onSubmit: (formData: {
    institution_id: string;
    start_date: string;
    end_date: string;
    description: string;
    pruebas_convenio: string;
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
    description: agreement?.description || '',
    pruebas_convenio: agreement?.pruebas_convenio || ''
  });
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  
  // Estados para manejo de PDFs
  const [uploadedPdfs, setUploadedPdfs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInstitutions();
    // Cargar PDFs existentes si estamos editando
    if (isEditing && agreement?.pruebas_convenio) {
      try {
        const existingPdfs = JSON.parse(agreement.pruebas_convenio);
        if (Array.isArray(existingPdfs)) {
          setUploadedPdfs(existingPdfs);
        }
      } catch (error) {
        console.error('Error parsing existing PDFs:', error);
      }
    }
  }, [isEditing, agreement]);

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

  const getInstitutionName = (institutionId: string) => {
    const institution = institutions.find(inst => inst.id === institutionId);
    return institution?.name || 'unknown';
  };

  const generateFileName = (file: File, institutionId: string) => {
    const institutionName = getInstitutionName(institutionId);
    const timestamp = new Date().getTime();
    const extension = file.name.split('.').pop();
    return `convenio_${institutionName.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.${extension}`;
  };

  // Función para extraer el nombre del archivo desde la URL
  const getPdfFileName = (url: string, index: number) => {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      const fileName = pathSegments[pathSegments.length - 1];
      return fileName || `Documento_${index + 1}.pdf`;
    } catch {
      return `Documento_${index + 1}.pdf`;
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!formData.institution_id) {
      setError('Primero selecciona una institución');
      return;
    }

    setIsUploading(true);
    setError('');

    const newPdfs: string[] = [];
    const institutionName = getInstitutionName(formData.institution_id);
    const folderPath = `documentos/convenios/convenio_${institutionName.toLowerCase().replace(/\s+/g, '_')}`;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tipo de archivo - solo PDFs
        if (file.type !== 'application/pdf') {
          throw new Error(`El archivo ${file.name} no es un PDF válido`);
        }

        // Validar tamaño (máximo 10MB para PDFs)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`El archivo ${file.name} es demasiado grande (máximo 10MB)`);
        }

        const fileName = generateFileName(file, formData.institution_id);
        const filePath = `${folderPath}/${fileName}`;

        // Simular progreso de subida
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const { data, error: uploadError } = await supabase.storage
          .from('imagenes')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('imagenes')
          .getPublicUrl(filePath);

        newPdfs.push(urlData.publicUrl);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }

      setUploadedPdfs(prev => [...prev, ...newPdfs]);
      
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const error = err as Error;
      setError('Error al subir documentos: ' + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDeletePdf = async (pdfUrl: string, index: number) => {
    try {
      // Extraer el path de la URL para eliminar del storage
      const url = new URL(pdfUrl);
      const pathSegments = url.pathname.split('/');
      const bucketIndex = pathSegments.findIndex(segment => segment === 'imagenes');
      
      if (bucketIndex !== -1) {
        const filePath = pathSegments.slice(bucketIndex + 1).join('/');
        
        const { error: deleteError } = await supabase.storage
          .from('imagenes')
          .remove([filePath]);

        if (deleteError) {
          console.error('Error deleting from storage:', deleteError);
          // Continuar aunque haya error en storage
        }
      }

      setUploadedPdfs(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Error deleting PDF:', err);
      setError('Error al eliminar el documento');
    }
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
        date.setDate(date.getDate() + 1);
        submissionData.start_date = date.toISOString().split('T')[0];
      }
      
      // También para la fecha de fin si es necesario
      if (submissionData.end_date) {
        const date = new Date(submissionData.end_date);
        date.setDate(date.getDate() + 1);
        submissionData.end_date = date.toISOString().split('T')[0];
      }

      // Agregar los PDFs como JSON string
      submissionData.pruebas_convenio = JSON.stringify(uploadedPdfs);
      
      await onSubmit(submissionData);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Hubo un error al guardar el convenio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

        {/* Sección de PDFs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Documentos del Convenio (PDFs)
          </label>
          
          {/* Botón de subida */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !formData.institution_id}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Subiendo...' : 'Subir PDFs'}
            </button>
            {!formData.institution_id && (
              <p className="text-xs text-gray-500 mt-1">
                Selecciona una institución primero
              </p>
            )}
          </div>

          {/* Progreso de subida */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mb-4 space-y-2">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">{fileName}</span>
                    <span className="text-gray-500">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lista de PDFs subidos */}
          {uploadedPdfs.length > 0 && (
            <div className="space-y-3">
              {uploadedPdfs.map((pdfUrl, index) => {
                const fileName = getPdfFileName(pdfUrl, index);
                return (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <FileText className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{fileName}</p>
                        <p className="text-sm text-gray-500">Documento PDF</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePdf(pdfUrl, index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors duration-200"
                      title="Eliminar documento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {uploadedPdfs.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-md">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay documentos subidos</p>
              <p className="text-xs text-gray-400 mt-1">Solo se aceptan archivos PDF (máximo 10MB)</p>
            </div>
          )}
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