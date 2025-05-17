// Tipos base exportados
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'dian' | 'institucion';
export type AgreementStatus = 'active' | 'completed' | 'pending' | 'cancelled' | 'finished';
export type ActivityStatus =  'en_proceso' | 'finalizado' | 'cancelado';

// Definiciones de tipos de entidades
export type User = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

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
  user_id: string;
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
  end_date: string | null;
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
  rating: number | null;
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

export interface SupabaseError extends Error {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// Database unificada
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      institutions: {
        Row: Institution;
        Insert: {
          id?: string;
          name: string;
          nit: string;
          address?: string;
          email: string;
          logo_url?: string | null;
          registration_date?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          nit?: string;
          address?: string;
          email?: string;
          logo_url?: string | null;
          registration_date?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      members: {
        Row: Member;
        Insert: {
          id?: string;
          institution_id: string;
          full_name: string;
          role: string;
          email: string;
          phone?: string | null;
          department?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          full_name?: string;
          role?: string;
          email?: string;
          phone?: string | null;
          department?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agreements: {
        Row: Agreement;
        Insert: {
          id?: string;
          institution_id: string;
          start_date: string;
          status: AgreementStatus;
          description: string;
          created_at?: string;
          updated_at?: string;
          end_date: string | null;
        };
        Update: {
          id?: string;
          institution_id?: string;
          start_date?: string;
          status?: AgreementStatus;
          description?: string;
          created_at?: string;
          updated_at?: string;
          end_date?: string | null;
        };
      };
      activities: {
        Row: Activity;
        Insert: {
          id?: string;
          agreement_id: string;
          title: string;
          activity_type: string;
          scheduled_date: string;
          attendee_count?: number;
          description?: string;
          image_url?: string | null;
          status?: ActivityStatus;
          progress_percentage?: number;
          is_modifiable?: boolean;
          created_at?: string;
          updated_at?: string;
          rating?: number | null;
        };
        Update: {
          id?: string;
          agreement_id?: string;
          title?: string;
          activity_type?: string;
          scheduled_date?: string;
          attendee_count?: number;
          description?: string;
          image_url?: string | null;
          status?: ActivityStatus;
          progress_percentage?: number;
          is_modifiable?: boolean;
          created_at?: string;
          updated_at?: string;
          rating?: number | null;
        };
      };
      activity_participants: {
        Row: ActivityParticipant;
        Insert: {
          activity_id: string;
          member_id: string;
          rating?: number | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          activity_id?: string;
          member_id?: string;
          rating?: number | null;
          role?: string;
          created_at?: string;
        };
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