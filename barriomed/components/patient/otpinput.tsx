import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface OTPInputProps {
    phoneNumber: string;
    onBack: () => void;
    onVerify: (otp: string) => void;
    isLoading?: boolean;
}

export function OTPInput({
    phoneNumber,
    onBack,
    onVerify,
    isLoading = false,
}: OTPInputProps) {
    const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
    const [timer, setTimer] = useState(30);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        // Focus first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }

        // Countdown timer
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleChange = (text: string, index: number) => {
        if (isNaN(Number(text))) return;

        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Focus next input
        if (text && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto submit if all filled
        if (newOtp.every((digit) => digit !== '') && index === 5) {
            onVerify(newOtp.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            } else {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        }
    };

    const formattedPhone = `+63 ${phoneNumber.slice(0, 3)} *** ${phoneNumber.slice(6)}`;

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.title}>Verify Number</Text>
                <Text style={styles.subtitle}>
                    Enter the 6-digit code sent to{'\n'}
                    <Text style={styles.phoneNumber}>{formattedPhone}</Text>
                </Text>
            </View>

            <View style={styles.otpContainer}>
                {otp.map((data, index) => (
                    <TextInput
                        key={index}
                        ref={(el: TextInput | null) => { inputRefs.current[index] = el }}
                        keyboardType="numeric"
                        maxLength={1}
                        value={data}
                        onChangeText={(text) => handleChange(text, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        style={[
                            styles.otpInput,
                            data ? styles.otpInputFilled : styles.otpInputEmpty,
                        ]}
                    />
                ))}
            </View>

            <TouchableOpacity
                onPress={() => onVerify(otp.join(''))}
                disabled={isLoading || otp.some((d) => !d)}
                style={[
                    styles.verifyButton,
                    (isLoading || otp.some((d) => !d)) && styles.verifyButtonDisabled,
                ]}
            >
                <Text style={styles.verifyButtonText}>
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
                {timer > 0 ? (
                    <Text style={styles.timerText}>
                        Resend code in <Text style={styles.timerHighlight}>{timer}s</Text>
                    </Text>
                ) : (
                    <TouchableOpacity
                        onPress={() => setTimer(30)}
                        style={styles.resendButton}
                    >
                        <Feather name="refresh-cw" size={16} color="#0D9488" />
                        <Text style={styles.resendText}>Resend Code</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        padding: 16,
    },
    backButton: {
        padding: 8,
        marginBottom: 24,
        alignSelf: 'flex-start',
    },
    header: {
        marginBottom: 32,
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
    phoneNumber: {
        fontWeight: '600',
        color: '#111827',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 8,
    },
    otpInput: {
        flex: 1,
        height: 56,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        borderRadius: 12,
        borderWidth: 2,
    },
    otpInputFilled: {
        borderColor: '#0D9488',
        backgroundColor: '#F0FDFA',
        color: '#0D9488',
    },
    otpInputEmpty: {
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        color: '#111827',
    },
    verifyButton: {
        backgroundColor: '#0D9488',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    verifyButtonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    resendContainer: {
        alignItems: 'center',
    },
    timerText: {
        fontSize: 14,
        color: '#6B7280',
    },
    timerHighlight: {
        fontWeight: '600',
        color: '#0D9488',
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resendText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0D9488',
    },
});
