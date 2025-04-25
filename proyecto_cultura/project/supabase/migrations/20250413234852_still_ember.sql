/*
  # Update RLS policies for institutions and members

  1. Changes
    - Add user_id column to institutions table if not exists
    - Enable RLS on both tables
    - Create policies for institutions and members tables
    
  2. Security
    - Enable RLS on both tables
    - Add policies for CRUD operations
    - Ensure users can only access their own data
*/

-- Add user_id column to institutions if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'institutions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE institutions ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Enable RLS on institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policies for institutions table
CREATE POLICY "Users can create their own institutions"
ON institutions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own institutions"
ON institutions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own institutions"
ON institutions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own institutions"
ON institutions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policies for members table
CREATE POLICY "Users can create members for their institutions"
ON members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM institutions
    WHERE institutions.id = members.institution_id
    AND institutions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view members of their institutions"
ON members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM institutions
    WHERE institutions.id = members.institution_id
    AND institutions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update members of their institutions"
ON members
FOR UPDATE
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

CREATE POLICY "Users can delete members of their institutions"
ON members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM institutions
    WHERE institutions.id = members.institution_id
    AND institutions.user_id = auth.uid()
  )
);