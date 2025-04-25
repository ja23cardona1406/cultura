import React from 'react';
import { FileText, Plus } from 'lucide-react';

export function Agreements() {
  const agreements = [
    {
      title: 'Convenio de Cooperación Académica',
      institution: 'Universidad Nacional de Colombia',
      startDate: '01/01/2024',
      status: 'active'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Convenios</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Nuevo Convenio
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {agreements.map((agreement, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">{agreement.title}</h3>
                    <p className="text-sm text-gray-500">{agreement.institution}</p>
                    <p className="text-sm text-gray-500">Inicio: {agreement.startDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    Activo
                  </span>
                  <button className="text-blue-600 hover:text-blue-800">
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Agreements;