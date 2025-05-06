import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Institution, Member, SupabaseError } from '../types';
import { PostgrestError } from '@supabase/supabase-js';
import InstitutionCard from './institutions/InstitutionCard';
import InstitutionDetails from './institutions/InstitutionDetails';
import MemberDetails from './institutions/MemberDetails';
import InstitutionForm from './institutions/InstitutionForm';
import MemberForm from './institutions/MemberForm';

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
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleImageUpload = async (file: File, type: 'institution' | 'member', name: string, institutionName?: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      let fileName = '';
      let filePath = '';

      // Formatear nombres para que sean URL-friendly
      const formatName = (str: string) => {
        return str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
          .replace(/[^a-zA-Z0-9]/g, '_') // Reemplaza caracteres especiales por guiones bajos
          .toLowerCase();
      };

      const formattedName = formatName(name);
      // Move declaration outside of if/else block to make it accessible throughout the function
      const formattedInstitutionName = institutionName ? formatName(institutionName) : 'unknown_institution';

      if (type === 'institution') {
        fileName = `${formattedName}.${fileExt}`;
        filePath = `institutions/${fileName}`;
      } else {
        fileName = `${formattedInstitutionName}_${formattedName}.${fileExt}`;
        filePath = `members/${fileName}`;
      }

      // Verificar si ya existe un archivo con ese nombre
      const { data: existingFiles } = await supabase.storage
        .from('imagenes')
        .list(type === 'institution' ? 'institutions' : 'members');
      
      // Si existe un archivo con el mismo nombre, añadir timestamp para hacerlo único
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
      // Primero eliminamos los miembros asociados
      const { error: membersError } = await supabase
        .from('members')
        .delete()
        .eq('institution_id', institutionId);

      if (membersError) throw membersError;

      // Luego eliminamos la institución
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
        // Update existing institution
        const { data, error: updateError } = await supabase
          .from('institutions')
          .update({
            name: formData.name,
            nit: formData.nit,
            address: formData.address,
            email: formData.email,
            logo_url,
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
        // Create new institution
        const { data, error: insertError } = await supabase
          .from('institutions')
          .insert([{
            name: formData.name,
            nit: formData.nit,
            address: formData.address,
            email: formData.email,
            logo_url,
            user_id: user.id
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
        // Update existing member
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
        // Create new member
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
      <div className="p-6">
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
      <div className="p-6">
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
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Instituciones</h1>
        <button 
          onClick={() => setIsInstitutionModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {institutions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay instituciones registradas</p>
                <button 
                  onClick={() => setIsInstitutionModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Institución
                </button>
              </div>
            ) : (
              institutions.map((institution) => (
                <InstitutionCard
                  key={institution.id}
                  institution={institution}
                  onViewDetails={(institution) => {
                    setSelectedInstitution(institution);
                    setIsDetailsView(true);
                  }}
                  onDelete={() => handleDeleteInstitution(institution.id)}
                  isDeleting={isDeleting}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal para crear institución */}
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