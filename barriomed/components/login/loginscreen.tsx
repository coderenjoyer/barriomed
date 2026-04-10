import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth, type UiRole } from '../../backend/lib/AuthContext';

export type UserRole = 'patient' | 'staff' | 'admin' | 'doctor';

interface LoginPageProps {
    onLoginComplete?: (role: UserRole) => void;
}

const roles = [
    {
        id: 'patient' as UserRole,
        title: 'Patient / User',
        description: 'Access queue, records & medicine info',
        icon: (color: string) => <Feather name="user" size={22} color={color} />,
        color: '#CCFBF1',
        textColor: '#0D9488',
        activeColor: '#0D9488',
    },
    {
        id: 'doctor' as UserRole,
        title: 'Doctor',
        description: 'Patient consultations & e-prescriptions',
        icon: (color: string) => <FontAwesome5 name="stethoscope" size={22} color={color} />,
        color: '#D1FAE5',
        textColor: '#059669',
        activeColor: '#059669',
    },
    {
        id: 'staff' as UserRole,
        title: 'Health Staff',
        description: 'Manage queue & inventory',
        icon: (color: string) => <Feather name="shield" size={22} color={color} />,
        color: '#DBEAFE',
        textColor: '#2563EB',
        activeColor: '#2563EB',
    },
    {
        id: 'admin' as UserRole,
        title: 'System Administrator',
        description: 'Full system access & configuration',
        icon: (color: string) => <MaterialCommunityIcons name="shield-check-outline" size={22} color={color} />,
        color: '#E9D5FF',
        textColor: '#9333EA',
        activeColor: '#9333EA',
    },
];

// ---------------------------------------------------------------------------
// Input field helper
// ---------------------------------------------------------------------------
function Field({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    maxLength,
    autoCapitalize,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: any;
    maxLength?: number;
    autoCapitalize?: any;
}) {
    return (
        <View style={fieldStyles.wrapper}>
            <Text style={fieldStyles.label}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#D1D5DB"
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                maxLength={maxLength}
                autoCapitalize={autoCapitalize ?? 'none'}
                style={fieldStyles.input}
            />
        </View>
    );
}

const fieldStyles = StyleSheet.create({
    wrapper: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#111827',
    },
});

// ---------------------------------------------------------------------------
// Main LoginPage
// ---------------------------------------------------------------------------
export function LoginPage({ onLoginComplete }: LoginPageProps) {
    const { session, userProfile, uiRole, signIn, signupNewUser, signOut } = useAuth();

    /* ── navigation state ── */
    type Screen = 'role' | 'auth' | 'pinLogin';
    const [screen, setScreen] = useState<Screen>('role');
    const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [existingUser, setExistingUser] = useState(false);

    /* ── form state ── */
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');

    /* ── ui state ── */
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // If there's already an active session, jump straight to PIN login
    useEffect(() => {
        if (session && uiRole) {
            setSelectedRole(uiRole as UserRole);
            setExistingUser(true);
            setScreen('pinLogin');
        }
    }, []);

    // ── helpers ──────────────────────────────────────────────────────────────

    const clearForm = () => {
        setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setPin(''); setError('');
    };

    const switchMode = (mode: 'signIn' | 'signUp') => {
        setAuthMode(mode);
        clearForm();
    };

    const formatPhone = (input: string) => {
        const cleaned = input.replace(/\D/g, '').slice(0, 11);
        if (cleaned.length > 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
        if (cleaned.length > 3) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
        return cleaned;
    };

    const getRoleLabel = (role: string): string => {
        switch (role) {
            case 'patient': return 'Patient / User';
            case 'doctor': return 'Doctor';
            case 'staff': return 'Health Staff';
            case 'admin': return 'System Administrator';
            default: return role;
        }
    };

    // ── submit handlers ──────────────────────────────────────────────────────

    const handleSignIn = async (pinOverride?: string) => {
        const pinToUse = pinOverride ?? pin;
        if (!email.trim() || pinToUse.length < 6) {
            setError('Please enter your email and 6-digit PIN.');
            return;
        }
        setIsLoading(true);
        setError('');
        const result = await signIn({ email: email.trim(), password: pinToUse });
        setIsLoading(false);

        if (!result.success) {
            setError(result.error ?? 'Sign-in failed. Check your credentials and try again.');
            return;
        }

        // ── Role-lock: DB is the source of truth ──────────────────────────
        const dbRole = result.uiRole;
        if (dbRole && selectedRole && dbRole !== selectedRole) {
            await signOut();
            setError(
                `This account is registered as "${getRoleLabel(dbRole)}". ` +
                `Please select the correct role and try again.`
            );
            return;
        }

        onLoginComplete?.((dbRole ?? selectedRole) as UserRole);
    };

    const handleSignUp = async () => {
        const rawPhone = phone.replace(/\s/g, '');
        if (!firstName.trim()) { setError('First name is required.'); return; }
        if (!lastName.trim()) { setError('Last name is required.'); return; }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return; }
        if (rawPhone.length < 11) { setError('Please enter a valid 11-digit mobile number.'); return; }
        if (pin.length < 6) { setError('PIN must be exactly 6 digits.'); return; }

        setIsLoading(true);
        setError('');

        const result = await signupNewUser({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            mobileNumber: rawPhone,
            email: email.trim(),
            password: pin,
            role: (selectedRole ?? 'patient') as UiRole,
        });

        setIsLoading(false);

        if (result.success) {
            onLoginComplete?.(selectedRole as UserRole);
        } else {
            setError(result.error ?? 'Sign-up failed. Please try again.');
        }
    };

    // ── PIN login (returning user) ────────────────────────────────────────────

    const [pinInput, setPinInput] = useState('');

    const handlePinDigit = (digit: number | 'del') => {
        setError('');
        if (digit === 'del') {
            setPinInput(p => p.slice(0, -1));
            return;
        }
        const next = pinInput + digit;
        setPinInput(next);
        if (next.length === 6) {
            submitPin(next);
        }
    };

    const submitPin = async (p: string) => {
        const emailAddr = session?.user?.email;
        if (!emailAddr) {
            setError('No saved session. Please sign in with your full credentials.');
            return;
        }
        setIsLoading(true);
        const result = await signIn({ email: emailAddr, password: p });
        setIsLoading(false);
        if (result.success) {
            // PIN login: role was locked at registration – use the DB value.
            const role = (result.uiRole ?? uiRole ?? selectedRole) as UserRole;
            onLoginComplete?.(role);
        } else {
            setPinInput('');
            setError('Incorrect PIN. Please try again.');
        }
    };

    const handleSignOut = async () => {
        await signOut();
        clearForm();
        setPinInput('');
        setExistingUser(false);
        setSelectedRole(null);
        setError('');
        setScreen('role');
    };

    // ── renders ──────────────────────────────────────────────────────────────

    const renderRoleStep = () => (
        <View>
            <View style={styles.sectionHeader}>
                <Text style={styles.mainTitle}>Welcome</Text>
                <Text style={styles.mainSubtitle}>Select your role to continue</Text>
            </View>

            <View style={styles.roleGrid}>
                {roles.filter(r => (Platform.OS === 'web' ? r.id !== 'patient' : r.id !== 'admin')).map(role => {
                    const active = selectedRole === role.id;
                    return (
                        <TouchableOpacity
                            key={role.id}
                            onPress={() => { setSelectedRole(role.id); setError(''); }}
                            activeOpacity={0.75}
                            style={[styles.roleCard, active && { borderColor: role.activeColor, backgroundColor: '#FAFFFE' }]}
                        >
                            <View style={[styles.roleIcon, { backgroundColor: role.color }]}>
                                {role.icon(role.textColor)}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.roleTitle}>{role.title}</Text>
                                <Text style={styles.roleDesc}>{role.description}</Text>
                            </View>
                            {active && (
                                <View style={[styles.checkBadge, { backgroundColor: role.activeColor }]}>
                                    <Feather name="check" size={12} color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
                onPress={() => { 
                    if (selectedRole) {
                        if (selectedRole === 'admin') setAuthMode('signIn');
                        setScreen('auth'); 
                    } else setError('Please select a role.'); 
                }}
                activeOpacity={0.85}
                style={[styles.primaryBtn, !selectedRole && styles.primaryBtnDisabled]}
            >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const renderAuthStep = () => (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Back */}
            <TouchableOpacity onPress={() => { setScreen('role'); clearForm(); }} style={styles.backBtn}>
                <Feather name="arrow-left" size={16} color="#0D9488" />
                <Text style={styles.backBtnText}>Switch Role</Text>
            </TouchableOpacity>

            {/* Sign In / Sign Up Toggle */}
            {selectedRole !== 'admin' ? (
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        onPress={() => switchMode('signIn')}
                        style={[styles.toggleBtn, authMode === 'signIn' && styles.toggleBtnActive]}
                    >
                        <Text style={[styles.toggleBtnText, authMode === 'signIn' && styles.toggleBtnTextActive]}>Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => switchMode('signUp')}
                        style={[styles.toggleBtn, authMode === 'signUp' && styles.toggleBtnActive]}
                    >
                        <Text style={[styles.toggleBtnText, authMode === 'signUp' && styles.toggleBtnTextActive]}>Create Account</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' }}>
                        System Administrator
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
                        Sign in to your admin account
                    </Text>
                </View>
            )}

            {/* Fields */}
            {authMode === 'signUp' && (
                <>
                    <View style={styles.nameRow}>
                        <View style={{ flex: 1 }}>
                            <Field label="First Name" value={firstName} onChangeText={setFirstName} placeholder="Juan" autoCapitalize="words" />
                        </View>
                        <View style={{ width: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Field label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Dela Cruz" autoCapitalize="words" />
                        </View>
                    </View>
                    <Field
                        label="Mobile Number"
                        value={phone}
                        onChangeText={v => setPhone(formatPhone(v))}
                        placeholder="09XX XXX XXXX"
                        keyboardType="phone-pad"
                    />
                </>
            )}

            <Field
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="juandelacruz@example.com"
                keyboardType="email-address"
            />
            <Field
                label={authMode === 'signIn' ? 'PIN (6 digits)' : 'Create 6-digit PIN'}
                value={pin}
                onChangeText={(val) => {
                    setPin(val);
                    setError('');
                    if (authMode === 'signIn' && val.length === 6) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (email.trim() && emailRegex.test(email.trim())) {
                            handleSignIn(val);
                        } else {
                            setError('Please enter a valid email address before entering PIN.');
                        }
                    }
                }}
                placeholder="••••••"
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
                onPress={() => authMode === 'signIn' ? handleSignIn() : handleSignUp()}
                disabled={isLoading}
                activeOpacity={0.85}
                style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            >
                {isLoading
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Text style={styles.primaryBtnText}>{authMode === 'signIn' ? 'Sign In' : 'Create Account'}</Text>
                        <Feather name="arrow-right" size={18} color="#fff" />
                    </>
                }
            </TouchableOpacity>

            <Text style={styles.disclaimer}>By continuing, you agree to our Terms of Service and Privacy Policy.</Text>
        </KeyboardAvoidingView>
    );

    const renderPinLogin = () => {
        const dots = Array.from({ length: 6 });
        return (
            <View>
                {/* User card */}
                {(userProfile || session?.user) && (
                    <View style={styles.userCard}>
                        <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                                {(userProfile?.first_name?.[0] ?? session?.user?.email?.[0] ?? '?').toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            {userProfile && (
                                <Text style={styles.userName}>{userProfile.first_name} {userProfile.last_name}</Text>
                            )}
                            <Text style={styles.userEmail}>{userProfile?.email ?? session?.user?.email ?? ''}</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.pinHeading}>Enter your PIN</Text>
                <Text style={styles.pinSub}>Enter your 6-digit PIN to access your account</Text>

                {/* Dots */}
                <View style={styles.pinDots}>
                    {dots.map((_, i) => (
                        <View key={i} style={[styles.dot, pinInput.length > i && styles.dotFilled, error ? styles.dotError : null]} />
                    ))}
                </View>

                {error ? <Text style={[styles.errorText, { textAlign: 'center' }]}>{error}</Text> : null}
                {isLoading && <ActivityIndicator color="#0D9488" style={{ marginVertical: 8 }} />}

                {/* Numpad */}
                <View style={styles.numPad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <TouchableOpacity key={n} onPress={() => handlePinDigit(n)} style={styles.numBtn}>
                            <Text style={styles.numText}>{n}</Text>
                        </TouchableOpacity>
                    ))}
                    <View style={styles.numBtn} />
                    <TouchableOpacity onPress={() => handlePinDigit(0)} style={styles.numBtn}>
                        <Text style={styles.numText}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handlePinDigit('del')} style={styles.numBtn}>
                        <Feather name="delete" size={22} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handleSignOut} style={styles.switchBtn}>
                    <Feather name="users" size={15} color="#6B7280" />
                    <Text style={styles.switchBtnText}>Use another account</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo / Brand */}
                <View style={styles.brand}>
                    <View style={styles.brandIcon}>
                        <FontAwesome5 name="heartbeat" size={28} color="#0D9488" />
                    </View>
                    <Text style={styles.brandName}>BarrioMed</Text>
                </View>

                {/* Step indicator */}
                {!existingUser && screen !== 'pinLogin' && (
                    <View style={styles.stepRow}>
                        {['role', 'auth'].map((s, i) => (
                            <View key={s} style={[styles.stepDot, screen === s || (i === 1 && screen === 'auth') ? styles.stepDotActive : styles.stepDotInactive]} />
                        ))}
                    </View>
                )}

                {/* Card */}
                <View style={styles.card}>
                    {screen === 'role' && renderRoleStep()}
                    {screen === 'auth' && renderAuthStep()}
                    {screen === 'pinLogin' && renderPinLogin()}
                </View>

                <TouchableOpacity style={styles.helpBtn}>
                    <Text style={styles.helpText}>Need help? Contact support</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F0FDFA' },
    scroll: { padding: 20, paddingBottom: 48, justifyContent: 'center', flexGrow: 1 },

    brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 },
    brandIcon: { width: 52, height: 52, backgroundColor: '#CCFBF1', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    brandName: { fontSize: 26, fontWeight: '800', color: '#0D9488', letterSpacing: -0.5 },

    stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
    stepDot: { height: 6, borderRadius: 3 },
    stepDotActive: { width: 28, backgroundColor: '#0D9488' },
    stepDotInactive: { width: 10, backgroundColor: '#D1D5DB' },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
    },

    /* Role step */
    sectionHeader: { marginBottom: 20 },
    mainTitle: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3, marginBottom: 2 },
    mainSubtitle: { fontSize: 14, color: '#9CA3AF' },

    roleGrid: { gap: 10, marginBottom: 20 },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    roleIcon: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    roleTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 1 },
    roleDesc: { fontSize: 12, color: '#9CA3AF' },
    checkBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

    /* Auth step */
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F0FDFA', borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#CCFBF1' },
    backBtnText: { fontSize: 14, fontWeight: '600', color: '#0D9488' },

    toggleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    toggleBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    toggleBtnTextActive: { color: '#0D9488' },

    nameRow: { flexDirection: 'row' },

    /* PIN Login */
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#CCFBF1', gap: 12 },
    userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0D9488', alignItems: 'center', justifyContent: 'center' },
    userAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    userName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 1 },
    userEmail: { fontSize: 12, color: '#6B7280' },

    pinHeading: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
    pinSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },

    pinDots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 20 },
    dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: 'transparent' },
    dotFilled: { backgroundColor: '#0D9488', transform: [{ scale: 1.2 }] },
    dotError: { borderColor: '#EF4444', backgroundColor: '#FEE2E2' },

    numPad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 260, alignSelf: 'center', gap: 12, marginBottom: 16 },
    numBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
    numText: { fontSize: 22, fontWeight: '600', color: '#374151' },

    switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    switchBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

    /* Shared */
    primaryBtn: {
        backgroundColor: '#0D9488',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        borderRadius: 14,
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
        marginTop: 4,
    },
    primaryBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
    primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

    errorText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '500',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 14,
        overflow: 'hidden',
    },

    disclaimer: { textAlign: 'center', fontSize: 11, color: '#D1D5DB', marginTop: 16 },
    helpBtn: { alignItems: 'center', marginTop: 24 },
    helpText: { fontSize: 13, color: '#0D9488', fontWeight: '500' },
});
