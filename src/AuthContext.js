import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to test user_sessions table access
  // const testUserSessionsAccess = async () => {
  //   try {
  //     console.log('Testing user_sessions table access...');
      
  //     // Add timeout to prevent hanging
  //     const timeoutPromise = new Promise((_, reject) => 
  //       setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
  //     );
      
  //     const queryPromise = supabase.from('user_sessions').select('*').limit(1);
      
  //     const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
  //     if (error) {
  //       console.error('Error accessing user_sessions table:', error);
  //       console.error('Error details:', {
  //         message: error.message,
  //         details: error.details,
  //         hint: error.hint,
  //         code: error.code
  //       });
  //       return false;
  //     } else {
  //       console.log('user_sessions table accessible:', data);
  //       return true;
  //     }
  //   } catch (error) {
  //     console.error('Error testing user_sessions access:', error);
  //     return false;
  //   }
  // };

  // Function to register device session
  const registerDeviceSession = async (user) => {
    try {
      console.log('Registering device session for user:', user.email);
      
      const deviceId = localStorage.getItem('device_id') || uuidv4();
      localStorage.setItem('device_id', deviceId);
      console.log('Device ID:', deviceId);

      const sessionData = {
        user_id: user.id,
        device_id: deviceId,
        device_info: navigator.userAgent,
        is_active: true,
        last_activity: new Date().toISOString(),
      };

      console.log('Inserting session data:', sessionData);

      // Try to insert with a short timeout, but don't block if it fails
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 2 seconds')), 2000)
        );
        
        const upsertPromise = supabase.from('user_sessions').upsert([sessionData], {
          onConflict: ['user_id', 'device_id']
        });
        
        const { data, error } = await Promise.race([upsertPromise, timeoutPromise]);

        if (error) {
          console.warn('Device session registration failed (non-critical):', error.message);
        } else {
          console.log('Device session registered successfully:', data);
        }
      } catch (timeoutError) {
        console.warn('Device session registration timed out (non-critical):', timeoutError.message);
        // Continue execution - this is not critical for app functionality
      }
    } catch (error) {
      console.warn('Device session registration error (non-critical):', error.message);
      // Continue execution - this is not critical for app functionality
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        // Verify with Supabase first (most reliable)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          localStorage.removeItem('user');
          setUser(null);
        } else if (session?.user) {
          // User is authenticated, update local state
          const userData = {
            id: session.user.id,
            email: session.user.email,
            phone: session.user.user_metadata?.phone || '',
            purchasedGuides: [],
            accessHistory: []
          };
          
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Register device session for existing session
          await registerDeviceSession(userData);
        } else {
          // No active session, check localStorage as fallback
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              setUser(parsedUser);
              
              // Register device session for saved user
              await registerDeviceSession(parsedUser);
            } catch (parseError) {
              console.error('Error parsing saved user:', parseError);
              localStorage.removeItem('user');
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
            phone: session.user.user_metadata?.phone || '',
            purchasedGuides: [],
            accessHistory: []
          };
          
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Register device session after successful login
          await registerDeviceSession(userData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('user');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Register device session after manual login
    await registerDeviceSession(userData);
  };

  const logout = async () => {
    try {
      // Mark device session as inactive before logout
      if (user) {
        const deviceId = localStorage.getItem('device_id');
        if (deviceId) {
          await supabase.from('user_sessions')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('device_id', deviceId);
        }
      }
      
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem('user', JSON.stringify(updatedUserData));
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
