import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  try {
    // Manejar preflight CORS - CRÍTICO: debe retornar status 200
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405
        }
      );
    }

    // Verificar que las variables de entorno estén disponibles
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Crear cliente admin para operaciones administrativas
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Obtener el token de autorización del header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    // Crear cliente con el token del usuario para verificar su sesión
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    console.log('Processing password change request for auth user:', user.id);

    // Obtener datos del request
    const requestBody = await req.json();
    const { userId, newPassword, currentPassword, userEmail } = requestBody;

    // Validar que todos los campos requeridos estén presentes
    if (!userId || !newPassword || !currentPassword || !userEmail) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: userId, newPassword, currentPassword, userEmail'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Validar longitud mínima de la nueva contraseña
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 6 characters long' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // 🔥 CORRECCIÓN CRÍTICA: Buscar el usuario en la tabla users usando auth_id
    const { data: requestingUserData, error: requestingUserError } = await supabaseAdmin
      .from('users')
      .select('role, id, email')
      .eq('auth_id', user.id) // ✅ Usar auth_id en lugar de id
      .single();

    if (requestingUserError || !requestingUserData) {
      console.error('Requesting user not found:', requestingUserError);
      return new Response(
        JSON.stringify({ error: 'Requesting user not found in users table' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log('Requesting user found:', requestingUserData);

    const isAdmin = requestingUserData.role === 'admin';
    const isOwnPassword = requestingUserData.id === userId; // Comparar con el ID de la tabla users

    if (!isAdmin && !isOwnPassword) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      );
    }

    // 🔥 CORRECCIÓN: Buscar el usuario objetivo en la tabla users Y obtener su auth_id
    const { data: targetUserData, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, id, auth_id') // ✅ Incluir auth_id
      .eq('id', userId)
      .single();

    if (userError || !targetUserData) {
      console.error('Target user not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    if (!targetUserData.auth_id) {
      console.error('Target user has no auth_id');
      return new Response(
        JSON.stringify({ error: 'User has no authentication record' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('Target user found:', { 
      id: targetUserData.id, 
      email: targetUserData.email,
      auth_id: targetUserData.auth_id 
    });

    // Verificar la contraseña actual solo si es el propio usuario
    if (isOwnPassword) {
      const { error: verifyError } = await supabaseUser.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword
      });

      if (verifyError) {
        console.error('Current password verification failed:', verifyError);
        return new Response(
          JSON.stringify({ error: 'Current password is incorrect' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    }

    console.log('Updating password for auth user:', targetUserData.auth_id);

    // 🔥 CORRECCIÓN CRÍTICA: Usar el auth_id del usuario objetivo
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserData.auth_id, // ✅ Usar auth_id en lugar de userId
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log('Password updated successfully for user:', userId, 'auth_id:', targetUserData.auth_id);

    return new Response(
      JSON.stringify({
        message: 'Password updated successfully',
        success: true,
        userId: userId,
        authId: targetUserData.auth_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
      }
    );
  }
});