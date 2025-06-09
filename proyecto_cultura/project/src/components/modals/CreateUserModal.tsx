import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import Modal from './Modal';
import { UserRole } from '../../types';
import { useSupabase } from '../../contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const { supabase } = useSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'user' as UserRole,
    password: generatePassword()
  });

  function generatePassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.full_name || !formData.password) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Crear usuario usando función de edge function para evitar cambio de sesión
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      const userId = result.user_id;
      let avatarUrl = null;

      // Subir avatar si se seleccionó
      if (imageFile) {
        avatarUrl = await uploadAvatar(userId, imageFile);
      }

      // Insertar en tabla users
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          full_name: formData.full_name,
          role: formData.role,
          avatar_url: avatarUrl
        });

      if (insertError) throw insertError;

      // Insertar en tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: formData.role
        });

      if (profileError) {
        console.warn('Error creating profile:', profileError);
      }

      toast.success('Usuario creado correctamente');
      onClose();
      onUserCreated();
      
      // Reset form
      setFormData({
        email: '',
        full_name: '',
        role: 'user',
        password: generatePassword()
      });
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error('Error al crear usuario: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Usuario">
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
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
            Nombre Completo *
          </label>
          <input
            type="text"
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
            className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Rol
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
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña Generada
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="flex-1 px-3 py-2 rounded-l-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setFormData({ ...formData, password: generatePassword() })}
              className="px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={isSubmitting}
            >
              Generar
            </button>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
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
            ) : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;