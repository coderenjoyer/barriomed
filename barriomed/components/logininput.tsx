import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface PhoneInputProps {
    onSubmit: (phone: string) => void;
    isLoading?: boolean;
}

export function PhoneInput({ onSubmit, isLoading = false }: PhoneInputProps) {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');

    const formatPhoneNumber = (input: string) => {
        // Remove non-digits
        const cleaned = input.replace(/\D/g, '');
        // Limit to 10 digits (since +63 is fixed)
        const truncated = cleaned.slice(0, 10);
        // Format as 9XX XXX XXXX
        if (truncated.length > 6) {
            return `${truncated.slice(0, 3)} ${truncated.slice(3, 6)} ${truncated.slice(6)}`;
        } else if (truncated.length > 3) {
            return `${truncated.slice(0, 3)} ${truncated.slice(3)}`;
        }
        return truncated;
    };

    const handleChange = (text: string) => {
        const formatted = formatPhoneNumber(text);
        setValue(formatted);
        if (error) setError('');
    };

    const handleSubmit = () => {
        const rawValue = value.replace(/\s/g, '');
        if (rawValue.length < 10) {
            setError('Please enter a valid mobile number');
            return;
        }
        onSubmit(rawValue);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Feather name="phone" size={32} color="#0D9488" />
                </View>
                <Text style={styles.title}>Welcome to B-Health</Text>
                <Text style={styles.subtitle}>Enter your mobile number for quick access</Text>
            </View>

            <View style={styles.inputSection}>
                <View style={styles.inputContainer}>
                    <View style={styles.prefixContainer}>
                        <Text style={styles.prefixText}>+63</Text>
                    </View>
                    <TextInput
                        keyboardType="phone-pad"
                        value={value}
                        onChangeText={handleChange}
                        placeholder="912 345 6789"
                        placeholderTextColor="#D1D5DB"
                        style={styles.input}
                        autoFocus
                    />
                </View>
                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : null}
            </View>

            <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading || value.length < 3}
                style={[
                    styles.submitButton,
                    (isLoading || value.length < 3) ? styles.submitButtonDisabled : null,
                ]}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <View style={styles.buttonContent}>
                        <Text style={styles.submitButtonText}>Send OTP Code</Text>
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
    inputContainer: {
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
        fontSize: 18,
        fontWeight: '500',
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
