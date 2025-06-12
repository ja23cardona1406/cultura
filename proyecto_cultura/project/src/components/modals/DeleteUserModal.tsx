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

      // Usar Edge Function para eliminar usuario de forma segura
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            userId: user.id
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar usuario');
      }

      toast.success('Usuario eliminado correctamente');
      onClose();
      onUserDeleted();
      
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
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