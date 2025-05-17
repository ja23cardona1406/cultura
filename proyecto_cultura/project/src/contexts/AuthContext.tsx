import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Función para manejar la verificación inicial de usuario
  useEffect(() => {
    // Verificar la sesión actual al cargar
    const initialCheck = async () => {
      await checkUser();
      setAuthChecked(true);
    };
    
    initialCheck();
  }, []);

  // Suscripción a cambios de autenticación (después de la verificación inicial)
  useEffect(() => {
    if (!authChecked) return;
    
    // Suscribirse a los cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Evento de autenticación:", event);
        
        if (session) {
          try {
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error('Error al obtener datos del usuario:', error);
              setUser(null);
            } else {
              console.log("Datos del usuario en cambio de estado:", userData);
              
              // Si el usuario no tiene full_name o role, completamos con valores por defecto
              const enhancedUser = {
                ...userData,
                role: userData.role || 'admin',  // Por defecto admin 
                full_name: userData.full_name || session.user.email?.split('@')[0] || 'Usuario'
              };
              
              setUser(enhancedUser as User);
            }
          } catch (e) {
            console.error('Error en el listener de autenticación:', e);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [authChecked]);

  async function checkUser() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("Sesión activa:", session);
        
        // Obtener datos completos del usuario desde la tabla users
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error al obtener datos del usuario:', error);
          setUser(null);
        } else {
          console.log("Datos del usuario obtenidos:", userData);
          
          // Si el usuario no tiene full_name o role, intentamos completarlo con la información de auth
          const enhancedUser = {
            ...userData,
            // Aseguramos que el rol sea el correcto, no 'viewer' por defecto
            role: userData.role || 'admin',  
            // Aseguramos que tengamos un nombre completo
            full_name: userData.full_name || session.user.email?.split('@')[0] || 'Usuario'
          };
          
          setUser(enhancedUser as User);
        }
      } else {
        // Si no hay sesión, aseguramos que el usuario sea null y terminamos el loading
        setUser(null);
      }
    } catch (error) {
      console.error('Error al verificar usuario:', error);
      // En caso de error, aseguramos que el usuario sea null
      setUser(null);
    } finally {
      // Siempre terminamos el loading, sin importar el resultado
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Obtener datos completos del usuario desde la tabla users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          console.error('Error al obtener datos del usuario después de iniciar sesión:', userError);
          setError('Error al obtener datos de usuario');
        } else {
          console.log("Datos del usuario al iniciar sesión:", userData);
          
          // Aseguramos que los datos importantes estén presentes
          const enhancedUser = {
            ...userData,
            role: userData.role || 'admin',  // Por defecto admin si no está definido
            full_name: userData.full_name || data.user.email?.split('@')[0] || 'Usuario'
          };
          
          setUser(enhancedUser as User);
        }
      }
    } catch (error) {
      setError('Error inesperado durante el inicio de sesión');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshUser() {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error al actualizar datos del usuario:', error);
      } else {
        console.log("Datos actualizados del usuario:", userData);
        
        // Aseguramos que los datos importantes estén presentes
        const enhancedUser = {
          ...userData,
          role: userData.role || user.role || 'admin',  // Mantenemos el rol actual o admin
          full_name: userData.full_name || user.full_name || user.email?.split('@')[0] || 'Usuario'
        };
        
        setUser(enhancedUser as User);
      }
    } catch (error) {
      console.error('Error inesperado al actualizar usuario:', error);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}