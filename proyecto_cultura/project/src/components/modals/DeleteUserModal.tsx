import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { User } from '../../types';
import { useSupabase } from '../../contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserDeleted: () => void;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({ isOpen, onClose, user, onUserDeleted }) => {
  const { supabase } = useSupabase();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      // Obtener sesión activa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa');
      }

      // Configurar la URL de la Edge Function
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-admin`;
      
      // Determinar qué ID enviar - priorizar auth_id
      const userIdToSend = (user as any).auth_id || user.id;
      
      console.log('Calling function:', functionUrl);
      console.log('User data:', { 
        userId: userIdToSend, 
        hasAuthId: !!(user as any).auth_id,
        tableId: user.id,
        email: user.email 
      });
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId: userIdToSend
        })
      });

      console.log('Response status:', response.status);
      
      // Verificar si la respuesta es OK
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          errorMessage = errorData.error || errorMessage;
          
          // Mostrar información de debug si está disponible
          if (errorData.debug) {
            console.error('Debug info:', errorData.debug);
          }
        } catch {
          // Si no se puede parsear como JSON, usar el texto
          const errorText = await response.text();
          console.error('Error text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Parsear respuesta exitosa
      const result = await response.json();
      console.log('Success response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar usuario');
      }

      toast.success('Usuario eliminado correctamente');
      onClose();
      onUserDeleted();
      
    } catch (err) {
      console.error('Error deleting user:', err);
      
      let errorMessage = 'Error desconocido';
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Error de conexión. Verifica que la Edge Function esté desplegada y configurada correctamente.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Usuario no encontrado. Puede que ya haya sido eliminado.';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error('Error al eliminar usuario: ' + errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Usuario">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              ¿Estás seguro?
            </h3>
            <p className="text-sm text-gray-600">
              Esta acción eliminará permanentemente al usuario <strong>{user.full_name}</strong> y todos sus datos asociados.
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">
            <strong>Advertencia:</strong> Esta acción no se puede deshacer. Se eliminarán:
          </p>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            <li>Cuenta de usuario</li>
            <li>Perfil y configuraciones</li>
            <li>Imagen de perfil</li>
            <li>Historial de actividades</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors flex items-center"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Eliminando...
              </>
            ) : 'Eliminar Usuario'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteUserModal;