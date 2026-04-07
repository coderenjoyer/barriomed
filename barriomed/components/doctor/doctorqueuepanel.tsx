import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    LayoutAnimation,
    UIManager,
    Platform,
    ActivityIndicator,
    Alert,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PatientQueueItem, Patient } from '../staff/patientqueuecall';
import { queueService } from '../../lib/queueService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { ServiceType } from '../patient/patient/selectservice';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Shared Presence Channel Name ───────────────────────────────────────────
//  MUST be the same string used in quequecaller.tsx so doctors and staff share
//  a single controller lock.
const PRESENCE_CHANNEL = 'queue_controller_presence';

export function DoctorQueuePanel() {
    const { userProfile, session } = useAuth();

    // Identity
    const myDoctorId = userProfile?.id ?? session?.user?.id ?? 'unknown';
    const myFirstName = userProfile?.first_name ?? session?.user?.user_metadata?.first_name ?? '';
    const myLastName = userProfile?.last_name ?? session?.user?.user_metadata?.last_name ?? '';
    const myDoctorName = [myFirstName, myLastName].filter(Boolean).join(' ') || 'Doctor';

    // Controller Presence
    const [activeController, setActiveController] = useState<{ id: string; name: string } | null>(null);
    const [presenceChannel, setPresenceChannel] = useState<any>(null);

    // Queue Data
    const [patients, setPatients] = useState<Patient[]>([]);
    const [missedPatients, setMissedPatients] = useState<Patient[]>([]);
    const [showMissed, setShowMissed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const currentPatient = patients.find((p) => p.status === 'serving');
    const waitingPatients = patients.filter((p) => p.status === 'pending' || p.status === 'arrived');
    const nextPatient = waitingPatients.length > 0 ? waitingPatients[0] : null;
    const isController = activeController?.id === myDoctorId;

    // ── Fetch Queue ──────────────────────────────────────────────────────────
    const fetchQueue = useCallback(async () => {
        try {
            const data = await queueService.getQueueList();
            const mapped: Patient[] = data.map((item: any) => ({
                id: item.id,
                queueNumber: item.queue_number,
                name: item.patient_name || 'Unknown',
                service: item.service_type as ServiceType,
                status: mapDbStatusToUi(item.status),
                arrivalTime: new Date(item.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            }));
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setPatients(mapped.filter((p) => p.status !== 'missed'));
            setMissedPatients(mapped.filter((p) => p.status === 'missed'));
        } catch (err) {
            console.error('[DoctorQueuePanel] fetchQueue error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const mapDbStatusToUi = (status: string): Patient['status'] => {
        switch (status) {
            case 'Serving': return 'serving';
            case 'Waiting': return 'pending';
            case 'No Show': return 'missed';
            case 'Completed': return 'completed';
            default: return 'pending';
        }
    };

    // ── Lifecycle ────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchQueue();

        // Subscribe to real-time queue changes
        const unsubscribeQueue = queueService.subscribeToStaffQueue(() => fetchQueue());

        // ── Shared Presence Channel for Controller Lock ──────────────────────
        const channel = supabase.channel(PRESENCE_CHANNEL, {
            config: { presence: { key: myDoctorId } },
        });

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            let allUsers: any[] = [];
            for (const id in state) {
                allUsers = [...allUsers, ...state[id]];
            }
            const controllers = allUsers.filter((u) => u.requestedLockAt !== null);
            if (controllers.length > 0) {
                controllers.sort((a, b) => a.requestedLockAt - b.requestedLockAt);
                setActiveController({ id: controllers[0].id, name: controllers[0].name });
            } else {
                setActiveController(null);
            }
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    id: myDoctorId,
                    name: `Dr. ${myDoctorName}`,
                    requestedLockAt: null,
                });
            }
        });

        setPresenceChannel(channel);

        return () => {
            unsubscribeQueue();
            channel.unsubscribe();
        };
    }, [fetchQueue, myDoctorId, myDoctorName]);

    // ── Controller Actions ───────────────────────────────────────────────────
    const requestControl = async () => {
        if (presenceChannel) {
            await presenceChannel.track({
                id: myDoctorId,
                name: `Dr. ${myDoctorName}`,
                requestedLockAt: Date.now(),
            });
        }
    };

    const releaseControl = async () => {
        if (presenceChannel) {
            await presenceChannel.track({
                id: myDoctorId,
                name: `Dr. ${myDoctorName}`,
                requestedLockAt: null,
            });
        }
    };

    // ── Queue Actions (mirrored from QueueCommander) ─────────────────────────
    const handleCallNext = async () => {
        if (waitingPatients.length === 0) {
            Alert.alert('Empty Queue', 'No patients in waiting list.');
            return;
        }
        if (currentPatient) {
            Alert.alert(
                'Patient Still Being Served',
                `#${currentPatient.queueNumber} (${currentPatient.name}) is still being served. Mark as complete and call next?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Complete & Call Next', onPress: () => doCallNext() },
                ]
            );
            return;
        }
        await doCallNext();
    };

    const doCallNext = async () => {
        setIsActionLoading(true);
        try {
            const serviceToCall = waitingPatients[0]?.service;
            await queueService.callNext(serviceToCall);
            await fetchQueue();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to call next patient');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCompleted = async () => {
        if (!currentPatient) return;
        setIsActionLoading(true);
        try {
            await queueService.completePatient(currentPatient.id);
            await fetchQueue();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to mark as completed');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleNoShow = async () => {
        if (!currentPatient) return;
        setIsActionLoading(true);
        try {
            await queueService.markNoShow(currentPatient.id);
            await fetchQueue();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to mark No Show');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCompleteAndCallNext = async () => {
        if (!currentPatient) return;
        if (waitingPatients.length === 0) {
            await handleCompleted();
            return;
        }
        setIsActionLoading(true);
        try {
            const serviceToCall = waitingPatients[0].service;
            await queueService.callNext(serviceToCall);
            await fetchQueue();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to complete and call next');
        } finally {
            setIsActionLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchQueue();
        setRefreshing(false);
    }, [fetchQueue]);

    const toggleMissed = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowMissed(!showMissed);
    };

    const getServiceLabel = (type: ServiceType) => {
        switch (type) {
            case 'checkup': return 'Check-up';
            case 'prenatal': return 'Prenatal';
            case 'immunization': return 'Immunization';
            case 'dental': return 'Dental';
            default: return type;
        }
    };

    // ── Loading State ────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0D9488" />
                <Text style={styles.loadingText}>Loading queue...</Text>
            </View>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
            }
        >
            {/* ── Controller Lock Banner ───────────────────────────────────── */}
            <View style={[
                styles.controllerBanner,
                isController ? styles.controllerBannerActive : styles.controllerBannerIdle,
            ]}>
                <View style={styles.controllerBannerLeft}>
                    <View style={[
                        styles.controllerDot,
                        { backgroundColor: isController ? '#10B981' : (activeController ? '#F59E0B' : '#9CA3AF') }
                    ]} />
                    <View>
                        <Text style={[
                            styles.controllerBannerTitle,
                            { color: isController ? '#065F46' : '#92400E' },
                        ]}>
                            {isController
                                ? 'You are the Active Controller'
                                : activeController
                                    ? `${activeController.name} is controlling`
                                    : 'Queue is unmanaged'}
                        </Text>
                        <Text style={[
                            styles.controllerBannerSub,
                            { color: isController ? '#047857' : '#B45309' },
                        ]}>
                            {isController ? 'You can perform all queue actions' : 'View only — take control to manage'}
                        </Text>
                    </View>
                </View>

                {isController ? (
                    <TouchableOpacity onPress={releaseControl} style={styles.releaseButton}>
                        <Text style={styles.releaseButtonText}>Release</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={requestControl} style={styles.takeControlButton}>
                        <Feather name="lock" size={13} color="white" />
                        <Text style={styles.takeControlButtonText}>Take Control</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Now Serving Card ─────────────────────────────────────────── */}
            <View style={[
                styles.nowServingCard,
                { backgroundColor: currentPatient ? '#0D9488' : '#9CA3AF' },
            ]}>
                {/* Decorative icon */}
                <View style={styles.nowServingDecor}>
                    <Feather name={currentPatient ? 'mic' : 'pause-circle'} size={120} color="white" />
                </View>

                <Text style={styles.nowServingLabel}>
                    {currentPatient ? 'NOW SERVING' : 'NO PATIENT BEING SERVED'}
                </Text>

                {currentPatient ? (
                    <>
                        <View style={styles.nowServingRow}>
                            <Text style={styles.nowServingNumber}>#{currentPatient.queueNumber}</Text>
                            <View style={styles.nowServingInfo}>
                                <Text style={styles.nowServingName}>{currentPatient.name}</Text>
                                <Text style={styles.nowServingMeta}>
                                    {getServiceLabel(currentPatient.service)} • {currentPatient.arrivalTime}
                                </Text>
                            </View>
                        </View>

                        {/* Inline actions for current patient */}
                        <View style={styles.nowServingActions}>
                            <TouchableOpacity
                                onPress={handleCompleted}
                                disabled={isActionLoading || !isController}
                                style={[
                                    styles.actionBtnPrimary,
                                    (!isController || isActionLoading) && styles.actionBtnDisabled,
                                ]}
                            >
                                {isActionLoading
                                    ? <ActivityIndicator color="white" size="small" />
                                    : <Feather name="check-circle" size={16} color="white" />
                                }
                                <Text style={styles.actionBtnText}>MARK COMPLETE</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleNoShow}
                                disabled={isActionLoading || !isController}
                                style={[
                                    styles.actionBtnSecondary,
                                    (!isController || isActionLoading) && styles.actionBtnDisabled,
                                ]}
                            >
                                <Feather name="user-x" size={16} color="white" />
                                <Text style={styles.actionBtnText}>NO SHOW</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <View style={styles.nowServingRow}>
                        <Text style={styles.nowServingNumberEmpty}>#--</Text>
                        <Text style={styles.nowServingEmptyHint}>
                            {isController ? 'Press "Call Next" below to start serving' : 'Waiting for controller to start queue'}
                        </Text>
                    </View>
                )}
            </View>

            {/* ── Call Next Button ─────────────────────────────────────────── */}
            <TouchableOpacity
                onPress={handleCallNext}
                disabled={isActionLoading || !isController}
                style={[
                    styles.callNextButton,
                    (!isController || isActionLoading) && styles.callNextButtonDisabled,
                ]}
            >
                {isActionLoading
                    ? <ActivityIndicator color={isController ? 'white' : '#9CA3AF'} />
                    : <Feather name="mic" size={22} color={isController ? 'white' : '#9CA3AF'} />
                }
                <Text style={[
                    styles.callNextButtonText,
                    !isController && styles.callNextButtonTextDisabled,
                ]}>
                    CALL NEXT PATIENT
                </Text>
            </TouchableOpacity>

            {/* Complete & Call Next shortcut */}
            {currentPatient && nextPatient && (
                <TouchableOpacity
                    onPress={handleCompleteAndCallNext}
                    disabled={isActionLoading || !isController}
                    style={[
                        styles.completeAndCallButton,
                        (!isController || isActionLoading) && styles.completeAndCallButtonDisabled,
                    ]}
                >
                    {isActionLoading ? (
                        <ActivityIndicator color={isController ? '#059669' : '#9CA3AF'} size="small" />
                    ) : (
                        <>
                            <Feather name="check-circle" size={16} color={isController ? '#059669' : '#9CA3AF'} />
                            <Feather name="arrow-right" size={13} color={isController ? '#059669' : '#9CA3AF'} />
                            <Feather name="mic" size={16} color={isController ? '#059669' : '#9CA3AF'} />
                        </>
                    )}
                    <Text style={[
                        styles.completeAndCallText,
                        !isController && styles.completeAndCallTextDisabled,
                    ]}>
                        COMPLETE & CALL NEXT
                    </Text>
                </TouchableOpacity>
            )}

            {/* Next-up preview */}
            {nextPatient && (
                <View style={styles.nextUpCard}>
                    <View style={styles.nextUpBadge}>
                        <Text style={styles.nextUpBadgeText}>#{nextPatient.queueNumber}</Text>
                    </View>
                    <View style={styles.nextUpInfo}>
                        <Text style={styles.nextUpName}>{nextPatient.name}</Text>
                        <Text style={styles.nextUpService}>{getServiceLabel(nextPatient.service)}</Text>
                    </View>
                    <View style={styles.nextUpTag}>
                        <Text style={styles.nextUpTagText}>NEXT UP</Text>
                    </View>
                </View>
            )}

            {/* ── Waiting List ──────────────────────────────────────────────── */}
            <View style={styles.waitingListCard}>
                <View style={styles.waitingListHeader}>
                    <View style={styles.waitingListHeaderLeft}>
                        <Feather name="users" size={18} color="#0D9488" />
                        <Text style={styles.waitingListTitle}>Waiting Queue</Text>
                    </View>
                    <View style={styles.waitingCountBadge}>
                        <Text style={styles.waitingCountText}>{waitingPatients.length} waiting</Text>
                    </View>
                </View>

                {waitingPatients.length === 0 ? (
                    <View style={styles.emptyQueue}>
                        <Feather name="check-circle" size={32} color="#D1FAE5" />
                        <Text style={styles.emptyQueueText}>Queue is empty</Text>
                    </View>
                ) : (
                    <View style={styles.waitingListBody}>
                        {waitingPatients.map((patient, index) => (
                            <View key={patient.id} style={styles.queueItemWrapper}>
                                <PatientQueueItem patient={patient} isNext={index === 0} />
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* ── Missed / No-Show List ─────────────────────────────────────── */}
            <View style={styles.missedCard}>
                <TouchableOpacity onPress={toggleMissed} style={styles.missedHeader}>
                    <View style={styles.missedHeaderLeft}>
                        <Feather name="rotate-ccw" size={15} color="#6B7280" />
                        <Text style={styles.missedTitle}>Missed / No-Show</Text>
                        {missedPatients.length > 0 && (
                            <View style={styles.missedBadge}>
                                <Text style={styles.missedBadgeText}>{missedPatients.length}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.missedToggleText}>{showMissed ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>

                {showMissed && (
                    <View style={styles.missedBody}>
                        {missedPatients.length === 0 ? (
                            <Text style={styles.noMissedText}>No missed patients</Text>
                        ) : (
                            missedPatients.map((p) => (
                                <View key={p.id} style={styles.missedItem}>
                                    <View style={styles.missedItemLeft}>
                                        <Text style={styles.missedItemNumber}>#{p.queueNumber}</Text>
                                        <Text style={styles.missedItemName}>{p.name}</Text>
                                    </View>
                                    {isController && (
                                        <TouchableOpacity
                                            onPress={async () => {
                                                try {
                                                    await queueService.reinsertPatient(p.id);
                                                    fetchQueue();
                                                } catch (e: any) {
                                                    Alert.alert('Error', e.message);
                                                }
                                            }}
                                        >
                                            <Text style={styles.reinsertText}>Re-insert</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}
            </View>

            {/* Bottom spacer */}
            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#6B7280',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        gap: 14,
    },

    // Controller Banner
    controllerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
    },
    controllerBannerActive: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    controllerBannerIdle: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    controllerBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    controllerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    controllerBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    controllerBannerSub: {
        fontSize: 11,
        marginTop: 1,
    },
    takeControlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#0D9488',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    takeControlButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    releaseButton: {
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    releaseButtonText: {
        color: '#065F46',
        fontSize: 12,
        fontWeight: '700',
    },

    // Now Serving
    nowServingCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    nowServingDecor: {
        position: 'absolute',
        top: -20,
        right: -20,
        opacity: 0.08,
    },
    nowServingLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 10,
    },
    nowServingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
        marginBottom: 16,
    },
    nowServingNumber: {
        fontSize: 64,
        fontWeight: '900',
        color: 'white',
        lineHeight: 72,
    },
    nowServingNumberEmpty: {
        fontSize: 64,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.35)',
        lineHeight: 72,
    },
    nowServingInfo: {
        paddingBottom: 8,
    },
    nowServingName: {
        fontSize: 22,
        fontWeight: '700',
        color: 'white',
    },
    nowServingMeta: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
    },
    nowServingEmptyHint: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        paddingBottom: 8,
        flex: 1,
    },
    nowServingActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtnPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        paddingVertical: 12,
        borderRadius: 16,
    },
    actionBtnSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    actionBtnDisabled: {
        opacity: 0.4,
    },
    actionBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 13,
    },

    // Call Next
    callNextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#0D9488',
        paddingVertical: 18,
        borderRadius: 20,
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    callNextButtonDisabled: {
        backgroundColor: '#E5E7EB',
        shadowOpacity: 0,
        elevation: 0,
    },
    callNextButtonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    callNextButtonTextDisabled: {
        color: '#9CA3AF',
    },

    // Complete & Call Next
    completeAndCallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ECFDF5',
        borderWidth: 2,
        borderColor: '#6EE7B7',
        paddingVertical: 14,
        borderRadius: 18,
    },
    completeAndCallButtonDisabled: {
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
    },
    completeAndCallText: {
        color: '#059669',
        fontWeight: '700',
        fontSize: 13,
    },
    completeAndCallTextDisabled: {
        color: '#9CA3AF',
    },

    // Next Up preview
    nextUpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        padding: 12,
    },
    nextUpBadge: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextUpBadgeText: {
        color: '#0D9488',
        fontWeight: '800',
        fontSize: 13,
    },
    nextUpInfo: {
        flex: 1,
    },
    nextUpName: {
        fontWeight: '700',
        color: '#111827',
        fontSize: 14,
    },
    nextUpService: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 1,
    },
    nextUpTag: {
        backgroundColor: '#F0FDFA',
        borderWidth: 1,
        borderColor: '#CCFBF1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    nextUpTagText: {
        color: '#0D9488',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },

    // Waiting List
    waitingListCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    waitingListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    waitingListHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    waitingListTitle: {
        fontWeight: '700',
        color: '#111827',
        fontSize: 16,
    },
    waitingCountBadge: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    waitingCountText: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
    },
    waitingListBody: {
        padding: 12,
        gap: 8,
    },
    queueItemWrapper: {
        marginBottom: 8,
    },
    emptyQueue: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    emptyQueueText: {
        color: '#9CA3AF',
        fontSize: 14,
    },

    // Missed list
    missedCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        overflow: 'hidden',
    },
    missedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    missedHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    missedTitle: {
        fontWeight: '700',
        color: '#374151',
        fontSize: 14,
    },
    missedBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
    },
    missedBadgeText: {
        color: '#DC2626',
        fontSize: 11,
        fontWeight: '700',
    },
    missedToggleText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
    },
    missedBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    noMissedText: {
        color: '#9CA3AF',
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: 12,
    },
    missedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginTop: 8,
    },
    missedItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    missedItemNumber: {
        fontWeight: '700',
        color: '#9CA3AF',
        fontSize: 14,
    },
    missedItemName: {
        fontWeight: '600',
        color: '#374151',
        fontSize: 14,
    },
    reinsertText: {
        color: '#0D9488',
        fontSize: 12,
        fontWeight: '700',
    },
});
