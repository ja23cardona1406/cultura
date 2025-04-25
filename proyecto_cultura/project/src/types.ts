export type User = {
    id: string;
    email: string;
    role: 'admin' | 'viewer';
    created_at: string;
  };


export type UserRole = 'admin' | 'dian' | 'institucion';
export type AgreementStatus = 'active' | 'finished';
export type ActivityStatus = 'en_proceso' | 'finalizado' | 'cancelado';

export type Institution = {
    id: string;
    name: string;
    nit: string;
    address: string;
    email: string;
    logo_url: string | null;
    registration_date: string;
    created_at: string;
    updated_at: string;
  };
  
  export type Member = {
    id: string;
    institution_id: string;
    full_name: string;
    role: string;
    email: string;
    phone: string | null;
    department: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
  };
  
  export type Agreement = {
    id: string;
    institution_id: string;
    start_date: string;
    status: AgreementStatus;
    description: string;
    created_at: string;
    updated_at: string;
  };
  
  export type Activity = {
    id: string;
    agreement_id: string;
    title: string;
    activity_type: string;
    scheduled_date: string;
    attendee_count: number;
    description: string;
    image_url: string | null;
    status: ActivityStatus;
    progress_percentage: number;
    is_modifiable: boolean;
    created_at: string;
    updated_at: string;
  };
  
  export type ActivityParticipant = {
    activity_id: string;
    member_id: string;
    rating: number | null;
    role: string;
    created_at: string;
  };
  
  export type Observation = {
    id: string;
    activity_id: string;
    title: string;
    description: string;
    activity_type: string;
    image_url: string | null;
    created_at: string;
  };
  
  export type Report = {
    id: string;
    activity_id: string;
    general_summary: string;
    people_impacted: number;
    generated_by: string;
    created_at: string;
  };
  
  export type AuditLog = {
    id: string;
    user_id: string | null;
    action_description: string;
    created_at: string;
  };
  
  export type Database = {
    public: {
      Tables: {
        users: {
          Row: User;
          Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
        };
        institutions: {
          Row: Institution;
          Insert: Omit<Institution, 'id' | 'registration_date' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<Institution, 'id' | 'registration_date' | 'created_at' | 'updated_at'>>;
        };
        members: {
          Row: Member;
          Insert: Omit<Member, 'id' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<Member, 'id' | 'created_at' | 'updated_at'>>;
        };
        agreements: {
          Row: Agreement;
          Insert: Omit<Agreement, 'id' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<Agreement, 'id' | 'created_at' | 'updated_at'>>;
        };
        activities: {
          Row: Activity;
          Insert: Omit<Activity, 'id' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<Activity, 'id' | 'created_at' | 'updated_at'>>;
        };
        activity_participants: {
          Row: ActivityParticipant;
          Insert: Omit<ActivityParticipant, 'created_at'>;
          Update: Partial<Omit<ActivityParticipant, 'activity_id' | 'member_id' | 'created_at'>>;
        };
        observations: {
          Row: Observation;
          Insert: Omit<Observation, 'id' | 'created_at'>;
          Update: Partial<Omit<Observation, 'id' | 'created_at'>>;
        };
        reports: {
          Row: Report;
          Insert: Omit<Report, 'id' | 'created_at'>;
          Update: Partial<Omit<Report, 'id' | 'created_at'>>;
        };
        audit_log: {
          Row: AuditLog;
          Insert: Omit<AuditLog, 'id' | 'created_at'>;
          Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>;
        };
      };
    };
  };