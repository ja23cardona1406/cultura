import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req:Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente Supabase con service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener datos del request
    const { email, password, full_name, role } = await req.json()

    // Validar campos requeridos
    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({
          error: 'Email, contraseña, nombre completo y rol son requeridos'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
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

    // Crear usuario usando admin API CON LA BANDERA DEL FRONTEND
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: role,
        created_from_frontend: 'true' // ← ESTA ES LA CLAVE
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({
          error: createError.message || 'Error al crear usuario en el sistema de autenticación'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({
          error: 'No se pudo crear el usuario'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Retornar éxito con el user_id generado
    return new Response(
      JSON.stringify({
        success: true,
        user_id: userData.user.id,
        email: userData.user.email,
        message: 'Usuario creado correctamente en el sistema de autenticación'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in create-user-admin function:', error)
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
)
}
})
