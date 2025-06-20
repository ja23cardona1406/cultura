import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Institutions from './pages/Institutions';
import Agreements from './pages/Agreements';
import Activities from './pages/ActivityManagement';
import UserManag from './pages/UserManag';
import { useSupabaseStatus } from './hooks/useSupabaseStatus';

const App: React.FC = () => {
  const isSupabaseDown = useSupabaseStatus();

  return (
    <AuthProvider>
      <Router>
        {/* Banner de alerta */}
        {isSupabaseDown && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              backgroundColor: '#d32f2f',
              color: '#fff',
              padding: '12px',
              textAlign: 'center',
              fontWeight: 'bold',
              zIndex: 9999,
            }}
          >
            🚨 Problemas de conexión con el servidor de la base de datos. Algunas funciones no estarán disponibles.
          </div>
        )}

        <div style={{ marginTop: isSupabaseDown ? '60px' : '0' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="institutions" element={<Institutions />} />
              <Route path="agreements" element={<Agreements />} />
              <Route path="activities" element={<Activities />} />
              <Route path="UserManag" element={<UserManag />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
