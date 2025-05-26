import React, { useState } from 'react';
import { ChevronLeft, Edit2, Trash2, Building2, Calendar, Clock, FileText, X, Download, Eye } from 'lucide-react';
import type { Agreement, Institution } from '../../types';
import { useIsMobile, useIsTablet } from '../../hooks/useMediaQuery';

interface AgreementDetailsProps {
  agreement: Agreement & { institution?: Institution };
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const AgreementDetails: React.FC<AgreementDetailsProps> = ({
  agreement,
  onBack,
  onEdit,
  onDelete,
  isDeleting
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  // Parsear los PDFs del convenio
  const getAgreementPdfs = () => {
    try {
      if (!agreement.pruebas_convenio) return [];
      const pdfs = JSON.parse(agreement.pruebas_convenio);
      return Array.isArray(pdfs) ? pdfs : [];
    } catch (error) {
      console.error('Error parsing agreement PDFs:', error);
      return [];
    }
  };

  const agreementPdfs = getAgreementPdfs();

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

  // Función para descargar PDF
  const handleDownloadPdf = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar el archivo');
    }
  };

  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-4'} mb-6`}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Volver
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          Detalles del Convenio
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className={`${isMobile ? 'flex-col gap-4' : 'flex justify-between items-start'} mb-6`}>
          <div className="flex items-center gap-4">
            {agreement.institution?.logo_url ? (
              <img
                src={agreement.institution.logo_url}
                alt={agreement.institution.name}
                className={`object-cover rounded-lg ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}
              />
            ) : (
              <Building2 className={`text-gray-400 ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`} />
            )}
            <div>
              <h2 className="text-xl font-semibold">{agreement.institution?.name}</h2>
              <span className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${
                agreement.status === 'active' 
                  ? 'text-green-700 bg-green-100' 
                  : 'text-red-700 bg-red-100'
              }`}>
                {agreement.status === 'active' ? 'Activo' : 'Finalizado'}
              </span>
            </div>
          </div>
          <div className={`flex gap-2 ${isMobile ? 'mt-4' : ''}`}>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-2 gap-6'}`}>
          <div>
            <h3 className="font-medium text-gray-900 mb-3 pb-2 border-b">Información del Convenio</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Fecha de Inicio</p>
                  <p>{new Date(agreement.start_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              {agreement.end_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Finalización</p>
                    <p>{new Date(agreement.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Última Actualización</p>
                  <p>{new Date(agreement.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-3 pb-2 border-b">Descripción</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{agreement.description}</p>
          </div>
        </div>

        {/* Sección de Documentos del Convenio */}
        <div className="mt-8">
          <h3 className="font-medium text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos del Convenio
          </h3>
          
          {agreementPdfs.length > 0 ? (
            <div className="space-y-3">
              {agreementPdfs.map((pdfUrl: string, index: number) => {
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPdf(pdfUrl)}
                        className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                        title="Ver documento"
                      >
                        <Eye className="h-4 w-4" />
                        {!isMobile && 'Ver'}
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(pdfUrl, fileName)}
                        className="flex items-center gap-1 px-3 py-2 text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200"
                        title="Descargar documento"
                      >
                        <Download className="h-4 w-4" />
                        {!isMobile && 'Descargar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-md">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay documentos disponibles</p>
              <p className="text-sm text-gray-400 mt-1">
                Edita el convenio para agregar documentos PDF
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para ver PDF */}
      {selectedPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative w-full max-w-4xl h-full max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Visualizador de Documento</h3>
              <button
                onClick={() => setSelectedPdf(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="h-full">
              <iframe
                src={selectedPdf}
                className="w-full h-full border-0"
                title="Documento PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgreementDetails;