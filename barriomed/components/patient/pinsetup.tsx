import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface PINSetupProps {
    onComplete: (pin: string) => void;
}

export function PINSetup({ onComplete }: PINSetupProps) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState<'create' | 'confirm'>('create');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleNumberClick = (num: number) => {
        if (error) setError('');

        const currentVal = step === 'create' ? pin : confirmPin;
        if (currentVal.length < 4) {
            const newVal = currentVal + num;
            if (step === 'create') {
                setPin(newVal);
                if (newVal.length === 4) {
                    setTimeout(() => setStep('confirm'), 300);
                }
            } else {
                setConfirmPin(newVal);
                if (newVal.length === 4) {
                    validatePin(newVal);
                }
            }
        }
    };

    const handleDelete = () => {
        if (error) setError('');
        if (step === 'create') {
            setPin((prev) => prev.slice(0, -1));
        } else {
            setConfirmPin((prev) => prev.slice(0, -1));
        }
    };

    const validatePin = (finalConfirmPin: string) => {
        if (pin === finalConfirmPin) {
            setIsSuccess(true);
            setTimeout(() => onComplete(pin), 1500);
        } else {
            setError('PINs do not match. Try again.');
            setTimeout(() => {
                setConfirmPin('');
                setError('');
            }, 1000);
        }
    };

    const activePin = step === 'create' ? pin : confirmPin;

    if (isSuccess) {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                    <Feather name="check" size={48} color="#059669" />
                </View>
                <Text style={styles.successTitle}>All Set!</Text>
                <Text style={styles.successText}>
                    Your offline PIN has been created.{'\n'}
                    You can now access your records anytime.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.lockIcon}>
                    <Feather name="lock" size={24} color="#0D9488" />
                </View>
                <Text style={styles.title}>
                    {step === 'create' ? 'Set Offline PIN' : 'Confirm PIN'}
                </Text>
                <Text style={styles.subtitle}>
                    {step === 'create'
                        ? 'Create a 4-digit PIN to access your records without internet connection.'
                        : 'Re-enter your PIN to confirm.'}
                </Text>
            </View>

            {/* PIN Dots */}
            <View style={styles.dotsContainer}>
                {[0, 1, 2, 3].map((i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            activePin.length > i ? styles.dotFilled : null,
                            error ? styles.dotError : null,
                        ]}
                    />
                ))}
            </View>

            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Number Pad */}
            <View style={styles.numPad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <TouchableOpacity
                        key={num}
                        onPress={() => handleNumberClick(num)}
                        style={styles.numButton}
                    >
                        <Text style={styles.numText}>{num}</Text>
                    </TouchableOpacity>
                ))}
                <View style={styles.numButton} />
                <TouchableOpacity
                    onPress={() => handleNumberClick(0)}
                    style={styles.numButton}
                >
                    <Text style={styles.numText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.numButton}>
                    <Feather name="delete" size={24} color="#6B7280" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        flex: 1,
        padding: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    lockIcon: {
        width: 48,
        height: 48,
        backgroundColor: '#CCFBF1',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 32,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: '#0D9488',
        transform: [{ scale: 1.2 }],
    },
    dotError: {
        borderColor: '#EF4444',
    },
    errorText: {
        color: '#EF4444',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 16,
    },
    numPad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 280,
        alignSelf: 'center',
        marginTop: 'auto',
        gap: 16,
    },
    numButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#374151',
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
    },
    successIcon: {
        width: 96,
        height: 96,
        backgroundColor: '#D1FAE5',
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    successText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
});
