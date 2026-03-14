import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginForm, LoginFormData } from './logininput';
import { OTPInput } from './otpinput';
import { PINSetup } from './pinsetup';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth, type UiRole } from '../lib/AuthContext';

export type UserRole = 'patient' | 'staff' | 'admin' | 'doctor';

interface LoginPageProps {
    onLoginComplete?: (role: UserRole) => void;
}

// Helper to render icons based on role
const getRoleIcon = (roleId: UserRole, color: string) => {
    switch (roleId) {
        case 'patient':
            return <Feather name="user" size={24} color={color} />;
        case 'doctor':
            return <FontAwesome5 name="stethoscope" size={24} color={color} />;
        case 'staff':
            return <Feather name="shield" size={24} color={color} />;
        case 'admin':
            return <MaterialCommunityIcons name="shield-check-outline" size={24} color={color} />;
        default:
            return <Feather name="user" size={24} color={color} />;
    }
};

const roles = [
    {
        id: 'patient' as UserRole,
        title: 'Patient / User',
        description: 'Access queue, records & medicine info',
        color: '#CCFBF1',
        textColor: '#0D9488',
        borderColor: '#99F6E4',
        activeColor: '#0D9488',
    },
    {
        id: 'doctor' as UserRole,
        title: 'Doctor',
        description: 'Patient consultations & e-prescriptions',
        color: '#D1FAE5',
        textColor: '#059669',
        borderColor: '#A7F3D0',
        activeColor: '#059669',
    },
    {
        id: 'staff' as UserRole,
        title: 'Health Staff',
        description: 'Manage queue & inventory',
        color: '#DBEAFE',
        textColor: '#2563EB',
        borderColor: '#BFDBFE',
        activeColor: '#2563EB',
    },
    {
        id: 'admin' as UserRole,
        title: 'System Administrator',
        description: 'Full system access & configuration',
        color: '#E9D5FF',
        textColor: '#9333EA',
        borderColor: '#D8B4FE',
        activeColor: '#9333EA',
    },
];

