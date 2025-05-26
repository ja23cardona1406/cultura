import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Institution, Member, SupabaseError, InstitutionType } from '../types';
import { PostgrestError } from '@supabase/supabase-js';
import InstitutionCard from './institutions/InstitutionCard';
import InstitutionDetails from './institutions/InstitutionDetails';
import MemberDetails from './institutions/MemberDetails';
import InstitutionForm from './institutions/InstitutionForm';
import MemberForm from './institutions/MemberForm';
import { useMediaQuery } from '../hooks/useMediaQuery';

export function Institutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
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
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<InstitutionType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');

  // Opciones de filtro
  const filterOptions: Array<{ value: InstitutionType | 'all'; label: string }> = [
    { value: 'all', label: 'Todas las instituciones' },
    { value: 'NAF', label: 'NAF' },
    { value: 'Cultura de la contribución en la escuela', label: 'Cultura en la escuela' },
    { value: 'Presencia de territorios', label: 'Presencia en territorios' },
    { value: 'DIAN', label: 'DIAN' }
  ];

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

  // Efecto para filtrar las instituciones cuando cambia el filtro o la lista de instituciones
  useEffect(() => {
    if (selectedFilter === 'all') {
      setFilteredInstitutions(institutions);
    } else {
      setFilteredInstitutions(institutions.filter(institution => institution.type === selectedFilter));
    }
  }, [institutions, selectedFilter]);

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

  const handleImageUpload = async (file: File, type: 'institution' | 'member', name: string, institutionName?: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      let fileName = '';
      let filePath = '';

      const formatName = (str: string) => {
        return str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, '_')
          .toLowerCase();
      };

      const formattedName = formatName(name);
      const formattedInstitutionName = institutionName ? formatName(institutionName) : 'unknown_institution';

      if (type === 'institution') {
        fileName = `${formattedName}.${fileExt}`;
        filePath = `institutions/${fileName}`;
      } else {
        fileName = `${formattedInstitutionName}_${formattedName}.${fileExt}`;
        filePath = `members/${fileName}`;
      }

      const { data: existingFiles } = await supabase.storage
        .from('imagenes')
        .list(type === 'institution' ? 'institutions' : 'members');
      
      if (existingFiles?.some(f => f.name === fileName)) {
        const timestamp = new Date().getTime();
        fileName = type === 'institution' 
          ? `${formattedName}_${timestamp}.${fileExt}`
          : `${formattedInstitutionName}_${formattedName}_${timestamp}.${fileExt}`;
        
        filePath = type === 'institution' 
          ? `institutions/${fileName}` 
          : `members/${fileName}`;
      }

      const { data, error } = await supabase.storage
        .from('imagenes')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('imagenes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      const error = err as Error;
      throw new Error(`Error uploading image: ${error.message}`);
    }
  };

  const handleDeleteInstitution = async (institutionId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta institución? Esta acción eliminará también todos los miembros asociados.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const { error: membersError } = await supabase
        .from('members')
        .delete()
        .eq('institution_id', institutionId);

      if (membersError) throw membersError;

      const { error: institutionError } = await supabase
        .from('institutions')
        .delete()
        .eq('id', institutionId);

      if (institutionError) throw institutionError;

      setInstitutions(prev => prev.filter(inst => inst.id !== institutionId));
      
      if (isDetailsView) {
        setIsDetailsView(false);
        setSelectedInstitution(null);
      }
    } catch (err) {
      const error = err as PostgrestError;
      setError('Error al eliminar la institución: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este miembro?')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(member => member.id !== memberId));
      
      if (isMemberDetailsView) {
        setIsMemberDetailsView(false);
        setSelectedMember(null);
      }
    } catch (err) {
      const error = err as PostgrestError;
      setError('Error al eliminar el miembro: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInstitutionSubmit = async (formData: {
    name: string;
    nit: string;
    address: string;
    email: string;
    logo_url: string;
    logo_file: File | null;
    type: InstitutionType | null;
  }) => {
    setError('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        throw new Error('No se pudo obtener información del usuario');
      }

      let logo_url = formData.logo_url;
      if (formData.logo_file) {
        logo_url = await handleImageUpload(formData.logo_file, 'institution', formData.name);
      }

      if (isEditing && selectedInstitution) {
        const { data, error: updateError } = await supabase
          .from('institutions')
          .update({
            name: formData.name,
            nit: formData.nit,
            address: formData.address,
            email: formData.email,
            logo_url,
            type: formData.type,
          })
          .eq('id', selectedInstitution.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setInstitutions(prev => 
          prev.map(inst => inst.id === selectedInstitution.id ? (data as Institution) : inst)
        );
        setSelectedInstitution(data as Institution);
      } else {
        const { data, error: insertError } = await supabase
          .from('institutions')
          .insert([{
            name: formData.name,
            nit: formData.nit,
            address: formData.address,
            email: formData.email,
            logo_url,
            user_id: user.id,
            type: formData.type,
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        setInstitutions(prev => [data as Institution, ...prev]);
      }
      
      setIsInstitutionModalOpen(false);
      setIsEditing(false);
    } catch (err) {
      const error = err as SupabaseError;
      throw error;
    }
  };

  const handleMemberSubmit = async (formData: {
    full_name: string;
    role: string;
    email: string;
    phone: string;
    department: string;
    avatar_url: string;
    photo_file: File | null;
  }) => {
    if (!selectedInstitution) {
      throw new Error('No se ha seleccionado ninguna institución');
    }
    
    setError('');

    try {
      let avatar_url = formData.avatar_url;
      if (formData.photo_file) {
        avatar_url = await handleImageUpload(
          formData.photo_file, 
          'member', 
          formData.full_name, 
          selectedInstitution.name
        );
      }

      if (isMemberEditing && selectedMember) {
        const { data, error } = await supabase
          .from('members')
          .update({
            full_name: formData.full_name,
            role: formData.role,
            email: formData.email,
            phone: formData.phone,
            department: formData.department,
            avatar_url,
          })
          .eq('id', selectedMember.id)
          .select()
          .single();

        if (error) throw error;

        setMembers(prev => 
          prev.map(member => member.id === selectedMember.id ? (data as Member) : member)
        );
        setSelectedMember(data as Member);
      } else {
        const { data, error } = await supabase
          .from('members')
          .insert([{
            full_name: formData.full_name,
            role: formData.role,
            email: formData.email,
            phone: formData.phone,
            department: formData.department,
            avatar_url,
            institution_id: selectedInstitution.id
          }])
          .select()
          .single();

        if (error) throw error;

        setMembers(prev => [data as Member, ...prev]);
      }
      
      setIsMemberModalOpen(false);
      setIsMemberEditing(false);
    } catch (err) {
      const error = err as SupabaseError;
      throw error;
    }
  };

  const handleEditInstitution = () => {
    setIsEditing(true);
    setIsInstitutionModalOpen(true);
  };

  const handleEditMember = () => {
    setIsMemberEditing(true);
    setIsMemberModalOpen(true);
  };

  const getInstitutionTypeLabel = (type: InstitutionType | null): string => {
    if (!type) return 'No especificado';
    
    const typeLabels: Record<InstitutionType, string> = {
      'NAF': 'NAF',
      'Cultura de la contribución en la escuela': 'Cultura en la escuela',
      'Presencia de territorios': 'Presencia en territorios',
      'DIAN': 'DIAN'
    };
    
    return typeLabels[type] ?? 'Tipo desconocido';
  };

  const getFilteredCount = () => {
    if (selectedFilter === 'all') {
      return institutions.length;
    }
    return institutions.filter(inst => inst.type === selectedFilter).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Member Details View
  if (isMemberDetailsView && selectedMember) {
    return (
      <div className={`p-${isMobile ? '3' : '6'}`}>
        {isMemberModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <MemberForm
              member={selectedMember}
              institutionName={selectedInstitution?.name || ''}
              onSubmit={handleMemberSubmit}
              onCancel={() => {
                setIsMemberModalOpen(false);
                setIsMemberEditing(false);
              }}
              isEditing={isMemberEditing}
            />
          </div>
        )}
        
        <MemberDetails
          member={selectedMember}
          onBack={() => {
            setIsMemberDetailsView(false);
            setSelectedMember(null);
            setIsMemberEditing(false);
          }}
          onEdit={handleEditMember}
          onDelete={() => handleDeleteMember(selectedMember.id)}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  // Institution Details View
  if (isDetailsView && selectedInstitution) {
    return (
      <div className={`p-${isMobile ? '3' : '6'}`}>
        {isInstitutionModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <InstitutionForm
              institution={selectedInstitution}
              onSubmit={handleInstitutionSubmit}
              onCancel={() => {
                setIsInstitutionModalOpen(false);
                setIsEditing(false);
              }}
              isEditing={isEditing}
            />
          </div>
        )}
        
        {isMemberModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <MemberForm
              member={isMemberEditing ? selectedMember || undefined : undefined}
              institutionName={selectedInstitution.name}
              onSubmit={handleMemberSubmit}
              onCancel={() => {
                setIsMemberModalOpen(false);
                setIsMemberEditing(false);
              }}
              isEditing={isMemberEditing}
            />
          </div>
        )}
        
        <InstitutionDetails
          institution={selectedInstitution}
          members={members}
          onBack={() => {
            setIsDetailsView(false);
            setSelectedInstitution(null);
            setIsEditing(false);
          }}
          onEdit={handleEditInstitution}
          onDelete={() => handleDeleteInstitution(selectedInstitution.id)}
          onAddMember={() => setIsMemberModalOpen(true)}
          onViewMember={(member) => {
            setSelectedMember(member);
            setIsMemberDetailsView(true);
          }}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  // Main Institutions List View
  return (
    <div className={`space-y-${isMobile ? '4' : '6'} p-${isMobile ? '3' : '6'}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Instituciones</h1>
        <button 
          onClick={() => setIsInstitutionModalOpen(true)}
          className={`flex items-center gap-2 px-${isMobile ? '3' : '4'} py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200`}
        >
          <Plus className={`h-${isMobile ? '3' : '4'} w-${isMobile ? '3' : '4'}`} />
          {isMobile ? 'Nueva' : 'Nueva Institución'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
            
            {!isMobile && (
              <div className="flex flex-wrap gap-2">
                {filterOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedFilter(option.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                      selectedFilter === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            Mostrando {getFilteredCount()} de {institutions.length} instituciones
          </div>
        </div>

        {/* Filtros móviles */}
        {(isMobile && showFilters) && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 gap-2">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedFilter(option.value);
                    setShowFilters(false);
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 text-left ${
                    selectedFilter === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {filteredInstitutions.length === 0 ? (
              <div className="text-center py-8">
                {institutions.length === 0 ? (
                  <>
                    <p className="text-gray-500 mb-4">No hay instituciones registradas</p>
                    <button 
                      onClick={() => setIsInstitutionModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Institución
                    </button>
                  </>
                ) : (
                  <p className="text-gray-500">
                    No hay instituciones que coincidan con el filtro seleccionado
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredInstitutions.map((institution) => (
                  <div key={institution.id} 
                    className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} p-4 border rounded-lg hover:bg-gray-50 transition-colors duration-200`}
                  >
                    <div className="flex items-center">
                      {institution.logo_url ? (
                        <img 
                          src={institution.logo_url} 
                          alt={institution.name}
                          className="h-10 w-10 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <span className="text-gray-500 text-lg font-medium">
                            {institution.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">{institution.name}</h3>
                        <p className="text-sm text-gray-500">{institution.email}</p>
                        <div className="mt-1">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                            {getInstitutionTypeLabel(institution.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${isMobile ? 'mt-3 ml-8' : ''}`}>
                      <button 
                        onClick={() => {
                          setSelectedInstitution(institution);
                          setIsDetailsView(true);
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                        {!isMobile && 'Ver Detalles'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isInstitutionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <InstitutionForm
            institution={isEditing ? selectedInstitution || undefined : undefined}
            onSubmit={handleInstitutionSubmit}
            onCancel={() => {
              setIsInstitutionModalOpen(false);
              setIsEditing(false);
            }}
            isEditing={isEditing}
          />
        </div>
      )}
    </div>
  );
}

export default Institutions;