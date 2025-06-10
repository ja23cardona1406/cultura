import React, { useState, useEffect } from 'react';
import { Upload, X, Eye, EyeOff, Key, Mail } from 'lucide-react';
import Modal from './Modal';
import { User, UserRole } from '../../types';
import { useSupabase } from '../../contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onUserUpdated }) => {
  const { supabase } = useSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user.avatar_url);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    role: user.role
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Obtener el email del usuario si no está disponible
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (user.email) {
        setUserEmail(user.email);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('email')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user email:', error);
          toast.error('Error al obtener el email del usuario');
          return;
        }

        if (data?.email) {
          setUserEmail(data.email);
        } else {
          console.error('Usuario sin email encontrado');
          toast.error('Este usuario no tiene email asociado');
        }
      } catch (error) {
        console.error('Error in fetchUserEmail:', error);
      }
    };

    if (isOpen) {
      fetchUserEmail();
    }
  }, [isOpen, user.id, user.email, supabase]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `profile/${formData.full_name}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('imagenes')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir la imagen');
      return null;
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Todos los campos de contraseña son obligatorios');
      return false;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return false;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return false;
    }

    try {
      // Validar que tengamos el email del usuario
      if (!userEmail) {
        throw new Error('No se encontró el email del usuario');
      }

      // Obtener el token de la sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa');
      }

      console.log('Calling edge function with:', {
        userId: user.id,
        userEmail: userEmail,
        hasCurrentPassword: !!passwordData.currentPassword,
        hasNewPassword: !!passwordData.newPassword
      });

      // Llamar a la función edge con headers CORS apropiados
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            userId: user.id,
            newPassword: passwordData.newPassword,
            currentPassword: passwordData.currentPassword,
            userEmail: userEmail
          })
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Password changed successfully:', result);
      toast.success('Contraseña cambiada exitosamente');

      // Limpiar formulario
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      return true;

    } catch (error) {
      console.error('Error changing password:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al cambiar la contraseña';
      toast.error(errorMessage);
      
      return false;
    }
  };

  const handleSendPasswordResetEmail = async () => {
    try {
      setIsSendingResetEmail(true);
      
      if (!userEmail) {
        toast.error('No se puede enviar email: usuario sin email');
        return;
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast.success('Email de recuperación enviado correctamente');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Error al enviar email de recuperación');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Cambiar contraseña si se proporcionó
      let passwordChanged = false;
      if (showPasswordSection && passwordData.currentPassword) {
        passwordChanged = await handlePasswordChange();
        if (!passwordChanged && passwordData.currentPassword) {
          return; // Si falló el cambio de contraseña, no continuar
        }
      }

      let avatarUrl = user.avatar_url;

      // Subir nueva imagen si se seleccionó
      if (imageFile) {
        avatarUrl = await uploadAvatar(imageFile);
      }

      // Usar la función segura de actualización
      const { data, error } = await supabase
        .rpc('update_user_safe', {
          user_id: user.id,
          new_full_name: formData.full_name,
          new_role: formData.role,
          new_avatar_url: avatarUrl
        });

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      // Verificar si la función retornó un error
      if (data?.error) {
        throw new Error(data.error);
      }

      const successMessage = passwordChanged 
        ? 'Usuario y contraseña actualizados correctamente'
        : 'Usuario actualizado correctamente';
      
      toast.success(successMessage);
      onClose();
      onUserUpdated();
      
      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error('Error al actualizar usuario: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar un mensaje si no hay email disponible
  const canChangePassword = userEmail.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Usuario">
      <div className="max-h-[70vh] overflow-y-auto pr-2">
        <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto de Perfil
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-300"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg border border-blue-300 transition-colors">
                Cambiar Imagen
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="edit_full_name" className="block text-sm font-medium text-gray-700">
              Nombre Completo *
            </label>
            <input
              type="text"
              id="edit_full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label htmlFor="edit_role" className="block text-sm font-medium text-gray-700">
              Rol
            </label>
            <select
              id="edit_role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              required
              className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              disabled={isSubmitting}
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
              <option value="dian">DIAN</option>
              <option value="institucion">Institución</option>
            </select>
          </div>

          {/* Password Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Cambiar Contraseña
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                disabled={!canChangePassword}
              >
                {showPasswordSection ? 'Cancelar' : 'Cambiar'}
              </button>
            </div>

            {!canChangePassword && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  No se puede cambiar la contraseña: este usuario no tiene email asociado.
                </p>
              </div>
            )}

            {showPasswordSection && canChangePassword && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                    Contraseña Actual *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      id="current_password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="block w-full px-3 py-2 pr-10 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                    Nueva Contraseña *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="new_password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="block w-full px-3 py-2 pr-10 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirm_password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="block w-full px-3 py-2 pr-10 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">
                    ¿No recuerda la contraseña actual?
                  </span>
                  <button
                    type="button"
                    onClick={handleSendPasswordResetEmail}
                    disabled={isSendingResetEmail || !userEmail}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    {isSendingResetEmail ? 'Enviando...' : 'Enviar Email'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botones dentro del formulario */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t bg-white sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Procesando...
                </>
              ) : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditUserModal;