export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agreements: {
        Row: {
          id: string
          institution_id: string
          start_date: string
          status: 'active' | 'completed' | 'pending' | 'cancelled'
          description: string
          created_at: string
          updated_at: string
          end_date: string
        }
        Insert: {
          id?: string
          institution_id: string
          start_date: string
          status: 'active' | 'completed' | 'pending' | 'cancelled'
          description: string
          created_at?: string
          updated_at?: string
          end_date: string
        }
        Update: {
          id?: string
          institution_id?: string
          start_date?: string
          status?: 'active' | 'completed' | 'pending' | 'cancelled'
          description?: string
          created_at?: string
          updated_at?: string
          end_date?: string
        }
      }
      activities: {
        Row: {
          id: string
          agreement_id: string
          title: string
          activity_type: string
          scheduled_date: string
          attendee_count: number
          description: string
          image_url: string
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          progress_percentage: number
          is_modifiable: boolean
          created_at: string
          updated_at: string
          rating: number
        }
        Insert: {
          id?: string
          agreement_id: string
          title: string
          activity_type: string
          scheduled_date: string
          attendee_count?: number
          description?: string
          image_url?: string
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          progress_percentage?: number
          is_modifiable?: boolean
          created_at?: string
          updated_at?: string
          rating?: number
        }
        Update: {
          id?: string
          agreement_id?: string
          title?: string
          activity_type?: string
          scheduled_date?: string
          attendee_count?: number
          description?: string
          image_url?: string
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          progress_percentage?: number
          is_modifiable?: boolean
          created_at?: string
          updated_at?: string
          rating?: number
        }
      }
      institutions: {
        Row: {
          id: string
          name: string
          nit: string
          address: string
          email: string
          logo_url: string
          registration_date: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          nit: string
          address?: string
          email: string
          logo_url?: string
          registration_date?: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          nit?: string
          address?: string
          email?: string
          logo_url?: string
          registration_date?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      members: {
        Row: {
          id: string
          institution_id: string
          full_name: string
          role: string
          email: string
          phone: string
          department: string
          avatar_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          full_name: string
          role: string
          email: string
          phone?: string
          department?: string
          avatar_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          full_name?: string
          role?: string
          email?: string
          phone?: string
          department?: string
          avatar_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      activity_participants: {
        Row: {
          activity_id: string
          member_id: string
          rating: number
          role: string
          created_at: string
        }
        Insert: {
          activity_id: string
          member_id: string
          rating?: number
          role?: string
          created_at?: string
        }
        Update: {
          activity_id?: string
          member_id?: string
          rating?: number
          role?: string
          created_at?: string
        }
      }
    }
  }
}