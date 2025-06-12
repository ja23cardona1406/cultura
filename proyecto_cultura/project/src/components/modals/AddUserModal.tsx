import React, { useState } from 'react';
import { Upload, X, Eye, EyeOff } from 'lucide-react';
import Modal from './Modal';
import { UserRole } from '../../types';
import { useSupabase } from '../../contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded }) => {
  const { supabase } = useSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as UserRole
  });

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

  const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `profile/${formData.full_name}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

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

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'user'
    });
    setImageFile(null);
    setImagePreview(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    try {
      setIsSubmitting(true);

      // Obtener sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa. Por favor inicia sesión nuevamente.');
      }

      console.log('Enviando datos a Edge Function:', {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role
        // No mostramos la contraseña en logs por seguridad
      });

      // Llamar a la Edge Function para crear el usuario
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role
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
        
        throw new Error(errorData.error || `Error HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Edge Function response:', result);
      
      if (!result.success || !result.user_id) {
        throw new Error(result.error || 'Error al crear usuario - ID no recibido');
      }

      const userId = result.user_id;
      console.log('Usuario creado en Auth con ID:', userId);

      let avatarUrl = null;

      // Subir imagen si se seleccionó
      if (imageFile) {
        console.log('Subiendo avatar...');
        avatarUrl = await uploadAvatar(userId, imageFile);
        if (avatarUrl) {
          console.log('Avatar subido correctamente:', avatarUrl);
        }
      }

      // Crear registro en la tabla users
      console.log('Creando registro en tabla users...');
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          avatar_url: avatarUrl
        });

      if (userError) {
        console.error('Error creating user record:', userError);
        throw new Error('Error al crear registro de usuario: ' + userError.message);
      }

      console.log('Registro en tabla users creado correctamente');

      // Crear perfil
      console.log('Creando perfil...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: formData.role
        });

      if (profileError) {
        console.warn('Error creating profile:', profileError);
        // No lanzar error aquí, el perfil puede ser opcional o tener triggers
      } else {
        console.log('Perfil creado correctamente');
      }

      toast.success('Usuario creado correctamente');
      resetForm();
      onClose();
      onUserAdded();
      
    } catch (err) {
      console.error('Error creating user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al crear usuario: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agregar Usuario">
      <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg border border-blue-300 transition-colors">
              Seleccionar Imagen
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
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
            required
            className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            disabled={isSubmitting}
            placeholder="usuario@ejemplo.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña * (mínimo 6 caracteres)
          </label>
          <div className="mt-1 relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="block w-full px-3 py-2 pr-10 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              disabled={isSubmitting}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isSubmitting}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
            Nombre Completo *
          </label>
          <input
            type="text"
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value.trim() })}
            required
            className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            disabled={isSubmitting}
            placeholder="Nombre y apellidos"
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Rol *
          </label>
          <select
            id="role"
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

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Creando...
              </>
            ) : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddUserModal;