import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Calendar, 
  BarChart2, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Definición de tipos para TypeScript
interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Función para manejar el cambio de tamaño de ventana
  const handleResize = useCallback(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    
    // Si cambia de móvil a desktop, asegurarse de que el sidebar esté visible
    if (!mobile && !isOpen) {
      setIsOpen(false); // No necesitamos toggle en desktop
    }
  }, [isOpen]);

  // Configurar listener para el cambio de tamaño de ventana
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize(); // Comprobar tamaño inicial
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Cerrar sidebar cuando cambia la ubicación en móvil
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location, isMobile]);

  const toggleSidebar = (): void => {
    setIsOpen(!isOpen);
  };

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Building2, label: 'Instituciones', path: '/institutions' },
    { icon: FileText, label: 'Convenios', path: '/agreements' },
    { icon: Calendar, label: 'Actividades', path: '/activities' },
    { icon: BarChart2, label: 'Reportes', path: '/reports' },
  ];

  // Contenido del sidebar que será reutilizado
  const sidebarContent = (
    <>
      {/* User Profile Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-300">
            <img
                alt="Profile"
        src={user?.avatar_url || "/api/placeholder/40/40"}
        className="h-full w-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-semibold text-sm text-gray-800 truncate">{user?.full_name || 'Usuario'}</h2>
            <p className="text-xs text-gray-500">{user?.role || 'viewer'}</p>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1">
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Navegación
          </h3>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={index}
                to={item.path}
                className={`flex items-center px-6 py-3 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => {
                  if (isMobile) {
                    setIsOpen(false);
                  }
                }}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Account Section */}
      <div className="border-t border-gray-200 mt-auto">
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Cuenta
          </h3>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center w-full px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5 mr-3 text-gray-400" />
          Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Botón hamburguesa para móviles */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-md bg-white shadow-md"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay de fondo cuando el sidebar está abierto en móviles */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar para móviles (oculto por defecto) */}
      <div
        className={`fixed inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">DIAN</h1>
          <button onClick={toggleSidebar} className="md:hidden">
            <X size={24} />
          </button>
        </div>
        {sidebarContent}
      </div>

      {/* Sidebar para escritorio (siempre visible) */}
      <div className="hidden md:flex md:flex-col w-64 bg-white shadow-lg h-full">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800">DIAN</h1>
        </div>
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;