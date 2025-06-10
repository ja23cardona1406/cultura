import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Save, AlertCircle, Upload, Eye, EyeOff, Key } from 'lucide-react';
import { User as UserType, UserRole } from '../../types';
import { useSupabase } from '../../contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUserUpdated: () => void;
  canEditRole?: boolean; // Control para editar rol
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  canEditRole = false
}) => {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
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
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url || ''
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
      setFormData({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url || ''
      });
      setImagePreview(user.avatar_url);
      fetchUserEmail();
    }
  }, [isOpen, user, supabase]);

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
      if (!userEmail) {
        throw new Error('No se encontró el email del usuario');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa');
      }

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
      toast.success('Contraseña cambiada exitosamente');

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
    setLoading(true);

    try {
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

      // Preparar los datos a actualizar
      const updateData: any = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString()
      };

      // Solo incluir el rol si el usuario tiene permisos para editarlo
      if (canEditRole) {
        updateData.role = formData.role;
      }

      // Intentar usar la función segura primero, sino usar update directo
      let error;
      if (canEditRole) {
        const { data, error: rpcError } = await supabase
          .rpc('update_user_safe', {
            user_id: user.id,
            new_full_name: formData.full_name,
            new_role: formData.role,
            new_avatar_url: avatarUrl
          });

        if (rpcError || data?.error) {
          error = rpcError || new Error(data.error);
        }
      } else {
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);
        
        error = updateError;
      }

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      const successMessage = passwordChanged 
        ? 'Usuario y contraseña actualizados correctamente'
        : 'Usuario actualizado correctamente';
      
      toast.success(successMessage);
      onUserUpdated();
      onClose();

      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      if (error instanceof Error) {
        toast.error(`Error al actualizar usuario: ${error.message}`);
      } else {
        toast.error('Error desconocido al actualizar usuario');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  const canChangePassword = userEmail.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {canEditRole ? 'Editar Usuario' : 'Editar Mi Perfil'}
              </h2>
              <p className="text-sm text-gray-600">
                {canEditRole 
                  ? 'Modifica la información del usuario'
                  : 'Actualiza tu información personal'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <form className="space-y-4">
            {/* Avatar upload - Más compacto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Perfil
              </label>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-16 w-16 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <Upload className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg border border-blue-300 transition-colors text-sm">
                  Cambiar
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
            </div>

            {/* Nombre completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingresa el nombre completo"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
            </div>

            {/* Rol - Mostrar según permisos */}
            {canEditRole ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol *
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    required
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                    <option value="dian">DIAN</option>
                    <option value="institucion">Institución</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol actual
                </label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {formData.role === 'admin' && 'Administrador'}
                    {formData.role === 'user' && 'Usuario'}
                    {formData.role === 'dian' && 'DIAN'}
                    {formData.role === 'institucion' && 'Institución'}
                  </span>
                </div>
                <div className="flex items-center mt-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>Solo los administradores pueden cambiar roles</span>
                </div>
              </div>
            )}

            {/* Password Section - Más compacta */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-900 flex items-center">
                  <Key className="h-4 w-4 mr-2" />
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
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                  <p className="text-sm text-yellow-800">
                    No se puede cambiar la contraseña: este usuario no tiene email asociado.
                  </p>
                </div>
              )}

              {showPasswordSection && canChangePassword && (
                <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña Actual *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        disabled={loading}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        disabled={loading}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        disabled={loading}
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
                    <span className="text-xs text-gray-600">
                      ¿No recuerda la contraseña actual?
                    </span>
                    <button
                      type="button"
                      onClick={handleSendPasswordResetEmail}
                      disabled={isSendingResetEmail || !userEmail}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      <Mail className="h-3 w-3" />
                      {isSendingResetEmail ? 'Enviando...' : 'Enviar Email'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer - Fijo en la parte inferior */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;