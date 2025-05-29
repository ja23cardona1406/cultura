import React from 'react';
import UserManagement from '../components/UserManagement';
import { Toaster } from 'react-hot-toast';
import { SupabaseProvider } from '../contexts/SupabaseContext';

function  UserManag() {
  return (
    <SupabaseProvider>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Panel de Administración
            </h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <UserManagement />
          </div>
        </main>
        <Toaster position="top-right" />
      </div>
    </SupabaseProvider>
  );
}

export default UserManag;