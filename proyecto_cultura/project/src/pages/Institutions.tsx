import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Users, Upload, Eye, Edit2, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Institution, Member } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

interface SupabaseError extends Error {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function Institutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isInstitutionModalOpen, setIsInstitutionModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDetailsView, setIsDetailsView] = useState(false);
  const [isMemberDetailsView, setIsMemberDetailsView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMemberEditing, setIsMemberEditing] = useState(false);
  const [institutionFormData, setInstitutionFormData] = useState({
    name: '',
    nit: '',
    address: '',
    email: '',
    logo_url: '',
    logo_file: null as File | null,
  });
  const [memberFormData, setMemberFormData] = useState({
    full_name: '',
    role: '',
    email: '',
    phone: '',
    department: '',
    avatar_url: '',
    photo_file: null as File | null,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const initializeData = async () => {
      const isAuth = await checkAuth();
      if (isAuth) {
        await fetchInstitutions();
      }
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedInstitution) {
      fetchMembers(selectedInstitution.id);
    }
  }, [selectedInstitution]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Error de autenticación:', authError);
        setError('Error de autenticación: ' + authError.message);
        return false;
      }

      if (!session) {
        setError('Por favor inicia sesión para continuar');
        return false;
      }

      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error al verificar autenticación:', error);
      setError('Error al verificar la autenticación: ' + error.message);
      return false;
    }
  };

  const fetchInstitutions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No se pudo obtener información del usuario');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('institutions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setInstitutions(data || []);
    } catch (err) {
      const error = err as PostgrestError;
      setError('Error al cargar las instituciones: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async (institutionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No se pudo obtener información del usuario');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMembers(data || []);
    } catch (err) {
      const error = err as PostgrestError;
      setError('Error al cargar los miembros: ' + error.message);
    }
  };

  const handleImageUpload = async (file: File, type: 'institution' | 'member') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      let filePath;

      if (type === 'institution') {
        filePath = `institutions/${fileName}`;
      } else {
        filePath = `members/${fileName}`;
      }

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      const error = err as Error;
      throw new Error(`Error uploading image: ${error.message}`);
    }
  };

  const handleInstitutionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInstitutionFormData(prev => ({
        ...prev,
        logo_file: file
      }));
    }
  };

  const handleMemberImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMemberFormData(prev => ({
        ...prev,
        photo_file: file
      }));
    }
  };

  const handleInstitutionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInstitutionFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMemberFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        setError('No se pudo obtener información del usuario');
        return;
      }

      let logo_url = institutionFormData.logo_url;
      if (institutionFormData.logo_file) {
        logo_url = await handleImageUpload(institutionFormData.logo_file, 'institution');
      }

      const { data, error: insertError } = await supabase
        .from('institutions')
        .insert([{
          ...institutionFormData,
          logo_url,
          user_id: user.id
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setInstitutions(prev => [data as Institution, ...prev]);
      setIsInstitutionModalOpen(false);
      setInstitutionFormData({ 
        name: '', 
        nit: '', 
        address: '', 
        email: '', 
        logo_url: '',
        logo_file: null 
      });
    } catch (err) {
      const error = err as SupabaseError;
      setError('Error al crear la institución: ' + error.message);
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitution) return;
    setError('');

    try {
      let avatar_url = memberFormData.avatar_url;
      if (memberFormData.photo_file) {
        avatar_url = await handleImageUpload(memberFormData.photo_file, 'member');
      }

      const { data, error } = await supabase
        .from('members')
        .insert([{
          full_name: memberFormData.full_name,
          role: memberFormData.role,
          email: memberFormData.email,
          phone: memberFormData.phone,
          department: memberFormData.department,
          avatar_url,
          institution_id: selectedInstitution.id
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMembers(prev => [data as Member, ...prev]);
        setIsMemberModalOpen(false);
        setMemberFormData({ 
          full_name: '', 
          role: '', 
          email: '', 
          phone: '', 
          department: '',
          avatar_url: '',
          photo_file: null
        });
      }
    } catch (err) {
      const error = err as SupabaseError;
      setError('Error al crear el miembro: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isDetailsView && selectedInstitution) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => {
              setIsDetailsView(false);
              setSelectedInstitution(null);
              setIsEditing(false);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="h-5 w-5" />
            Volver
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Detalles de la Institución
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              {selectedInstitution.logo_url && (
                <img
                  src={selectedInstitution.logo_url}
                  alt={selectedInstitution.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold">{selectedInstitution.name}</h2>
                <p className="text-gray-600">NIT: {selectedInstitution.nit}</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Información de Contacto</h3>
              <div className="space-y-2">
                <p className="text-gray-600">Email: {selectedInstitution.email}</p>
                <p className="text-gray-600">Dirección: {selectedInstitution.address}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">Miembros</h3>
                <button
                  onClick={() => setIsMemberModalOpen(true)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Miembro
                </button>
              </div>
              <div className="space-y-2">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {member.avatar_url && (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span>{member.full_name}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setIsMemberDetailsView(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMemberDetailsView && selectedMember) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => {
              setIsMemberDetailsView(false);
              setSelectedMember(null);
              setIsMemberEditing(false);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="h-5 w-5" />
            Volver
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Detalles del Miembro
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              {selectedMember.avatar_url && (
                <img
                  src={selectedMember.avatar_url}
                  alt={selectedMember.full_name}
                  className="w-24 h-24 object-cover rounded-full"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold">{selectedMember.full_name}</h2>
                <p className="text-gray-600">{selectedMember.role}</p>
              </div>
            </div>
            <button
              onClick={() => setIsMemberEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Información de Contacto</h3>
              <div className="space-y-2">
                <p className="text-gray-600">Email: {selectedMember.email}</p>
                <p className="text-gray-600">Teléfono: {selectedMember.phone}</p>
                <p className="text-gray-600">Departamento: {selectedMember.department}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Instituciones</h1>
        <button 
          onClick={() => setIsInstitutionModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Institución
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {institutions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No hay instituciones registradas
              </p>
            ) : (
              institutions.map((institution) => (
                <div key={institution.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    {institution.logo_url ? (
                      <img
                        src={institution.logo_url}
                        alt={institution.name}
                        className="h-12 w-12 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <Building2 className="h-12 w-12 text-gray-500 mr-3" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{institution.name}</h3>
                      <p className="text-sm text-gray-500">NIT: {institution.nit}</p>
                      <p className="text-sm text-gray-500">Email: {institution.email}</p>
                      <p className="text-sm text-gray-500">Dirección: {institution.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedInstitution(institution);
                        setIsDetailsView(true);
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalles
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal para crear institución */}
      {isInstitutionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Nueva Institución</h2>
              <button 
                onClick={() => setIsInstitutionModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInstitutionSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={institutionFormData.name}
                  onChange={handleInstitutionInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="nit" className="block text-sm font-medium text-gray-700">
                  NIT
                </label>
                <input
                  type="text"
                  id="nit"
                  name="nit"
                  value={institutionFormData.nit}
                  onChange={handleInstitutionInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Dirección
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={institutionFormData.address}
                  onChange={handleInstitutionInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={institutionFormData.email}
                  onChange={handleInstitutionInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Logo</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="logo-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Cargar archivo</span>
                        <input
                          id="logo-upload"
                          name="logo-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleInstitutionImageChange}
                        />
                      </label>
                      <p className="pl-1">o arrastrar y soltar</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsInstitutionModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Crear Institución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para crear miembro */}
      {isMemberModalOpen && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Nuevo Miembro para {selectedInstitution.name}</h2>
              <button 
                onClick={() => setIsMemberModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMemberSubmit} className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={memberFormData.full_name}
                  onChange={handleMemberInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Rol
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={memberFormData.role}
                  onChange={handleMemberInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={memberFormData.email}
                  onChange={handleMemberInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={memberFormData.phone}
                  onChange={handleMemberInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Departamento
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={memberFormData.department}
                  onChange={handleMemberInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Foto</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="photo-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Cargar archivo</span>
                        <input
                          id="photo-upload"
                          name="photo-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleMemberImageChange}
                        />
                      </label>
                      <p className="pl-1">o arrastrar y soltar</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Crear Miembro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Institutions;