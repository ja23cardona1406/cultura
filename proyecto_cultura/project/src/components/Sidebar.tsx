import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, FileText, Calendar, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Building2, label: 'Instituciones', path: '/institutions' },
    { icon: FileText, label: 'Convenios', path: '/agreements' },
    { icon: Calendar, label: 'Actividades', path: '/activities' },
    { icon: BarChart2, label: 'Reportes', path: '/reports' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800">DIAN</h1>
      </div>

      {/* User Profile Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full overflow-hidden">
            <img
              alt="Profile"
              src="https://logowik.com/content/uploads/images/dian-direccion-de-impuestos-y-aduanas-nacionales5365.logowik.com.webp"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-gray-800">{user?.email}</h2>
            <p className="text-xs text-gray-500">Admin</p>
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
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={index}
                to={item.path}
                className={`flex items-center px-6 py-3 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Account Section */}
      <div className="border-t border-gray-200">
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
    </div>
  );
};

export default Sidebar;