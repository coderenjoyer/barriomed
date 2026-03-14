import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DbRole = 'patient' | 'doctor' | 'health_staff' | 'system_admin';
export type UiRole = 'patient' | 'doctor' | 'staff' | 'admin';

/** Maps UI role names to the database enum values. */
const UI_ROLE_TO_DB: Record<UiRole, DbRole> = {
    patient: 'patient',
    doctor: 'doctor',
    staff: 'health_staff',
    admin: 'system_admin',
};

/** Maps database role names back to UI role names. */
const DB_ROLE_TO_UI: Record<DbRole, UiRole> = {
    patient: 'patient',
    doctor: 'doctor',
    health_staff: 'staff',
    system_admin: 'admin',
};

export interface UserProfile {
    id: string;
    first_name: string;
    last_name: string;
    mobile_number: string;
    email: string;
    role: DbRole;
    created_at: string;
}

interface SignupParams {
    firstName: string;
    lastName: string;
    mobileNumber: string;
    email: string;
    password: string; // PIN used as password
    role: UiRole;
}

interface SignInParams {
    email: string;
    password: string;
}

interface AuthContextValue {
    session: Session | null;
    userProfile: UserProfile | null;
    uiRole: UiRole | null;
    isLoading: boolean;
    signupNewUser: (params: SignupParams) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    signIn: (params: SignInParams) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    signOut: () => Promise<{ success: boolean; error?: string }>;
    fetchUserProfile: (userId: string) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [uiRole, setUiRole] = useState<UiRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ----- fetch profile helper -----
    const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user profile:', error);
                return null;
            }
            return data as UserProfile | null;
        } catch (err) {
            console.error('Exception fetching user profile:', err);
            return null;
        }
    };

    // ----- load profile + update state -----
    const loadProfile = async (sess: Session | null) => {
        if (sess?.user) {
            const profile = await fetchUserProfile(sess.user.id);
            setUserProfile(profile);
            if (profile?.role) {
                setUiRole(DB_ROLE_TO_UI[profile.role] ?? null);
            } else {
                // Fallback: read role from Supabase Auth metadata
                const metaRole = sess.user.user_metadata?.role as string | undefined;
                if (metaRole && metaRole in DB_ROLE_TO_UI) {
                    setUiRole(DB_ROLE_TO_UI[metaRole as DbRole]);
                } else {
                    setUiRole(null);
                }
            }
        } else {
            setUserProfile(null);
            setUiRole(null);
        }
    };

    // ----- bootstrap: restore session on mount -----
    useEffect(() => {
        let isMounted = true;

        (async () => {
            const { data } = await supabase.auth.getSession();
            const sess = data.session ?? null;
            if (isMounted) {
                setSession(sess);
                await loadProfile(sess);
                setIsLoading(false);
            }
        })();

        // Listen for auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, sess) => {
            if (isMounted) {
                setSession(sess);
                await loadProfile(sess);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // ----- signup -----
    const signupNewUser: AuthContextValue['signupNewUser'] = async ({
        firstName,
        lastName,
        mobileNumber,
        email,
        password,
        role,
    }) => {
        const dbRole = UI_ROLE_TO_DB[role];

        // 1. Create the auth user via Supabase Auth (email + PIN-as-password)
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    mobile_number: mobileNumber,
                    role: dbRole,
                },
            },
        });

        if (error) {
            console.error('Signup auth error:', error);
            return { success: false, error: error.message };
        }

        // 2. Create the extended profile row in the users table
        const userId = data.user?.id;
        if (userId) {
            const { error: profileError } = await supabase.from('users').insert({
                id: userId,
                first_name: firstName,
                last_name: lastName,
                mobile_number: mobileNumber,
                email: email.toLowerCase(),
                role: dbRole,
                created_at: new Date().toISOString(),
            });

            if (profileError) {
                console.error('Profile insert error:', profileError);
                // Auth user was created but profile failed – still report error
                return { success: false, error: 'Account created but profile setup failed. Please contact support.' };
            }

            // Load the profile into state
            await loadProfile(data.session);
            if (data.session) setSession(data.session);
        }

        return { success: true, data };
    };

    // ----- sign in -----
    const signIn: AuthContextValue['signIn'] = async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('Sign-in error:', error);
            return { success: false, error: error.message };
        }

        // Check if user is deactivated (via metadata)
        if (data.session?.user?.user_metadata?.status === 'Inactive') {
            await supabase.auth.signOut();
            return {
                success: false,
                error: 'This account has been deactivated. Please contact an administrator.',
            };
        }

        setSession(data.session ?? null);
        await loadProfile(data.session);

        return { success: true, data };
    };

    // ----- sign out -----
    const signOut: AuthContextValue['signOut'] = async () => {
        // Clear state immediately
        setSession(null);
        setUserProfile(null);
        setUiRole(null);

        try {
            const { error } = await supabase.auth.signOut();
            if (error && !error.message.includes('session')) {
                console.error('Logout error:', error);
            }
            return { success: true };
        } catch (err: any) {
            console.error('Exception during logout:', err);
            return { success: true }; // local state already cleared
        }
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                userProfile,
                uiRole,
                isLoading,
                signupNewUser,
                signIn,
                signOut,
                fetchUserProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
};
