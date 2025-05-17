import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Agregamos logs para depuración
  console.log('PrivateRoute - Estado de autenticación:', { user, loading, path: location.pathname });
  
  // Solo mostramos indicador de carga si estamos en proceso de autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-700">Cargando...</p>
        </div>
      </div>
    );
  }
  
  // Si no hay usuario autenticado y no estamos cargando, redirigimos al login
  if (!user) {
    console.log('Usuario no autenticado, redirigiendo a /login');
    // Guardamos la ubicación actual para redirigir después de iniciar sesión
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Si se requiere un rol específico y el usuario no lo tiene
  if (requiredRole && user.role !== requiredRole) {
    console.log(`Usuario no tiene el rol requerido: ${requiredRole}`);
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Todo está bien, mostramos el contenido protegido
  return <>{children}</>;
};

export default PrivateRoute;