import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Detectar cambios en el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Verificar tamaño inicial

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Incluir el Sidebar responsivo */}
      <Sidebar />
      
      {/* Contenido principal */}
      <main className="flex-1 overflow-auto relative">
        <div className={`${isMobile ? 'pt-16' : ''} p-4 md:p-6 lg:p-8 h-full`}>
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;