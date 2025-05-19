import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

// Almacenamiento en localStorage para persistencia
const LOCAL_STORAGE_USER_KEY = 'app_cached_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Referencias para evitar llamadas repetidas
  const authCheckInProgress = useRef(false);
  
  // Estados principales
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Función para persistir datos de usuario en localStorage
  const persistUserData = (userData: User | null) => {
    if (userData) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  };
  
  // Función actualizar usuario
  const updateUserState = (userData: User | null) => {
    setUser(userData);
    persistUserData(userData);
  };
  
  // Función para obtener datos de usuario desde Supabase
  const fetchUserData = async (userId: string): Promise<any> => {
    // Implementamos un timeout para evitar bloqueos indefinidos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout fetching user data')), 5000);
    });
    
    const fetchPromise = new Promise(async (resolve) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error('Error al obtener datos del usuario:', error);
          resolve(null);
          return;
        }
        
        resolve(data);
      } catch (e) {
        console.error('Error inesperado al obtener datos del usuario:', e);
        resolve(null);
      }
    });
    
    try {
      // Utilizamos Promise.race para implementar el timeout
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (e) {
      console.error('Tiempo de espera excedido al obtener datos del usuario:', e);
      return null;
    }
  };
  
  // Función para construir objeto de usuario completo
  const enhanceUserData = (userData: any, sessionUser: any = null) => {
    if (!userData) return null;
    
    return {
      ...userData,
      role: userData.role || 'admin',
      full_name: userData.full_name || 
                (sessionUser?.email ? sessionUser.email.split('@')[0] : 'Usuario')
    } as User;
  };
  
  // Verificación de usuario principal
  const checkUser = async () => {
    // Evitamos verificaciones simultáneas
    if (authCheckInProgress.current) return;
    authCheckInProgress.current = true;
    
    try {
      setLoading(true);
      
      // Primero intentamos obtener la sesión
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Si hay error obteniendo la sesión, mantenemos el usuario actual
      if (sessionError) {
        console.error('Error al obtener sesión:', sessionError);
        return;
      }
      
      // Si no hay sesión, limpiamos el usuario
      if (!session) {
        updateUserState(null);
        return;
      }
      
      // Obtenemos datos del usuario
      const userData = await fetchUserData(session.user.id);
      
      // Si no se pudieron obtener datos, usamos los de la sesión
      if (!userData) {
        // Creamos un usuario mínimo con la información de la sesión
        const basicUser = {
          id: session.user.id,
          email: session.user.email,
          role: 'admin',
          full_name: session.user.email?.split('@')[0] || 'Usuario',
          created_at: new Date().toISOString()
        } as User;
        
        updateUserState(basicUser);
        return;
      }
      
      // Si todo va bien, actualizamos con datos completos
      const enhancedUser = enhanceUserData(userData, session.user);
      updateUserState(enhancedUser);
      
    } catch (error) {
      console.error('Error en verificación de usuario:', error);
      // En caso de error, intentamos recuperar datos del localStorage
      try {
        const cachedUserString = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (cachedUserString) {
          const cachedUser = JSON.parse(cachedUserString);
          setUser(cachedUser); // No persistimos para evitar ciclos
        }
      } catch (e) {
        console.error('Error recuperando datos de caché:', e);
      }
    } finally {
      setLoading(false);
      authCheckInProgress.current = false;
    }
  };
  
  // Función para mantener la sesión activa
  const keepSessionAlive = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Refrescamos la sesión para mantenerla activa
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error('Error refrescando sesión:', error);
    }
  };
  
  // Inicialización - solo se ejecuta una vez
  useEffect(() => {
    const initializeAuth = async () => {
      // Intentamos recuperar datos en caché primero para mejorar UX
      try {
        const cachedUserString = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (cachedUserString) {
          const cachedUser = JSON.parse(cachedUserString);
          setUser(cachedUser);
        }
      } catch (e) {
        console.error('Error al cargar datos de caché:', e);
      }
      
      // Luego verificamos el estado real
      await checkUser();
      
      setInitialized(true);
    };
    
    initializeAuth();
    
    // Configuramos intervalo para mantener sesión activa
    const keepAliveInterval = setInterval(keepSessionAlive, 10 * 60 * 1000); // 10 minutos
    
    return () => {
      clearInterval(keepAliveInterval);
    };
  }, []);
  
  // Configuración de listeners después de inicialización
  useEffect(() => {
    if (!initialized) return;
    
    // Listener para cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de autenticación:', event);
        
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && session) {
          // Si tenemos usuario en estado pero ID diferente, actualizamos
          if (user && user.id !== session.user.id) {
            await checkUser();
          } 
          // Si no tenemos usuario pero hay sesión, verificamos
          else if (!user) {
            await checkUser();
          }
        } 
        else if (event === 'SIGNED_OUT') {
          updateUserState(null);
        }
        
        setLoading(false);
      }
    );
    
    // Listener para cambios de visibilidad de página
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Al volver a la pestaña, verificamos sesión sin bloquear UI
        setTimeout(async () => {
          await keepSessionAlive();
          
          // Solo verificamos usuario completo si hay discrepancia
          const { data } = await supabase.auth.getSession();
          const hasSession = !!data.session;
          const hasUser = !!user;
          
          if (hasSession !== hasUser) {
            await checkUser();
          }
        }, 0);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Limpieza
    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialized, user]);
  
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
      
      // Verificamos usuario inmediatamente para mejor UX
      if (data.user) {
        await checkUser();
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
      updateUserState(null);
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
      await checkUser();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
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