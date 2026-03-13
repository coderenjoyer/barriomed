import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface LoginFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    pin: string;
}

interface LoginFormProps {
    onSubmit: (data: LoginFormData) => void;
    isLoading?: boolean;
}

export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const formatPhoneNumber = (input: string) => {
        const cleaned = input.replace(/\D/g, '');
        const truncated = cleaned.slice(0, 10);
        if (truncated.length > 6) {
            return `${truncated.slice(0, 3)} ${truncated.slice(3, 6)} ${truncated.slice(6)}`;
        } else if (truncated.length > 3) {
            return `${truncated.slice(0, 3)} ${truncated.slice(3)}`;
        }
        return truncated;
    };

    const handlePhoneChange = (text: string) => {
        const formatted = formatPhoneNumber(text);
        setPhone(formatted);
        if (error) setError('');
    };

    const handleSubmit = () => {
        const rawPhone = phone.replace(/\s/g, '');
        if (!firstName.trim()) {
            setError('Please enter your first name');
            return;
        }
        if (!lastName.trim()) {
            setError('Please enter your last name');
            return;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }
        if (rawPhone.length < 10) {
            setError('Please enter a valid mobile number');
            return;
        }
        if (pin.length < 4) {
            setError('Please enter a valid PIN');
            return;
        }
        onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: rawPhone, pin });
    };

    const isFormValid = firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0 && phone.replace(/\s/g, '').length === 10 && pin.length >= 4;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Feather name="log-in" size={32} color="#0D9488" />
                </View>
                <Text style={styles.title}>Welcome</Text>
                <Text style={styles.subtitle}>Enter your details to log in</Text>
            </View>

            <View style={styles.inputSection}>
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        value={firstName}
                        onChangeText={(t) => { setFirstName(t); setError(''); }}
                        placeholder="Juan"
                        placeholderTextColor="#D1D5DB"
                        style={styles.standardInput}
                    />
                </View>

                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                        value={lastName}
                        onChangeText={(t) => { setLastName(t); setError(''); }}
                        placeholder="Dela Cruz"
                        placeholderTextColor="#D1D5DB"
                        style={styles.standardInput}
                    />
                </View>

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
                    />
                </View>

                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <View style={styles.phoneInputContainer}>
                        <View style={styles.prefixContainer}>
                            <Text style={styles.prefixText}>+63</Text>
                        </View>
                        <TextInput
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={handlePhoneChange}
                            placeholder="912 345 6789"
                            placeholderTextColor="#D1D5DB"
                            style={styles.input}
                        />
                    </View>
                </View>

                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>PIN</Text>
                    <TextInput
                        value={pin}
                        onChangeText={(t) => { setPin(t); setError(''); }}
                        placeholder="••••"
                        placeholderTextColor="#D1D5DB"
                        secureTextEntry
                        keyboardType="numeric"
                        maxLength={4}
                        style={styles.standardInput}
                    />
                </View>

                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : null}
            </View>

            <TouchableOpacity
                onPress={handleSubmit}
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
    phoneInputContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        overflow: 'hidden',
        height: 56,
    },
    prefixContainer: {
        backgroundColor: '#F9FAFB',
        borderRightWidth: 1,
        borderRightColor: '#F3F4F6',
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    prefixText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
    },
    input: {
        flex: 1,
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
