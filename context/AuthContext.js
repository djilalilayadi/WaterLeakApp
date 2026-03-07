import React, { createContext, useState, useContext, useEffect } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for active session on mount
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    // Fetch role from public.users
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();

                    if (profile) {
                        setUser(session.user);
                        setUserRole(profile.role);
                        setUserId(session.user.id);
                    }
                }
            } catch (error) {
                console.error('Error checking session:', error);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setUserRole(null);
                setUserId(null);
            } else if (session?.user) {
                // Roles are usually set during login/signup, 
                // but checking here ensures state consistency
                if (!userRole) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    if (profile) {
                        setUserRole(profile.role);
                    }
                }
                setUser(session.user);
                setUserId(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = (userData, role) => {
        setUser(userData);
        setUserRole(role);
        setUserId(userData.id);
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setUserRole(null);
            setUserId(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userRole, userId, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
