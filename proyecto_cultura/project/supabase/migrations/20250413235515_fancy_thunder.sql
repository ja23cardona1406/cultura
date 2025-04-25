/*
  # Update RLS policies for members table

  1. Changes
    - Drop existing RLS policies for members table
    - Create new, simplified RLS policies for members table
    - Ensure proper access control based on institution ownership

  2. Security
    - Enable RLS on members table
    - Add policies for all CRUD operations
    - Link member access to institution ownership
*/

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can create members for their institutions" ON members;
DROP POLICY IF EXISTS "Users can view members of their institutions" ON members;
DROP POLICY IF EXISTS "Users can update members of their institutions" ON members;
DROP POLICY IF EXISTS "Users can delete members of their institutions" ON members;

-- Re-enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "Users can manage their institution members"
ON members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM institutions
    WHERE institutions.id = members.institution_id
    AND institutions.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM institutions
    WHERE institutions.id = members.institution_id
    AND institutions.user_id = auth.uid()
  )
);