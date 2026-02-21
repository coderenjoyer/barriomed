import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhoneInput } from '../components/patient/logininput';
import { OTPInput } from '../components/patient/otpinput';
import { PINSetup } from '../components/patient/pinsetup';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

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
    const [step, setStep] = useState<'role' | 'phone' | 'otp' | 'pin'>('role');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkSavedRole = async () => {
            try {
                const savedRole = await AsyncStorage.getItem('userRole');
                if (savedRole && roles.some(r => r.id === savedRole)) {
                    setSelectedRole(savedRole as UserRole);
                    setStep('phone');
                }
            } catch (error) {
                console.error('Error loading saved role:', error);
            }
        };
        checkSavedRole();
    }, []);

    const handleRoleSelect = (role: UserRole) => {
        setSelectedRole(role);
    };

    const handleRoleContinue = () => {
        if (selectedRole) {
            setStep('phone');
        }
    };

    const handlePhoneSubmit = (phone: string) => {
        setIsLoading(true);
        setPhoneNumber(phone);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setStep('otp');
        }, 1500);
    };

    const handleOTPVerify = (otp: string) => {
        setIsLoading(true);
        // Simulate API verification
        setTimeout(() => {
            setIsLoading(false);
            setStep('pin');
        }, 1500);
    };

    const handlePINComplete = async (pin: string) => {
        // Complete login and redirect based on role
        if (onLoginComplete && selectedRole) {
            try {
                await AsyncStorage.setItem('userRole', selectedRole);
            } catch (error) {
                console.error('Error saving role:', error);
            }
            onLoginComplete(selectedRole);
        }
    };

    const getStepIndex = () => {
        const steps = ['role', 'phone', 'otp', 'pin'];
        return steps.indexOf(step);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Step Indicator */}
                <View style={styles.stepIndicator}>
                    {['role', 'phone', 'otp', 'pin'].map((s, i) => {
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
                                    {roles.map((role) => {
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

                        {step === 'phone' && (
                            <View style={styles.stepContainer}>
                                <TouchableOpacity
                                    onPress={() => setStep('role')}
                                    style={styles.backButton}
                                >
                                    <Feather name="arrow-left" size={18} color="#0D9488" />
                                    <Text style={styles.backButtonText}>Switch Role</Text>
                                </TouchableOpacity>
                                <PhoneInput onSubmit={handlePhoneSubmit} isLoading={isLoading} />
                            </View>
                        )}

                        {step === 'otp' && (
                            <OTPInput
                                phoneNumber={phoneNumber}
                                onBack={() => setStep('phone')}
                                onVerify={handleOTPVerify}
                                isLoading={isLoading}
                            />
                        )}

                        {step === 'pin' && <PINSetup onComplete={handlePINComplete} />}
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
    helpButton: {
        marginTop: 32,
        alignItems: 'center',
    },
    helpText: {
        fontSize: 14,
        color: '#0D9488',
        fontWeight: '500',
    },
});
