import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { User } from '../types'; // Tu tipo personalizado

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Estados principales
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Referencias para evitar bucles infinitos y llamadas repetidas
  const isInitialized = useRef(false);
  const lastEventRef = useRef<{ event: string; timestamp: number } | null>(null);
  const authCheckInProgress = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Función actualizar usuario (sin localStorage)
  const updateUserState = (userData: User | null, sessionData: Session | null = null) => {
    setUser(userData);
    if (sessionData !== null) {
      setSession(sessionData);
    }
  };
  
  // Función mejorada para obtener datos de usuario (con reintentos)
  const fetchUserData = async (userId: string, retries = 3): Promise<any> => {
    try {
      // Timeout más largo para evitar errores
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      clearTimeout(timeoutId);

      if (error) {
        console.warn('Error al obtener datos del usuario:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.warn(`Attempt ${4 - retries} failed:`, error);
      
      if (retries > 0) {
        // Retry con delay exponencial
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        return fetchUserData(userId, retries - 1);
      }
      
      console.error('Max retries reached for fetchUserData:', error);
      return null;
    }
  };
  
  // Función para construir objeto de usuario completo
  const enhanceUserData = (userData: any, sessionUser: SupabaseUser | null = null) => {
    if (!userData) return null;
    
    return {
      ...userData,
      role: userData.role || 'admin',
      full_name: userData.full_name || 
                (sessionUser?.email ? sessionUser.email.split('@')[0] : 'Usuario')
    } as User;
  };
  
  // Verificación de usuario principal (mejorada)
  const checkUser = async (currentSession?: Session | null) => {
    // Evitamos verificaciones simultáneas
    if (authCheckInProgress.current) return;
    authCheckInProgress.current = true;
    
    try {
      // Usar sesión proporcionada o obtener la actual
      const sessionToUse = currentSession !== undefined ? currentSession : session;
      
      // Si no hay sesión, limpiamos el usuario
      if (!sessionToUse) {
        updateUserState(null, null);
        return;
      }
      
      // Obtenemos datos del usuario con reintentos
      const userData = await fetchUserData(sessionToUse.user.id);
      
      // Si no se pudieron obtener datos, usamos los de la sesión
      if (!userData) {
        const basicUser = {
          id: sessionToUse.user.id,
          email: sessionToUse.user.email,
          role: 'admin',
          full_name: sessionToUse.user.email?.split('@')[0] || 'Usuario',
          created_at: new Date().toISOString()
        } as User;
        
        updateUserState(basicUser, sessionToUse);
        return;
      }
      
      // Si todo va bien, actualizamos con datos completos
      const enhancedUser = enhanceUserData(userData, sessionToUse.user);
      updateUserState(enhancedUser, sessionToUse);
      
    } catch (error) {
      console.error('Error en verificación de usuario:', error);
      setError('Error al verificar usuario');
    } finally {
      authCheckInProgress.current = false;
    }
  };
  
  // Función mejorada para manejar cambios de autenticación
  const handleAuthChange = async (event: AuthChangeEvent, newSession: Session | null) => {
    const now = Date.now();
    
    // Evitar procesar eventos duplicados muy seguidos (CLAVE PARA EL BUCLE)
    if (lastEventRef.current && 
        lastEventRef.current.event === event && 
        now - lastEventRef.current.timestamp < 1000) {
      return;
    }
    
    lastEventRef.current = { event, timestamp: now };

    // Solo log de eventos importantes (no TOKEN_REFRESHED)
    if (event !== 'TOKEN_REFRESHED') {
      console.log('Evento de autenticación:', event);
    }

    switch (event) {
      case 'INITIAL_SESSION':
      case 'SIGNED_IN':
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user as any); // Usuario temporal
          
          // Fetch user data con debounce para evitar llamadas múltiples
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          
          fetchTimeoutRef.current = setTimeout(async () => {
            try {
              await checkUser(newSession);
            } catch (error) {
              console.warn('Error in delayed checkUser:', error);
            } finally {
              if (!isInitialized.current) {
                setLoading(false);
                isInitialized.current = true;
              }
            }
          }, 500);
        } else {
          setSession(null);
          setUser(null);
          if (!isInitialized.current) {
            setLoading(false);
            isInitialized.current = true;
          }
        }
        break;

      case 'SIGNED_OUT':
        setSession(null);
        setUser(null);
        setError(null);
        setLoading(false);
        isInitialized.current = true;
        break;

      case 'TOKEN_REFRESHED':
        // Solo actualizar session, no hacer fetch completo
        if (newSession) {
          setSession(newSession);
        }
        break;

      case 'USER_UPDATED':
        if (newSession) {
          // Solo actualizar si hay cambios significativos
          if (!user || user.id !== newSession.user.id) {
            await checkUser(newSession);
          }
        }
        break;

      default:
        if (!isInitialized.current) {
          setLoading(false);
          isInitialized.current = true;
        }
        break;
    }
  };
  
  // Inicialización - solo se ejecuta una vez
  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        // Obtenemos la sesión inicial
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Error getting initial session:', error);
          setError(error.message);
        } else {
          if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user as any); // Usuario temporal
            await checkUser(initialSession);
          } else {
            setUser(null);
            setSession(null);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setError('Error al inicializar autenticación');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          isInitialized.current = true;
        }
      }
    };
    
    getInitialSession();

    return () => {
      mounted = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);
  
  // Configuración de listeners después de inicialización
  useEffect(() => {
    if (!isInitialized.current) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    
    // Listener para cambios de visibilidad de página (simplificado)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        // Solo verificar sesión, no usuario completo
        setTimeout(async () => {
          try {
            const { data } = await supabase.auth.getSession();
            if (data.session && !user) {
              await checkUser(data.session);
            }
          } catch (error) {
            console.warn('Error en visibility check:', error);
          }
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [isInitialized.current]); // Dependencia mínima
  
  // Funciones de autenticación
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
      
      // La verificación de usuario se hará automáticamente en el listener
      if (data.session) {
        setSession(data.session);
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
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        setError(error.message);
        throw error;
      }
      
      // La limpieza se hará automáticamente en el listener
    } catch (error) {
      console.error('Error in signOut:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }
  
  async function refreshUser() {
    if (!session) return;
    
    try {
      setLoading(true);
      await checkUser(session);
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      setError('Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  }
  
  const value = {
    user,
    session,
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