import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MoreVertical,
  UserPlus,
  Shield,
  AlertCircle,
  RefreshCw,
  User as UserIcon
} from 'lucide-react';
import { User, UserRole } from '../types';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import AddUserModal from './modals/AddUserModal';
import EditUserModal from './modals/EditUserModal';
import DeleteUserModal from './modals/DeleteUserModal';
import toast from 'react-hot-toast';

const UserManagement: React.FC = () => {
  const { supabase } = useSupabase();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Verificar si el usuario actual es admin
  const isCurrentUserAdmin = currentUser?.role === 'admin';

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from('users').select('*');
      
      // Si no es admin, solo mostrar su propio usuario
      if (!isCurrentUserAdmin && currentUser?.id) {
        query = query.eq('id', currentUser.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        
        if (error.code === '42501' || error.message?.includes('permission')) {
          setError('No tienes permisos suficientes para ver la lista de usuarios.');
          return;
        }
        
        throw error;
      }

      if (!data) {
        setUsers([]);
        return;
      }

      const transformedUsers: User[] = data.map((user: any) => ({
        id: user.id,
        email: user.email || 'No disponible',
        full_name: user.full_name || '',
        role: user.role || 'user',
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at,
      }));

      setUsers(transformedUsers);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      
      if (err instanceof Error) {
        setError(`Error al cargar usuarios: ${err.message}`);
      } else {
        setError('Error desconocido al cargar usuarios');
      }
      
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser?.id, isCurrentUserAdmin]);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen]);

  const handleRefresh = () => {
    fetchUsers();
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
    setDropdownOpen(null);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
    setDropdownOpen(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      user: 'bg-gray-100 text-gray-800 border-gray-200',
      dian: 'bg-blue-100 text-blue-800 border-blue-200',
      institucion: 'bg-green-100 text-green-800 border-green-200'
    };

    const labels = {
      admin: 'Administrador',
      user: 'Usuario',
      dian: 'DIAN',
      institucion: 'Institución'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[role]}`}>
        {role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
        {labels[role]}
      </span>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDropdownPosition = (index: number, totalUsers: number) => {
    const isLastRows = index >= totalUsers - 2;
    return isLastRows ? 'bottom-full mb-2' : 'top-full mt-2';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Cargando usuarios...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar usuarios</h3>
        <p className="text-gray-600 mb-4 max-w-md">{error}</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            {isCurrentUserAdmin ? (
              <Users className="h-6 w-6 text-blue-600" />
            ) : (
              <UserIcon className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isCurrentUserAdmin ? 'Gestión de Usuarios' : 'Mi Perfil'}
            </h1>
            <p className="text-sm text-gray-600">
              {isCurrentUserAdmin 
                ? 'Administra los usuarios del sistema' 
                : 'Administra tu información personal'
              }
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </button>
          {isCurrentUserAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Usuario
            </button>
          )}
        </div>
      </div>

      {/* Filters - Solo mostrar para admins */}
      {isCurrentUserAdmin && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">Administrador</option>
                  <option value="user">Usuario</option>
                  <option value="dian">DIAN</option>
                  <option value="institucion">Institución</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista diferente para no-admins */}
      {!isCurrentUserAdmin && users.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Información Personal</h2>
            <button
              onClick={() => handleEditUser(users[0])}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Perfil
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-16 h-16">
                {users[0].avatar_url ? (
                  <img
                    className="w-16 h-16 rounded-full object-cover"
                    src={users[0].avatar_url}
                    alt={users[0].full_name}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xl font-medium text-blue-600">
                      {users[0].full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-medium text-gray-900">{users[0].full_name}</h3>
                <p className="text-gray-600">{users[0].email}</p>
                <div className="mt-2">
                  {getRoleBadge(users[0].role)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Último acceso
                </label>
                <p className="text-sm text-gray-900">{formatDate(users[0].last_sign_in_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta creada
                </label>
                <p className="text-sm text-gray-900">{formatDate(users[0].created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vista de tabla para admins */
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || roleFilter !== 'all' 
                  ? 'No se encontraron usuarios con los filtros aplicados' 
                  : 'No hay usuarios registrados'}
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[70vh]" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full min-w-[800px] divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Último acceso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Creado
                    </th>
                    <th className="relative px-6 py-3 min-w-[80px]">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10">
                            {user.avatar_url ? (
                              <img
                                className="w-10 h-10 rounded-full object-cover"
                                src={user.avatar_url}
                                alt={user.full_name}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                              <span className="text-sm font-medium text-blue-600">
                                {user.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">{user.full_name}</div>
                            <div className="text-sm text-gray-500 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[150px]">
                        {formatDate(user.last_sign_in_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[150px]">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium min-w-[80px]">
                        <div className="relative" ref={dropdownOpen === user.id ? dropdownRef : null}>
                          <button
                            onClick={() => setDropdownOpen(dropdownOpen === user.id ? null : user.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                          {dropdownOpen === user.id && (
                            <div className={`absolute right-0 ${getDropdownPosition(index, filteredUsers.length)} w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50`}>
                              <div className="py-1">
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </button>
                                {currentUser?.id !== user.id && (
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isCurrentUserAdmin && (
        <AddUserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onUserAdded={fetchUsers}
        />
      )}

      {selectedUser && (
        <>
          <EditUserModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onUserUpdated={fetchUsers}
            canEditRole={isCurrentUserAdmin} // Nueva prop para controlar si puede editar rol
          />

          {isCurrentUserAdmin && (
            <DeleteUserModal
              isOpen={showDeleteModal}
              onClose={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
              user={selectedUser}
              onUserDeleted={fetchUsers}
            />
          )}
        </>
      )}
    </div>
  );
};

export default UserManagement;