import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== INICIO DE FUNCIÓN ===')
    
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

    // Obtener datos del request PRIMERO
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
    
    const { email, password, full_name, role } = requestBody

    // Validar campos requeridos INMEDIATAMENTE
    if (!email || !password || !full_name || !role) {
      console.error('Campos faltantes:', { 
        email: !!email, 
        password: !!password, 
        full_name: !!full_name, 
        role: !!role 
      })
      return new Response(
        JSON.stringify({
          error: 'Email, contraseña, nombre completo y rol son requeridos',
          received: { email: !!email, password: !!password, full_name: !!full_name, role: !!role }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      console.error('Contraseña muy corta:', password.length)
      return new Response(
        JSON.stringify({
          error: 'La contraseña debe tener al menos 6 caracteres'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verificar permisos del usuario actual DESPUÉS de validar input
    const token = authHeader.replace('Bearer ', '')
    console.log('Verificando token del usuario...')
    
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

    // Verificar que el usuario actual es admin
    const { data: currentUserData, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (currentUserError || !currentUserData || currentUserData.role !== 'admin') {
      console.error('Usuario sin permisos de admin:', currentUserData)
      return new Response(
        JSON.stringify({ error: 'Permisos insuficientes. Solo los administradores pueden crear usuarios.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Permisos verificados')

    // MAPEO DE ROLES
    const roleMapping = {
      'user': 'usuario',
      'admin': 'admin',
      'dian': 'DIAN',
      'institucion': 'institucion'
    }

    const mappedRole = roleMapping[role as keyof typeof roleMapping]
    
    if (!mappedRole) {
      console.error('Rol inválido:', role)
      return new Response(
        JSON.stringify({
          error: `Rol inválido. Los roles válidos son: ${Object.keys(roleMapping).join(', ')}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Rol mapeado:', role, '->', mappedRole)

    // Verificar email existente
    console.log('Verificando email existente...')
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle() // Usar maybeSingle en lugar de single

    if (existingUserError) {
      console.error('Error verificando email:', existingUserError)
      return new Response(
        JSON.stringify({ error: `Error verificando email: ${existingUserError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (existingUser) {
      console.error('Email ya existe:', email)
      return new Response(
        JSON.stringify({ error: 'Ya existe un usuario con este email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Email disponible')

    // Crear usuario usando admin API
    console.log('=== CREANDO USUARIO EN AUTH ===')
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: mappedRole,
        created_from_admin: true
      }
    })

    if (createError) {
      console.error('ERROR AL CREAR USUARIO:', createError)
      return new Response(
        JSON.stringify({
          error: `Error al crear usuario: ${createError.message}`,
          code: createError.status || 'unknown'
        }),
        {
          status: createError.status || 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!userData?.user) {
      console.error('No se recibieron datos del usuario')
      return new Response(
        JSON.stringify({ error: 'No se pudo crear el usuario' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Usuario creado exitosamente:', userData.user.id)

    // El trigger debería insertar automáticamente en la tabla users
    // Verificar que se insertó correctamente
    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role')
      .eq('auth_id', userData.user.id)
      .single()

    if (insertError) {
      console.error('Error verificando inserción en tabla users:', insertError)
      // No fallar aquí, el usuario ya fue creado en auth
    } else {
      console.log('Usuario insertado en tabla users:', insertedUser)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userData.user.id,
        email: userData.user.email,
        full_name: full_name,
        role: mappedRole,
        message: 'Usuario creado correctamente'
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