/*
  # Corregir permisos y políticas para gestión de usuarios

  1. Políticas de RLS
    - Permitir a admins leer/actualizar todos los usuarios
    - Permitir a usuarios leer/actualizar su propia información
    - Corregir políticas existentes

  2. Funciones de utilidad
    - Función para verificar si un usuario es admin
    - Políticas basadas en roles

  3. Correcciones
    - Habilitar RLS correctamente
    - Agregar políticas faltantes
    - Corregir permisos de tabla
*/

-- Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Función para verificar si el usuario puede acceder a un registro específico
CREATE OR REPLACE FUNCTION public.can_access_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    auth.uid() = user_id -- Es el mismo usuario
    OR 
    public.is_admin() -- O es admin
  ;
$$;

-- Eliminar políticas existentes que puedan causar conflictos
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Asegurar que RLS esté habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: admins pueden ver todos, usuarios solo su propia información
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_user(id)
  );

-- Política para UPDATE: admins pueden actualizar todos, usuarios solo su propia información
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_user(id)
  )
  WITH CHECK (
    public.can_access_user(id)
  );

-- Política para INSERT: solo admins pueden insertar nuevos usuarios
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- Política para DELETE: solo admins pueden eliminar usuarios
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- Crear vista para listar usuarios (solo para admins)
CREATE OR REPLACE VIEW public.users_admin_view AS
SELECT 
  id,
  email,
  full_name,
  role,
  avatar_url,
  created_at,
  updated_at,
  last_sign_in_at
FROM public.users
WHERE public.is_admin();

-- Política para la vista (solo admins)
DROP POLICY IF EXISTS "admin_users_view_policy" ON public.users_admin_view;

-- Función para obtener usuarios (para admins)
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.avatar_url,
    u.created_at,
    u.updated_at,
    u.last_sign_in_at
  FROM public.users u
  WHERE public.is_admin();
$$;

-- Función para actualizar usuario (para admins y propietarios)
CREATE OR REPLACE FUNCTION public.update_user_safe(
  user_id uuid,
  new_full_name text DEFAULT NULL,
  new_role text DEFAULT NULL,
  new_avatar_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  can_update boolean;
BEGIN
  -- Verificar permisos
  can_update := public.can_access_user(user_id);
  
  IF NOT can_update THEN
    RETURN json_build_object('error', 'Insufficient permissions');
  END IF;

  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Solo admin puede cambiar roles
  IF new_role IS NOT NULL AND NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Only admins can change user roles');
  END IF;

  -- Actualizar usuario
  UPDATE public.users 
  SET 
    full_name = COALESCE(new_full_name, full_name),
    role = CASE 
      WHEN new_role IS NOT NULL AND public.is_admin() THEN new_role 
      ELSE role 
    END,
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    updated_at = now()
  WHERE id = user_id;

  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'message', 'User updated successfully'
  ) INTO result;

  RETURN result;
END;
$$;

-- Conceder permisos necesarios
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_safe(uuid, text, text, text) TO authenticated;

-- Crear índices para optimizar las consultas
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(id);