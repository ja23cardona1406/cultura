/*
  # Update RLS policies for institutions and members

  1. Changes
    - Update RLS policies for institutions table
    - Update RLS policies for members table
    - Add policies for authenticated users to manage institutions and members

  2. Security
    - Enable authenticated users to insert and update institutions
    - Enable authenticated users to manage members
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON institutions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON institutions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON institutions;

DROP POLICY IF EXISTS "Enable read access for all users" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON members;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON members;

-- Create new policies for institutions
CREATE POLICY "Enable read access for authenticated users" ON institutions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON institutions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON institutions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new policies for members
CREATE POLICY "Enable read access for authenticated users" ON members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON members
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);