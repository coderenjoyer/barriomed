import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../backend/lib/AuthContext';

export interface LoginFormData {
    email: string;
    pin: string;
}

interface LoginFormProps {
    onLoginSuccess?: (role: string) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (pinOverride?: string) => {
        const pinToUse = pinOverride ?? pin;
        if (!email.trim() || pinToUse.length < 6) {
            setError('Please enter your email and 6-digit PIN');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        setError('');
        
        const result = await signIn({ email: email.trim(), password: pinToUse });
        
        setIsLoading(false);
        
        if (result.success) {
            onLoginSuccess?.((result.uiRole as string) ?? 'patient');
        } else {
            setError(result.error ?? 'Invalid email or PIN. Please try again.');
        }
    };

    const handlePinChange = (text: string) => {
        setPin(text);
        if (error) setError('');
        
        // Auto login when PIN reaches 6 characters
        if (text.length === 6) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email.trim() && emailRegex.test(email.trim())) {
                handleLogin(text);
            } else {
                setError('Please enter a valid email address before entering PIN');
            }
        }
    };

    const isFormValid = email.trim().length > 0 && pin.length >= 6;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Feather name="log-in" size={32} color="#0D9488" />
                </View>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Enter your details to log in</Text>
            </View>

            <View style={styles.inputSection}>
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={(t) => { setEmail(t); setError(''); }}
                        placeholder="juandelacruz@example.com"
                        placeholderTextColor="#D1D5DB"
                        style={styles.standardInput}
                        editable={!isLoading}
                    />
                </View>

                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>PIN</Text>
                    <TextInput
                        value={pin}
                        onChangeText={handlePinChange}
                        placeholder="••••••"
                        placeholderTextColor="#D1D5DB"
                        secureTextEntry
                        keyboardType="numeric"
                        maxLength={6}
                        style={styles.standardInput}
                        editable={!isLoading}
                    />
                </View>

                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : null}
            </View>

            <TouchableOpacity
                onPress={() => handleLogin()}
                disabled={isLoading || !isFormValid}
                style={[
                    styles.submitButton,
                    (isLoading || !isFormValid) ? styles.submitButtonDisabled : null,
                ]}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <View style={styles.buttonContent}>
                        <Text style={styles.submitButtonText}>Log In</Text>
                        <Feather name="arrow-right" size={20} color="#FFFFFF" />
                    </View>
                )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        padding: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 64,
        height: 64,
        backgroundColor: '#CCFBF1',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    inputSection: {
        marginBottom: 24,
    },
    inputWrapper: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    standardInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        height: 56,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginTop: 8,
        marginLeft: 4,
    },
    submitButton: {
        backgroundColor: '#0D9488',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 32,
    },
    submitButtonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
        color: '#9CA3AF',
    },
});
