import React from 'react';
import { FileText, Download } from 'lucide-react';

export function Reports() {
  const reports = [
    {
      title: 'Reporte de Actividad: Taller de Capacitación',
      date: '15/03/2024',
      impact: '45 personas impactadas',
      type: 'PDF'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {reports.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-500">Fecha: {report.date}</p>
                    <p className="text-sm text-gray-500">{report.impact}</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                  <Download className="h-4 w-4" />
                  Descargar {report.type}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;