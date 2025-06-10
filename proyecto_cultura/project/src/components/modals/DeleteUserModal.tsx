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

      // Eliminar de la tabla users
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (deleteUserError) throw deleteUserError;

      // Eliminar de profiles
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteProfileError) {
        console.warn('Error deleting profile:', deleteProfileError);
      }

      // Eliminar avatar si existe
      if (user.avatar_url) {
        const avatarPath = user.avatar_url.split('/').pop();
        if (avatarPath) {
          await supabase.storage
            .from('imagenes')
            .remove([`profile/${user.full_name}/${avatarPath}`]);
        }
      }

      toast.success('Usuario eliminado correctamente');
      onClose();
      onUserDeleted();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Error al eliminar usuario: ' + (err instanceof Error ? err.message : String(err)));
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