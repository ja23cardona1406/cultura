import React, { useState, useEffect } from 'react';
import { Upload, X, Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';
import Modal from './Modal';
import { UserRole } from '../../types';
import { useSupabase } from '../../contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded }) => {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as UserRole
  });

  // Generar contraseña segura
  const generateSecurePassword = (): string => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Asegurar al menos un carácter de cada tipo
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Completar hasta 12 caracteres con caracteres aleatorios
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mezclar la contraseña
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Evaluar fuerza de la contraseña
  const evaluatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (password.length >= 16) score += 1;
    
    if (score <= 2) {
      return {
        score,
        label: 'Muy débil',
        color: 'text-red-600',
        bgColor: 'bg-red-500'
      };
    } else if (score <= 4) {
      return {
        score,
        label: 'Débil',
        color: 'text-orange-600',
        bgColor: 'bg-orange-500'
      };
    } else if (score <= 5) {
      return {
        score,
        label: 'Buena',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500'
      };
    } else if (score <= 6) {
      return {
        score,
        label: 'Fuerte',
        color: 'text-green-600',
        bgColor: 'bg-green-500'
      };
    } else {
      return {
        score,
        label: 'Muy fuerte',
        color: 'text-green-700',
        bgColor: 'bg-green-600'
      };
    }
  };

  const passwordStrength = evaluatePasswordStrength(formData.password);

  // Generar contraseña inicial al abrir el modal
  useEffect(() => {
    if (isOpen && !formData.password) {
      setFormData(prev => ({
        ...prev,
        password: generateSecurePassword()
      }));
    }
  }, [isOpen]);

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setFormData(prev => ({
      ...prev,
      password: newPassword
    }));
    setPasswordCopied(false);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setPasswordCopied(true);
      toast.success('Contraseña copiada al portapapeles');
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      toast.error('Error al copiar la contraseña');
    }
  };

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
    setPasswordCopied(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validaciones del frontend
      if (!formData.email || !formData.password || !formData.full_name) {
        setError('Todos los campos son requeridos');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setLoading(false);
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Por favor ingresa un email válido');
        setLoading(false);
        return;
      }

      console.log('Enviando datos a Edge Function:', {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role
      });

      // Obtener el token del usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('No hay sesión activa. Por favor inicia sesión nuevamente.');
        setLoading(false);
        return;
      }

      // Llamar a la Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(formData)
        }
      );

      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Edge Function response:', result);

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!result.success || !result.user_id) {
        throw new Error(result.error || 'Error al crear usuario - ID no recibido');
      }

      const userId = result.user_id;
      console.log('Usuario creado en Auth con ID:', userId);

      // Crear usuario en la tabla users
      console.log('Creando usuario en tabla users...');
      
      let avatarUrl = null;
      
      // Subir imagen si se seleccionó
      if (imageFile) {
        console.log('Subiendo avatar...');
        avatarUrl = await uploadAvatar(userId, imageFile);
        if (avatarUrl) {
          console.log('Avatar subido correctamente:', avatarUrl);
        }
      }

      // Insertar en la tabla users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: userId,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          avatar_url: avatarUrl,
          created_at: new Date().toISOString()
        });

      if (userError) {
        console.error('Error creating user record:', userError);
        throw new Error('Error al crear el registro del usuario: ' + userError.message);
      }

      console.log('Usuario creado correctamente en tabla users');

      toast.success('Usuario creado correctamente');
      resetForm();
      onClose();
      onUserAdded();
      
    } catch (err) {
      console.error('Error creating user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError('Error al crear usuario: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value.trim()
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      password: e.target.value
    }));
    setPasswordCopied(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agregar Usuario">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

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
                  disabled={loading}
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
                disabled={loading}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
            placeholder="usuario@ejemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña *
          </label>
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                required
                minLength={6}
                disabled={loading}
                placeholder="Contraseña generada automáticamente"
              />
              <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2">
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                  title="Copiar contraseña"
                >
                  {passwordCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Indicador de fortaleza de contraseña */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                    <div
                      key={level}
                      className={`h-2 w-4 rounded-full ${
                        level <= passwordStrength.score
                          ? passwordStrength.bgColor
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-sm font-medium ${passwordStrength.color}`}>
                  {passwordStrength.label}
                </span>
              </div>
              
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Regenerar</span>
              </button>
            </div>
            
            <p className="text-xs text-gray-500">
              Se genera automáticamente una contraseña segura. Puedes regenerarla o modificarla manualmente.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Completo *
          </label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
            placeholder="Nombre y apellidos"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rol *
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          >
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
            <option value="dian">DIAN</option>
            <option value="institucion">Institución</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
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