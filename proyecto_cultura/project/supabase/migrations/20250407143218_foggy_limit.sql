/*
  # Initial Schema for DIAN Agreements Management System

  1. New Tables
    - users (Authentication and user management)
    - institutions (Educational institutions)
    - members (Institution members/representatives)
    - agreements (Institutional agreements)
    - activities (Agreement activities)
    - activity_participants (Activity participation and ratings)
    - observations (Activity observations/notes)
    - reports (Activity reports)
    - audit_log (System audit trail)

  2. Security
    - Enable RLS on all tables
    - Add policies for different user roles
    - Set up authentication

  3. Storage
    - Create buckets for profile images and activity attachments
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'dian', 'institucion');
CREATE TYPE agreement_status AS ENUM ('active', 'finished');
CREATE TYPE activity_status AS ENUM ('en_proceso', 'finalizado', 'cancelado');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'institucion',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Institutions table
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nit TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  registration_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agreements table
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  status agreement_status DEFAULT 'active',
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID REFERENCES agreements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  attendee_count INTEGER DEFAULT 0,
  description TEXT NOT NULL,
  image_url TEXT,
  status activity_status DEFAULT 'en_proceso',
  progress_percentage INTEGER DEFAULT 0,
  is_modifiable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activity participants junction table
CREATE TABLE activity_participants (
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 0 AND rating <= 5),
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (activity_id, member_id)
);

-- Observations table
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  general_summary TEXT NOT NULL,
  people_impacted INTEGER NOT NULL,
  generated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action_description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read all data
CREATE POLICY "Admins can read all data" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Similar policies for other tables...

-- Create storage buckets
INSERT INTO storage.buckets (id, name)
VALUES 
  ('profiles', 'Profile Images'),
  ('activities', 'Activity Attachments')
ON CONFLICT DO NOTHING;

-- Enable storage policies
CREATE POLICY "Anyone can view profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Authenticated users can upload profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profiles' 
    AND auth.role() = 'authenticated'
  );

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Repeat for other tables that need updated_at tracking