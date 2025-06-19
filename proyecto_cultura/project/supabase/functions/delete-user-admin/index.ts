// supabase/functions/delete-user-admin/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== INICIO DE FUNCIÓN DELETE USER ===')
    
    // Verificar que sea método POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verificar variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Supabase URL existe:', !!supabaseUrl)
    console.log('Service Role Key existe:', !!serviceRoleKey)

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Variables de entorno faltantes')
      return new Response(
        JSON.stringify({ error: 'Variables de entorno no configuradas correctamente' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Crear cliente Supabase con service role key
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Cliente Supabase Admin creado')

    // Verificar authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Authorization header faltante')
      return new Response(
        JSON.stringify({ error: 'Token de autorización requerido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Obtener datos del request
    let requestBody
    try {
      requestBody = await req.json()
      console.log('Request body recibido:', requestBody)
    } catch (e) {
      console.error('Error parseando JSON:', e)
      return new Response(
        JSON.stringify({ error: 'JSON inválido en el request' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const { userId } = requestBody

    // Validar que userId esté presente
    if (!userId) {
      console.error('UserId faltante')
      return new Response(
        JSON.stringify({ error: 'ID de usuario es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('UserId recibido:', userId)

    // Verificar permisos del usuario actual
    const token = authHeader.replace('Bearer ', '')
    console.log('Verificando token del usuario actual...')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Error obteniendo usuario:', userError)
      return new Response(
        JSON.stringify({ error: 'Token inválido o usuario no encontrado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Usuario actual:', user.id)

    // Verificar que el usuario actual es admin (usando la tabla users)
    const { data: currentUserData, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (currentUserError || !currentUserData || currentUserData.role !== 'admin') {
      console.error('Usuario sin permisos de admin:', currentUserData)
      return new Response(
        JSON.stringify({ error: 'Permisos insuficientes. Solo los administradores pueden eliminar usuarios.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Permisos verificados - Usuario es admin')

    // CORREGIDO: Buscar el usuario a eliminar de forma más flexible
    // Primero intentar por auth_id, luego por id de la tabla
    let userToDelete = null
    let userToDeleteError = null

    // Intentar buscar por auth_id primero
    const { data: userByAuthId, error: authIdError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, auth_id')
      .eq('auth_id', userId)
      .single()

    if (userByAuthId && !authIdError) {
      userToDelete = userByAuthId
      console.log('Usuario encontrado por auth_id:', userToDelete.email)
    } else {
      // Si no se encuentra por auth_id, intentar por id de la tabla
      console.log('No encontrado por auth_id, intentando por id de tabla...')
      const { data: userById, error: idError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, auth_id')
        .eq('id', userId)
        .single()

      if (userById && !idError) {
        userToDelete = userById
        console.log('Usuario encontrado por id de tabla:', userToDelete.email)
      } else {
        userToDeleteError = idError || authIdError
      }
    }

    if (userToDeleteError || !userToDelete) {
      console.error('Usuario a eliminar no encontrado:', userToDeleteError)
      console.error('Auth ID Error:', authIdError)
      console.error('Table ID Error:', userToDeleteError)
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no encontrado',
          debug: {
            searchedUserId: userId,
            authIdError: authIdError?.message,
            tableIdError: userToDeleteError?.message
          }
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Usuario a eliminar encontrado:', userToDelete.email)

    // Evitar que un admin se elimine a sí mismo
    if (userToDelete.auth_id === user.id) {
      console.error('Intento de auto-eliminación')
      return new Response(
        JSON.stringify({ error: 'No puedes eliminar tu propia cuenta' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('=== ELIMINANDO USUARIO ===')

    // Primero eliminar de la tabla users (usando el auth_id correcto)
    const { error: deleteTableError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('auth_id', userToDelete.auth_id)

    if (deleteTableError) {
      console.error('Error eliminando de tabla users:', deleteTableError)
      return new Response(
        JSON.stringify({ error: `Error eliminando datos del usuario: ${deleteTableError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Usuario eliminado de tabla users')

    // Luego eliminar del sistema de autenticación (usando auth_id)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.auth_id)
    
    if (deleteAuthError) {
      console.error('Error eliminando usuario de auth:', deleteAuthError)
      return new Response(
        JSON.stringify({ error: `Error eliminando usuario del sistema de autenticación: ${deleteAuthError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Usuario eliminado del sistema de autenticación')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Usuario ${userToDelete.email} eliminado correctamente`,
        deleted_user: {
          email: userToDelete.email,
          full_name: userToDelete.full_name,
          auth_id: userToDelete.auth_id
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('ERROR GLOBAL:', error)

    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})