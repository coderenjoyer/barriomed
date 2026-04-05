import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ServiceType } from './selectservice';
import { QueueStatus } from '../../../lib/queueService';

interface QueueTicketProps {
    serviceType: ServiceType;
    queueNumber: number;
    nowServing: number;
    peopleAhead: number;
    estWaitTime: string;
    status: QueueStatus | string;
    onCancel: () => void;
}

export function QueueTicket({
    serviceType,
    queueNumber,
    nowServing,
    peopleAhead,
    estWaitTime,
    status,
    onCancel,
}: QueueTicketProps) {
    const [showCancelModal, setShowCancelModal] = useState(false);
    const isServing = status === 'Serving';

    // Pulse animation for "Your Turn!" banner
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!isServing) {
            pulseAnim.setValue(1);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isServing]);

    const getServiceLabel = (type: ServiceType) => {
        switch (type) {
            case 'checkup': return 'General Check-up';
            case 'prenatal': return 'Prenatal Care';
            case 'immunization': return 'Immunization';
            case 'dental': return 'Dental Services';
            default: return 'Unknown Service';
        }
    };

    const getServiceStyles = (type: ServiceType) => {
        switch (type) {
            case 'checkup': return {
                bg: '#F0FDFA', text: '#0D9488', border: '#CCFBF1'
            };
            case 'prenatal': return {
                bg: '#FDF2F8', text: '#DB2777', border: '#FCE7F3'
            };
            case 'immunization': return {
                bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7'
            };
            case 'dental': return {
                bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE'
            };
            default: return {
                bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB'
            };
        }
    };

    const serviceStyles = getServiceStyles(serviceType);

    return (
        <View style={styles.container}>
            {/* Ticket Card */}
            <View style={styles.card}>
                {/* Top Section (Tear-off part) */}
                <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: serviceStyles.bg, borderColor: serviceStyles.border }]}>
                        <Text style={[styles.badgeText, { color: serviceStyles.text }]}>
                            {getServiceLabel(serviceType)}
                        </Text>
                    </View>

                    <View style={styles.numberContainer}>
                        <Text style={styles.numberLabel}>Your Number</Text>
                        <Text style={styles.queueNumber}>#{queueNumber}</Text>
                        <View style={styles.locationContainer}>
                            <Feather name="map-pin" size={12} color="#9CA3AF" />
                            <Text style={styles.locationText}>Barangay Health Center - Window 2</Text>
                        </View>
                    </View>
                </View>

                {/* Dotted Divider */}
                <View style={styles.dividerContainer}>
                    <View style={styles.dottedLine} />
                    <View style={[styles.circleCutout, styles.circleLeft]} />
                    <View style={[styles.circleCutout, styles.circleRight]} />
                </View>

                {/* Bottom Info Grid */}
                <View style={styles.cardContent}>
                    {isServing ? (
                        /* ── YOUR TURN BANNER ───────────────────────────────── */
                        <Animated.View style={[styles.yourTurnBanner, { transform: [{ scale: pulseAnim }] }]}>
                            <View style={styles.yourTurnIconRow}>
                                <Feather name="bell" size={28} color="#92400E" />
                            </View>
                            <Text style={styles.yourTurnHeading}>It's Your Turn!</Text>
                            <Text style={styles.yourTurnSub}>Please proceed to the window now.</Text>
                            <View style={styles.yourTurnNumRow}>
                                <Text style={styles.yourTurnNumLabel}>NOW SERVING</Text>
                                <Text style={styles.yourTurnNum}>#{queueNumber}</Text>
                            </View>
                        </Animated.View>
                    ) : (
                        /* ── NORMAL WAITING VIEW ────────────────────────────── */
                        <>
                            <View style={styles.statsGrid}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Now Serving</Text>
                                    <View style={styles.statValueContainer}>
                                        <Text style={styles.statValue}>#{nowServing}</Text>
                                        <View style={styles.liveIndicator}>
                                            <View style={styles.liveDot} />
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>People Ahead</Text>
                                    <View style={styles.statValueContainer}>
                                        <Feather name="users" size={16} color="#0D9488" />
                                        <Text style={styles.statValue}>{peopleAhead}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.waittimeBox}>
                                <Feather name="clock" size={16} color="#0D9488" />
                                <Text style={styles.waittimeText}>Est. Wait: {estWaitTime}</Text>
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        onPress={() => setShowCancelModal(true)}
                        style={styles.cancelButton}
                    >
                        <Text style={styles.cancelButtonText}>Hindi na ako tutuloy (Cancel Queue)</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Cancel Confirmation Modal */}
            <Modal
                transparent
                visible={showCancelModal}
                animationType="fade"
                onRequestClose={() => setShowCancelModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.alertIconContainer}>
                            <Feather name="alert-circle" size={32} color="#EF4444" />
                        </View>
                        <Text style={styles.modalTitle}>Cancel your queue?</Text>
                        <Text style={styles.modalMessage}>
                            This will free up your spot for others. You'll need to get a new number if you change your mind.
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setShowCancelModal(false)}
                                style={styles.keepButton}
                            >
                                <Text style={styles.keepButtonText}>Keep My Spot</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowCancelModal(false);
                                    onCancel();
                                }}
                                style={styles.confirmCancelButton}
                            >
                                <Text style={styles.confirmCancelButtonText}>Yes, Cancel Queue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
    },
    cardHeader: {
        padding: 24,
        alignItems: 'center',
        paddingBottom: 32,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    numberContainer: {
        alignItems: 'center',
    },
    numberLabel: {
        fontSize: 14,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: '500',
    },
    queueNumber: {
        fontSize: 64,
        fontWeight: 'bold',
        color: '#0D9488',
        marginVertical: 4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    dividerContainer: {
        height: 16,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    dottedLine: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
    },
    circleCutout: {
        position: 'absolute',
        top: -12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F0FDFA', // Parent bg color approximation
    },
    circleLeft: {
        left: -12,
    },
    circleRight: {
        right: -12,
    },
    cardContent: {
        padding: 24,
        backgroundColor: '#F9FAFB',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 4,
    },
    statValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    liveIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E',
        opacity: 0.6,
        position: 'absolute',
        // In RN, simple animations are tedious without reanimated, static is fine for now
    },
    waittimeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F0FDFA',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CCFBF1',
        marginBottom: 24,
    },
    waittimeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    // ── Your Turn Banner ────────────────────────────────────────
    yourTurnBanner: {
        backgroundColor: '#FFFBEB',
        borderWidth: 2,
        borderColor: '#F59E0B',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    yourTurnIconRow: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#FDE68A',
    },
    yourTurnHeading: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#92400E',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    yourTurnSub: {
        fontSize: 13,
        color: '#B45309',
        marginBottom: 16,
        textAlign: 'center',
    },
    yourTurnNumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 999,
    },
    yourTurnNumLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 1,
    },
    yourTurnNum: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '500',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    alertIconContainer: {
        width: 48,
        height: 48,
        backgroundColor: '#FEF2F2',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    modalMessage: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButtons: {
        width: '100%',
        gap: 12,
    },
    keepButton: {
        backgroundColor: '#0D9488',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    keepButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    confirmCancelButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmCancelButtonText: {
        color: '#EF4444',
        fontWeight: '600',
        fontSize: 16,
    },
});

