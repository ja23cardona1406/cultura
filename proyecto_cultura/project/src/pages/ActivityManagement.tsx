import React, { useState } from 'react';
import ActivityList from './Activities';
import { Building2 } from 'lucide-react';

const ActivityManagement: React.FC = () => {
  const [agreementId, setAgreementId] = useState<string | undefined>(undefined);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Actividades</h1>
        </div>
      </div>
      
      <ActivityList agreementId={agreementId} />
    </div>
  );
};

export default ActivityManagement;