export function LoginPage({ onLoginComplete }: LoginPageProps) {
    const { session, userProfile, uiRole, signIn, signupNewUser, signOut } = useAuth();

    const [step, setStep] = useState<'role' | 'login' | 'otp' | 'pinLogin'>('role');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [existingUser, setExistingUser] = useState<boolean>(false);
    const [authError, setAuthError] = useState('');

    // Feature flag – set to true to re-enable phone verification (OTP step)
    const PHONE_VERIFICATION_ENABLED = false;
    // Store form data temporarily for the signup flow (role → form → OTP → done)
    const [pendingFormData, setPendingFormData] = useState<LoginFormData | null>(null);

    // If there's already an active Supabase session, jump to PIN login
    useEffect(() => {
        if (session && uiRole) {
            setSelectedRole(uiRole as UserRole);
            setExistingUser(true);
            setStep('pinLogin');
        }
    }, []);

    const handleRoleSelect = (role: UserRole) => {
        setSelectedRole(role);
        setAuthError('');
    };

    const handleRoleContinue = () => {
        if (selectedRole) {
            setStep('login');
        }
    };

    // -----------------------------------------------------------------------
    // Signup / Login form submission
    // -----------------------------------------------------------------------
    const handleLoginSubmit = async (data: LoginFormData) => {
        if (!selectedRole) return;
        setIsLoading(true);
        setAuthError('');

        try {
            // 1. Try to sign in first (existing account)
            const signInResult = await signIn({
                email: data.email,
                password: data.pin,
            });

            if (signInResult.success) {
                // Session + profile are loaded by AuthContext automatically.
                // We need to wait a tick for state to propagate, then notify parent.
                // The uiRole will be set by the AuthContext via onAuthStateChange.
                // For immediate routing, read from signInResult.
                setTimeout(() => {
                    if (onLoginComplete) {
                        // The context will have set uiRole by now
                        const role = uiRole ?? selectedRole;
                        onLoginComplete(role as UserRole);
                    }
                    setIsLoading(false);
                }, 300);
                return;
            }

            // 2. If sign-in failed with "Invalid login credentials", try signup
            if (signInResult.error && signInResult.error.includes('Invalid login credentials')) {
                const signupResult = await signupNewUser({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    mobileNumber: data.phone,
                    email: data.email,
                    password: data.pin,
                    role: selectedRole as UiRole,
                });

                if (signupResult.success) {
                    if (PHONE_VERIFICATION_ENABLED) {
                        setPendingFormData(data);
                        setPhoneNumber(data.phone);
                        setStep('otp');
                        setIsLoading(false);
                        return;
                    }
                    // Go straight to dashboard
                    setTimeout(() => {
                        if (onLoginComplete) {
                            onLoginComplete(selectedRole as UserRole);
                        }
                        setIsLoading(false);
                    }, 300);
                    return;
                } else {
                    setAuthError(signupResult.error || 'Signup failed. Please try again.');
                    setIsLoading(false);
                    return;
                }
            }

            // Any other sign-in error
            setAuthError(signInResult.error || 'Login failed. Please try again.');
        } catch (err: any) {
            console.error('Auth error:', err);
            setAuthError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // OTP verification (kept for future re-activation)
    // -----------------------------------------------------------------------
    const handleOTPVerify = async (otp: string) => {
        setIsLoading(true);
        setAuthError('');

        setTimeout(async () => {
            setIsLoading(false);
            if (onLoginComplete && uiRole) {
                onLoginComplete(uiRole as UserRole);
            }
        }, 1500);
    };

    // -----------------------------------------------------------------------
    // PIN login (returning user – re-authenticate with Supabase Auth)
    // -----------------------------------------------------------------------
    const handlePINLoginComplete = async (pin: string) => {
        setIsLoading(true);
        setAuthError('');

        try {
            // Use the email from the existing session's user
            const email = session?.user?.email;
            if (!email) {
                setAuthError('No saved session found. Please sign in with your full credentials.');
                setIsLoading(false);
                return;
            }

            const result = await signIn({ email, password: pin });

            if (result.success) {
                setTimeout(() => {
                    if (onLoginComplete) {
                        const role = uiRole ?? selectedRole;
                        onLoginComplete(role as UserRole);
                    }
                    setIsLoading(false);
                }, 300);
            } else {
                setAuthError(result.error || 'Invalid PIN. Please try again.');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('PIN login error:', err);
            setAuthError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Sign out / switch user
    // -----------------------------------------------------------------------
    const handleSignOut = async () => {
        await signOut();
        setExistingUser(false);
        setSelectedRole(null);
        setAuthError('');
        setStep('role');
    };

    const getStepIndex = () => {
        if (existingUser) return 0;
        const steps = PHONE_VERIFICATION_ENABLED ? ['role', 'login', 'otp'] : ['role', 'login'];
        return steps.indexOf(step);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Step Indicator */}
                {!existingUser && (
                    <View style={styles.stepIndicator}>
                        {(PHONE_VERIFICATION_ENABLED ? ['role', 'login', 'otp'] : ['role', 'login']).map((s, i) => {
                            const currentIndex = getStepIndex();
                            const isActive = i <= currentIndex;
                            return (
                                <View
                                    key={s}
                                    style={[
                                        styles.stepDot,
                                        isActive ? styles.stepDotActive : styles.stepDotInactive,
                                    ]}
                                />
                            );
                        })}
                    </View>
                )}

                {/* Main Card */}
                <View style={styles.card}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {step === 'role' && (
                            <View style={styles.roleStep}>
                                <View style={styles.roleHeader}>
                                    <Text style={styles.roleTitle}>Welcome</Text>
                                    <Text style={styles.roleSubtitle}>Select how you want to log in</Text>
                                </View>

                                <View style={styles.rolesContainer}>
                                    {roles.filter(r => Platform.OS === 'web' || r.id !== 'admin').map((role) => {
                                        const isSelected = selectedRole === role.id;
                                        return (
                                            <TouchableOpacity
                                                key={role.id}
                                                onPress={() => handleRoleSelect(role.id)}
                                                style={[
                                                    styles.roleCard,
                                                    isSelected ? {
                                                        borderColor: role.activeColor,
                                                        borderWidth: 2,
                                                        backgroundColor: '#FFFFFF',
                                                    } : null,
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        styles.roleIcon,
                                                        { backgroundColor: role.color },
                                                    ]}
                                                >
                                                    {getRoleIcon(role.id, role.textColor)}
                                                </View>
                                                <View style={styles.roleInfo}>
                                                    <Text style={styles.roleCardTitle}>{role.title}</Text>
                                                    <Text style={styles.roleCardDescription}>
                                                        {role.description}
                                                    </Text>
                                                </View>
                                                {isSelected && (
                                                    <View style={styles.checkmark}>
                                                        <Feather name="check" size={16} color="#FFFFFF" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {authError ? (
                                    <Text style={styles.authErrorText}>{authError}</Text>
                                ) : null}

                                <TouchableOpacity
                                    onPress={handleRoleContinue}
                                    disabled={!selectedRole}
                                    style={[
                                        styles.continueButton,
                                        !selectedRole ? styles.continueButtonDisabled : null,
                                    ]}
                                >
                                    <Text style={styles.continueButtonText}>Continue</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 'pinLogin' && (
                            <View style={styles.stepContainer}>
                                {/* User info card */}
                                {(userProfile || session?.user) && (
                                    <View style={styles.userInfoCard}>
                                        <View style={styles.userAvatar}>
                                            <Text style={styles.userAvatarText}>
                                                {(userProfile?.first_name?.[0] ?? session?.user?.email?.[0] ?? '?').toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.userInfoTextContainer}>
                                            {userProfile ? (
                                                <Text style={styles.userInfoName}>
                                                    {userProfile.first_name} {userProfile.last_name}
                                                </Text>
                                            ) : null}
                                            <Text style={styles.userInfoEmail}>
                                                {userProfile?.email ?? session?.user?.email ?? ''}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {authError ? (
                                    <Text style={styles.authErrorText}>{authError}</Text>
                                ) : null}

                                <PINSetup isLogin={true} onComplete={handlePINLoginComplete} />

                                {/* Switch account button */}
                                <TouchableOpacity
                                    onPress={handleSignOut}
                                    style={styles.switchAccountButton}
                                >
                                    <Feather name="users" size={16} color="#6B7280" />
                                    <Text style={styles.switchAccountText}>Use another account</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 'login' && (
                            <View style={styles.stepContainer}>
                                <TouchableOpacity
                                    onPress={() => { setStep('role'); setAuthError(''); }}
                                    style={styles.backButton}
                                >
                                    <Feather name="arrow-left" size={18} color="#0D9488" />
                                    <Text style={styles.backButtonText}>Switch Role</Text>
                                </TouchableOpacity>

                                {authError ? (
                                    <Text style={styles.authErrorText}>{authError}</Text>
                                ) : null}

                                <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
                            </View>
                        )}

                        {/* Phone verification UI – disabled via PHONE_VERIFICATION_ENABLED flag */}
                        {PHONE_VERIFICATION_ENABLED && step === 'otp' && (
                            <View>
                                {authError ? (
                                    <Text style={styles.authErrorText}>{authError}</Text>
                                ) : null}

                                <OTPInput
                                    phoneNumber={phoneNumber}
                                    onBack={() => { setStep('login'); setAuthError(''); }}
                                    onVerify={handleOTPVerify}
                                    isLoading={isLoading}
                                />
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Footer Help */}
                <TouchableOpacity style={styles.helpButton}>
                    <Text style={styles.helpText}>Need help logging in?</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F0FDFA',
    },
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 32,
    },
    stepDot: {
        height: 8,
        borderRadius: 4,
    },
    stepDotActive: {
        width: 32,
        backgroundColor: '#0D9488',
    },
    stepDotInactive: {
        width: 12,
        backgroundColor: '#E5E7EB',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 24,
        padding: 24,
        minHeight: 500,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
    },
    scrollContent: {
        flexGrow: 1,
    },
    roleStep: {
        flex: 1,
    },
    roleHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    roleTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    roleSubtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    rolesContainer: {
        gap: 12,
        marginBottom: 24,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
        gap: 16,
    },
    roleIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleInfo: {
        flex: 1,
    },
    roleCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    roleCardDescription: {
        fontSize: 14,
        color: '#6B7280',
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButton: {
        backgroundColor: '#0D9488',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonDisabled: {
        backgroundColor: '#E5E7EB',
        shadowOpacity: 0,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    stepContainer: {
        flex: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F0FDFA',
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    backButtonText: {
        fontSize: 15,
        color: '#0D9488',
        fontWeight: '600',
    },
    authErrorText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#FEF2F2',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
        overflow: 'hidden',
    },
    helpButton: {
        marginTop: 32,
        alignItems: 'center',
    },
    helpText: {
        fontSize: 14,
        color: '#0D9488',
        fontWeight: '500',
    },
    userInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDFA',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#CCFBF1',
        gap: 14,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    userInfoTextContainer: {
        flex: 1,
    },
    userInfoName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    userInfoEmail: {
        fontSize: 13,
        color: '#6B7280',
    },
    switchAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        marginTop: 16,
    },
    switchAccountText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
});
