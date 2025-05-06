import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { Institution, Member, ActivityParticipant } from '../../types';
import { supabase } from '../../lib/supabase';

interface ParticipantSelectorProps {
  agreementId: string;
  initialParticipants?: ActivityParticipant[];
  onChange: (participants: ActivityParticipant[]) => void;
}

const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({
  agreementId,
  initialParticipants = [],
  onChange
}) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [members, setMembers] = useState<(Member & { isSelected?: boolean })[]>([]);
  const [participants, setParticipants] = useState<ActivityParticipant[]>(initialParticipants);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedInstitutions, setExpandedInstitutions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInstitutionsWithMembers();
  }, [agreementId]);

  useEffect(() => {
    if (initialParticipants.length > 0 && members.length > 0) {
      const updatedMembers = members.map(member => ({
        ...member,
        isSelected: initialParticipants.some(p => p.member_id === member.id)
      }));
      setMembers(updatedMembers);
    }
  }, [initialParticipants, members.length]);

  const fetchInstitutionsWithMembers = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // First, get the institution_id from the agreement
      const { data: agreementData, error: agreementError } = await supabase
        .from('agreements')
        .select('institution_id')
        .eq('id', agreementId)
        .single();

      if (agreementError) throw agreementError;
      
      if (!agreementData) {
        throw new Error('No se encontró el convenio');
      }

      // Fetch the primary institution
      const { data: primaryInstitution, error: primaryError } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', agreementData.institution_id)
        .single();

      if (primaryError) throw primaryError;
      
      // Fetch all other institutions (for future multi-institution activities)
      const { data: otherInstitutions, error: othersError } = await supabase
        .from('institutions')
        .select('*')
        .neq('id', agreementData.institution_id)
        .order('name');

      if (othersError) throw othersError;
      
      // Combine institutions with primary first
      const allInstitutions = [primaryInstitution, ...(otherInstitutions || [])];
      setInstitutions(allInstitutions);
      
      // Default expand the primary institution
      setExpandedInstitutions({
        [primaryInstitution.id]: true
      });
      
      // Fetch members for all institutions
      const { data: allMembers, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('full_name');
      
      if (membersError) throw membersError;
      
      if (allMembers) {
        setMembers(allMembers.map(member => ({
          ...member,
          isSelected: initialParticipants.some(p => p.member_id === member.id)
        })));
      }
    } catch (err) {
      const error = err as Error;
      setError('Error al cargar las instituciones y miembros: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInstitution = useCallback((institutionId: string) => {
    setExpandedInstitutions(prev => ({
      ...prev,
      [institutionId]: !prev[institutionId]
    }));
  }, []);

  const toggleMemberSelection = useCallback((member: Member) => {
    setMembers(prev => 
      prev.map(m => 
        m.id === member.id 
          ? { ...m, isSelected: !m.isSelected } 
          : m
      )
    );
    
    setParticipants(prev => {
      if (prev.some(p => p.member_id === member.id)) {
        return prev.filter(p => p.member_id !== member.id);
      } else {
        const newParticipant: ActivityParticipant = {
          activity_id: '',
          member_id: member.id,
          role: 'Participante',
          rating: null,
          created_at: new Date().toISOString()
        };
        return [...prev, newParticipant];
      }
    });
  }, []);

  const updateParticipantRole = useCallback((memberId: string, role: string) => {
    setParticipants(prev => 
      prev.map(participant => 
        participant.member_id === memberId
          ? { ...participant, role }
          : participant
      )
    );
  }, []);

  const removeParticipant = useCallback((memberId: string) => {
    setParticipants(prev => prev.filter(p => p.member_id !== memberId));
    setMembers(prev => 
      prev.map(m => 
        m.id === memberId 
          ? { ...m, isSelected: false } 
          : m
      )
    );
  }, []);

  const filteredMembers = useCallback((institutionId: string) => {
    return members.filter(member => 
      member.institution_id === institutionId && 
      (searchTerm === '' || 
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [members, searchTerm]);

  useEffect(() => {
    if (participants !== initialParticipants) {
      onChange(participants);
    }
  }, [participants]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar miembros..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="border rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Available Members Section */}
          <div className="border-r p-4">
            <h3 className="font-medium mb-3">Instituciones y Miembros</h3>
            
            {institutions.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No hay instituciones disponibles
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {institutions.map(institution => (
                  <div key={institution.id} className="border rounded-md">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleInstitution(institution.id)}
                    >
                      <div className="flex items-center gap-2">
                        {institution.logo_url ? (
                          <img
                            src={institution.logo_url}
                            alt={institution.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-gray-200"></div>
                        )}
                        <span className="font-medium">{institution.name}</span>
                      </div>
                      {expandedInstitutions[institution.id] ? 
                        <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      }
                    </div>
                    
                    {expandedInstitutions[institution.id] && (
                      <div className="p-3 border-t bg-gray-50">
                        {filteredMembers(institution.id).length === 0 ? (
                          <div className="text-center py-2 text-sm text-gray-500">
                            No hay miembros para esta institución
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {filteredMembers(institution.id).map(member => (
                              <li 
                                key={member.id}
                                className={`flex items-center justify-between p-2 rounded-md ${
                                  member.isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'
                                } cursor-pointer transition-colors duration-200`}
                                onClick={() => toggleMemberSelection(member)}
                              >
                                <div className="flex items-center gap-2">
                                  {member.isSelected ? (
                                    <div className="h-5 w-5 rounded-md bg-blue-500 flex items-center justify-center">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 rounded-md border border-gray-300"></div>
                                  )}
                                  <span className={member.isSelected ? 'font-medium text-blue-700' : ''}>
                                    {member.full_name}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">{member.role}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Selected Participants Section */}
          <div className="p-4">
            <h3 className="font-medium mb-3">Participantes Seleccionados</h3>
            
            {participants.length === 0 ? (
              <div className="text-center py-6 text-gray-500 border border-dashed rounded-md">
                No hay participantes seleccionados
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {participants.map(participant => {
                  const member = members.find(m => m.id === participant.member_id);
                  const institution = institutions.find(i => i.id === member?.institution_id);
                  
                  return member && (
                    <div key={participant.member_id} className="border rounded-md p-3 relative">
                      <button
                        type="button"
                        onClick={() => removeParticipant(participant.member_id)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      
                      <div className="mb-2">
                        <div className="flex items-center gap-2">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                              {member.full_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-xs text-gray-500">
                              {institution?.name || 'Institución no encontrada'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rol en la Actividad
                        </label>
                        <select
                          value={participant.role}
                          onChange={(e) => updateParticipantRole(participant.member_id, e.target.value)}
                          className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Organizador">Organizador</option>
                          <option value="Facilitador">Facilitador</option>
                          <option value="Ponente">Ponente</option>
                          <option value="Participante">Participante</option>
                          <option value="Observador">Observador</option>
                          <option value="Invitado">Invitado</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {participants.length > 0 && (
        <div className="bg-green-50 p-3 rounded-md flex items-start gap-3">
          <Check className="h-5 w-5 text-green-500 mt-0.5" />
          <div className="text-sm text-green-700">
            <p>{participants.length} participante{participants.length !== 1 ? 's' : ''} seleccionado{participants.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantSelector;