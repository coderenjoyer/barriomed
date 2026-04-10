//for code cleaning

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, LogBox } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../backend/lib/AuthContext';
import { useNotifications } from '../../backend/lib/NotificationContext';
import { fetchMedicalInfo, type PatientMedicalInfo } from '../../backend/lib/patientMedicalService';
import { PatientSettingsForm } from '../../components/patient/patient/PatientSettingsForm';
import { BottomNavigation } from '../../components/patient/patient/bottomnav';
import { ServiceSelector, ServiceType } from '../../components/patient/patient/selectservice';
import { QueueTicket } from '../../components/patient/patient/queueticket';
import { BotikaPage } from '../../components/patient/patient/botikamanagement';
import { FloatingActionButton } from '../../components/patient/patient/floatingactionbutton';
import { FamilyMemberCard, FamilyMember, YellowCardDetails } from '../../components/patient/patient/yellowcard';
import { PatientMedicalRecords } from '../../components/patient/patient/medicalrecords';
import { PatientChatMain } from '../../components/patient/patientchat/patientchatmain';
import { PatientPrescriptions } from '../../components/patient/patient/patientprescriptions';
import { NotificationsPanel } from '../../components/patient/patient/NotificationsPanel';
import { queueService, QueueTicketData } from '../../backend/lib/queueService';
import { Alert } from 'react-native';
import { NotificationType } from '../../backend/lib/notificationService';

LogBox.ignoreLogs([
  'setLayoutAnimationEnabledExperimental is currently a no-op',
]);


// Family members – empty until real data is bound
const initialFamilyMembers: FamilyMember[] = [];

// Dynamic greeting based on time of day
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
}

interface UserDashboardProps {
    onLogout?: () => void;
}

export function UserDashboard({ onLogout }: UserDashboardProps) {
    const { userProfile, session } = useAuth();
    const { unreadCount } = useNotifications();
    const userId = session?.user?.id ?? '';

    const [activeTab, setActiveTab] = useState('home');
    const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showServiceSelector, setShowServiceSelector] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState('1');
    const [membersList, setMembersList] = useState<FamilyMember[]>(initialFamilyMembers);

    // Patient medical info state
    const [medicalInfo, setMedicalInfo] = useState<PatientMedicalInfo | null>(null);
    const [showSettingsForm, setShowSettingsForm] = useState(false);
    const [settingsMode, setSettingsMode] = useState<'add' | 'edit'>('add');
    const [showCompletionModal, setShowCompletionModal] = useState(false);

    // Fetch medical info on mount
    useEffect(() => {
        if (userId) {
            fetchMedicalInfo(userId).then((data) => {
                if (data) setMedicalInfo(data);
            });
        }
    }, [userId]);

    // Derive display name from authenticated user
    const firstName = userProfile?.first_name ?? session?.user?.user_metadata?.first_name ?? '';
    const lastName = userProfile?.last_name ?? session?.user?.user_metadata?.last_name ?? '';
    const displayName = `${firstName} ${lastName}`.trim() || 'User';
    const userInitial = (firstName?.[0] ?? '?').toUpperCase();
    const profilePicUrl = medicalInfo?.profile_picture_url;

    const [queueTicket, setQueueTicket] = useState<QueueTicketData | null>(null);
    const isQueueing = !!queueTicket;

    // Resume queue state (A-FR-04 Offline Display, A-FR-01 Silent Sync)
    useEffect(() => {
        let isMounted = true;
        async function loadTicket() {
            if (!userId) return;

            const localData = await queueService.getLocalTicket(userId);
            if (localData && isMounted) {
                setQueueTicket(localData);
                setSelectedService(localData.serviceType);
            }

            const synced = await queueService.syncPendingTicket(userId);
            if (synced && isMounted) {
                setQueueTicket(synced);
            }
        }
        loadTicket();
        return () => { isMounted = false; };
    }, [userId]);

    // Supabase Real-time connection (A-FR-02, A-FR-03, A-FR-05)
    useEffect(() => {
        if (!userId || !queueTicket) return;

        const unsubscribe = queueService.subscribeToQueue(
            queueTicket.serviceType,
            userId,
            (nowServing) => {
                setQueueTicket(prev => {
                    if (!prev) return prev;
                    if (prev.nowServing >= nowServing) return prev; // Don't go backwards

                    const peopleAhead = Math.max(0, prev.queueNumber - nowServing - 1);

                    if (peopleAhead === 5) {
                        Alert.alert(
                            "Malapit na ang iyong turn",
                            "Pumunta na sa health center. Ikaw ay 5 numbers away na lang."
                        );
                    }

                    const updated: QueueTicketData = {
                        ...prev,
                        nowServing,
                        peopleAhead,
                        estWaitTime: `${peopleAhead * 5} mins`
                    };

                    queueService.updateLocalTicket(userId, updated);
                    return updated;
                });
            },
            (status) => {
                // IMPORTANT: Never call other setState setters (e.g. setSelectedService)
                // inside a setState updater function — it is a React anti-pattern and
                // will be silently ignored in concurrent mode.
                // Instead we just update queueTicket.status here and let the watching
                // useEffect below handle the side-effects (clearing storage, showing modal).
                setQueueTicket(prev => {
                    if (!prev) return prev;

                    if (status === 'No Show') {
                        Alert.alert(
                            "Queue Missed",
                            "Your number was called but you were not present. You may be re-inserted by staff."
                        );
                    }

                    // Write the updated status to local storage so we have the
                    // freshest state if the app is backgrounded and resumed.
                    const updated: QueueTicketData = { ...prev, status };
                    queueService.updateLocalTicket(userId, updated);
                    return updated;
                });
            }
        );

        return unsubscribe;
    }, [userId, queueTicket?.serviceType]);

    // Watch queueTicket.status and handle terminal transitions outside of the
    // setState updater (the correct place for side-effects in React).
    useEffect(() => {
        if (!queueTicket) return;

        const { status } = queueTicket;

        if (status === 'Completed') {
            // Clear local cache and surface the completion modal.
            queueService.clearLocalTicket(userId);
            setQueueTicket(null);
            setSelectedService(null);
            setShowCompletionModal(true);
        } else if (status === 'Cancelled') {
            // Cancelled via another device / staff action — just clean up silently.
            queueService.clearLocalTicket(userId);
            setQueueTicket(null);
            setSelectedService(null);
            setActiveTab('home');
        }
    }, [queueTicket?.status]);


    const handleServiceConfirm = async () => {
        if (!selectedService || !userId) return;
        setIsLoading(true);
        setShowServiceSelector(false);

        const ticket = await queueService.requestTicket(userId, selectedService);

        setIsLoading(false);

        if ((ticket as any).alreadyActive) {
            // User already has a live queue — surface it without creating a new one
            setQueueTicket(ticket);
            setSelectedService(ticket.serviceType);
            setActiveTab('queue');
            Alert.alert(
                'Active Queue Found',
                `You already have Queue #${ticket.queueNumber} active. Please wait for your turn or cancel it first.`,
                [{ text: 'View Queue', onPress: () => setActiveTab('queue') }]
            );
            return;
        }

        setQueueTicket(ticket);
        setActiveTab('queue');
    };

    const handleCancelQueue = async () => {
        // cancelTicket marks the row CANCELLED in Supabase first (using the ticket's DB id
        // + userId ownership check), then clears local storage.
        // This prevents ghost WAITING rows that would cause subsequent users to receive
        // inflated / duplicated queue numbers.
        if (queueTicket?.id) {
            await queueService.cancelTicket(userId, queueTicket.id);
        } else {
            await queueService.clearLocalTicket(userId);
        }
        setQueueTicket(null);
        setSelectedService(null);
        setActiveTab('home');
    };

    const handleGetQueueNumber = () => {
        if (isQueueing) {
            // Already in a queue — navigate to queue tab and show info
            Alert.alert(
                'You Already Have an Active Queue',
                `Queue #${queueTicket?.queueNumber} is currently active. Complete or cancel your existing queue first.`,
                [
                    { text: 'View Queue', onPress: () => setActiveTab('queue') },
                    { text: 'Dismiss', style: 'cancel' },
                ]
            );
            return;
        }
        setShowServiceSelector(true);
    };

    const handleNotificationNavigate = (type: NotificationType, relatedId: string | null) => {
        switch (type) {
            case 'chat':
                setActiveTab('chat');
                break;
            case 'prescription':
                setActiveTab('prescriptions');
                break;
            case 'queue':
                setActiveTab('queue');
                break;
            case 'record':
                setActiveTab('records');
                break;
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <Text style={styles.greetingText}>{getGreeting()},</Text>
                <Text style={styles.nameText}>{displayName}</Text>
            </View>

            <View style={styles.headerRight}>
                <TouchableOpacity
                    onPress={onLogout}
                    style={styles.iconButton}
                >
                    <Feather name="log-out" size={20} color="#4B5563" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowNotifications(true)}
                >
                    <Feather name="bell" size={20} color="#4B5563" />
                    {unreadCount > 0 && (
                        <View style={styles.badgeWrap}>
                            <Text style={styles.badgeText}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.avatarContainer}>
                    {profilePicUrl && profilePicUrl.trim() !== '' ? (
                        <Image
                            source={{ uri: profilePicUrl }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarInitial}>
                            <Text style={styles.avatarInitialText}>{userInitial}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    const renderQueueStatusCard = () => {
        const isServing = queueTicket?.status === 'Serving';

        if (isServing) {
            return (
                <View style={[styles.queueCard, styles.queueCardServing]}>
                    <Text style={[styles.queueCardLabel, { color: '#92400E' }]}>NOW SERVING</Text>
                    <View style={styles.yourTurnRow}>
                        <View style={styles.yourTurnBadge}>
                            <Feather name="bell" size={20} color="#92400E" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.yourTurnText}>It's Your Turn!</Text>
                            <Text style={styles.yourTurnSubText}>Please proceed to the Doctor's Consultation Area</Text>
                        </View>
                        <Text style={styles.yourTurnNumber}>#{queueTicket?.queueNumber}</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.queueCard}>
                <Text style={styles.queueCardLabel}>CURRENT POSITION</Text>
                <View style={styles.queueCardContent}>
                    <View style={styles.queueNumberSection}>
                        <Text style={styles.queueNumberHash}>#</Text>
                        <Text style={styles.queueNumber}>{queueTicket?.queueNumber}</Text>
                        <Text style={styles.queueTotal}>/{(queueTicket?.nowServing || 0) + (queueTicket?.peopleAhead || 0)}</Text>
                    </View>
                    <View style={styles.queueCircle}>
                        <Text style={styles.queueCircleLabel}>Your Turn</Text>
                        <Text style={styles.queueCircleValue}>In {queueTicket?.peopleAhead}</Text>
                    </View>
                </View>
                <View style={styles.queueDetails}>
                    <View style={styles.queueDetailRow}>
                        <Feather name="clock" size={14} color="#0D9488" />
                        <Text style={styles.queueDetailText}>Est. Wait: {queueTicket?.estWaitTime}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderQuickActions = () => (
        <View style={styles.quickActionsGrid}>
            <TouchableOpacity
                style={[
                    styles.quickActionCard,
                    styles.quickActionPrimary,
                    isQueueing && styles.quickActionDisabled,
                ]}
                onPress={handleGetQueueNumber}
                disabled={isLoading}
            >
                <View style={styles.quickActionIcon}>
                    <Feather name={isQueueing ? 'clock' : 'search'} size={16} color="white" />
                </View>
                <Text style={styles.quickActionText}>
                    {isQueueing ? `Queue #${queueTicket?.queueNumber} Active` : 'Get Queue Number'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionSecondary]}
                onPress={() => setActiveTab('prescriptions')}
            >
                <View style={styles.quickActionIcon}>
                    <FontAwesome5 name="file-prescription" size={16} color="white" />
                </View>
                <Text style={styles.quickActionText}>My Prescriptions</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionLight]}
                onPress={() => setActiveTab('botika')}
            >
                <View style={[styles.quickActionIcon, styles.quickActionIconLight]}>
                    <FontAwesome5 name="pills" size={16} color="#F97316" />
                </View>
                <Text style={styles.quickActionTextDark}>E-Botika Inventory</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionLight]}
                onPress={() => setActiveTab('records')}
            >
                <View style={[styles.quickActionIcon, styles.quickActionIconLight]}>
                    <Feather name="file-text" size={16} color="#3B82F6" />
                </View>
                <Text style={styles.quickActionTextDark}>Health Records</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {renderHeader()}
                        <View style={styles.homeContent}>
                            {isQueueing && renderQueueStatusCard()}
                            {renderQuickActions()}
                            <BotikaPage scrollEnabled={false} />
                        </View>
                    </ScrollView>
                );
            case 'queue':
                if (!isQueueing) {
                    return (
                        <View style={styles.emptyStateContainer}>
                            <Feather name="calendar" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyStateTitle}>No Active Queue</Text>
                            <Text style={styles.emptyStateText}>Select a service from Home to get a number.</Text>
                            <TouchableOpacity
                                onPress={() => setActiveTab('home')}
                                style={styles.actionButton}
                            >
                                <Text style={styles.actionButtonText}>Go to Home</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }
                return (
                    <View style={styles.tabContent}>
                        <QueueTicket
                            serviceType={queueTicket?.serviceType || selectedService || 'checkup'}
                            queueNumber={queueTicket?.queueNumber || 0}
                            nowServing={queueTicket?.nowServing || 0}
                            peopleAhead={queueTicket?.peopleAhead || 0}
                            estWaitTime={queueTicket?.estWaitTime || 'Unknown'}
                            status={queueTicket?.status || 'Pending'}
                            onCancel={handleCancelQueue}
                        />
                    </View>
                );
            case 'prescriptions':
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={{ padding: 24, paddingBottom: 100 }}>
                            <PatientPrescriptions patientId={userId} />
                        </View>
                    </ScrollView>
                );
            case 'botika':
                return (
                    <View style={{ flex: 1 }}>
                        <BotikaPage scrollEnabled={true} />
                    </View>
                );
            case 'records':
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937' }}>
                                    Family Records
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSettingsMode(medicalInfo ? 'edit' : 'add');
                                        setShowSettingsForm(true);
                                    }}
                                    style={styles.settingsButton}
                                >
                                    <Feather name="settings" size={18} color="#0D9488" />
                                    <Text style={styles.settingsButtonText}>
                                        {medicalInfo ? 'Edit Info' : 'Add Info'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Medical Info Summary Card */}
                            {medicalInfo && (
                                <View style={styles.medicalInfoCard}>
                                    <View style={styles.medicalInfoRow}>
                                        {medicalInfo.profile_picture_url && medicalInfo.profile_picture_url.trim() !== '' ? (
                                            <Image
                                                source={{ uri: medicalInfo.profile_picture_url }}
                                                style={styles.medicalInfoAvatar}
                                            />
                                        ) : (
                                            <View style={[styles.medicalInfoAvatar, styles.medicalInfoAvatarPlaceholder]}>
                                                <Feather name="user" size={24} color="#9CA3AF" />
                                            </View>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.medicalInfoName}>{displayName}</Text>
                                            <Text style={styles.medicalInfoSub}>Blood Type: {medicalInfo.blood_type}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.medicalInfoStats}>
                                        <View style={styles.medicalInfoStat}>
                                            <Text style={styles.medicalInfoStatLabel}>Height</Text>
                                            <Text style={styles.medicalInfoStatValue}>{medicalInfo.height} cm</Text>
                                        </View>
                                        <View style={styles.medicalInfoDivider} />
                                        <View style={styles.medicalInfoStat}>
                                            <Text style={styles.medicalInfoStatLabel}>Weight</Text>
                                            <Text style={styles.medicalInfoStatValue}>{medicalInfo.weight} kg</Text>
                                        </View>
                                        <View style={styles.medicalInfoDivider} />
                                        <View style={styles.medicalInfoStat}>
                                            <Text style={styles.medicalInfoStatLabel}>BMI</Text>
                                            <Text style={styles.medicalInfoStatValue}>{medicalInfo.bmi}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {membersList.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8 }}>
                                    <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
                                        {membersList.map((member, index) => (
                                            <FamilyMemberCard
                                                key={member.id}
                                                member={member}
                                                isSelected={selectedMemberId === member.id}
                                                onClick={() => setSelectedMemberId(member.id)}
                                                index={index}
                                            />
                                        ))}
                                    </View>
                                </ScrollView>
                            ) : null}
                        </View>

                        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
                            {membersList.find(m => m.id === selectedMemberId) && (
                                <YellowCardDetails
                                    member={membersList.find(m => m.id === selectedMemberId)!}
                                    isOwnRecord={membersList.find(m => m.id === selectedMemberId)?.relation === 'Me'}
                                    onUpdate={(updatedMember) => {
                                        setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
                                    }}
                                />
                            )}

                            <PatientMedicalRecords patientId={userId} />
                        </View>
                    </ScrollView>
                );
            case 'chat':
                return (
                    <View style={{ flex: 1 }}>
                        <PatientChatMain />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Decorative Background */}
            <View style={[styles.blurCircle, styles.blurCircleTop]} />
            <View style={[styles.blurCircle, styles.blurCircleBottom]} />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {renderContent()}
            </SafeAreaView>

            {activeTab === 'home' && !isQueueing && <FloatingActionButton onPress={handleGetQueueNumber} />}

            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Notifications Panel */}
            <NotificationsPanel
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
                onNavigate={handleNotificationNavigate}
            />

            {/* Patient Settings Form Modal */}
            <PatientSettingsForm
                mode={settingsMode}
                userId={userId}
                existingRecord={medicalInfo}
                visible={showSettingsForm}
                onClose={() => setShowSettingsForm(false)}
                onSaved={(record) => setMedicalInfo(record)}
            />

            {/* Queue Completed Modal */}
            {showCompletionModal && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.completionModalContent]}>
                        <View style={styles.completionIconCircle}>
                            <Feather name="check-circle" size={40} color="#0D9488" />
                        </View>
                        <Text style={styles.completionTitle}>Queue Completed!</Text>
                        <Text style={styles.completionMessage}>
                            Your visit is done. Thank you for using Barriomed.
                            You may get a new number anytime.
                        </Text>
                        <TouchableOpacity
                            style={styles.completionButton}
                            onPress={() => {
                                setShowCompletionModal(false);
                                setActiveTab('home');
                            }}
                        >
                            <Text style={styles.completionButtonText}>Back to Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.requeueButton}
                            onPress={() => {
                                setShowCompletionModal(false);
                                setShowServiceSelector(true);
                            }}
                        >
                            <Text style={styles.requeueButtonText}>Get Another Number</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Service Selector Modal */}
            {showServiceSelector && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Service</Text>
                            <TouchableOpacity onPress={() => setShowServiceSelector(false)}>
                                <Feather name="x" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ServiceSelector
                            selected={selectedService}
                            onSelect={setSelectedService}
                            onConfirm={handleServiceConfirm}
                            isLoading={isLoading}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100, // Space for bottom nav
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    headerLeft: {
        flexDirection: 'column',
    },
    greetingText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
        borderRadius: 999,
        backgroundColor: '#F3F4F6',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    badgeWrap: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        paddingHorizontal: 3,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 12,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#CCFBF1',
    },
    avatar: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    avatarInitial: {
        width: '100%',
        height: '100%',
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitialText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    tabContent: {
        paddingHorizontal: 24,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        minHeight: 400,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#0D9488',
        borderRadius: 12,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    // Background Elements
    blurCircle: {
        position: 'absolute',
        borderRadius: 9999,
        opacity: 0.4,
    },
    blurCircleTop: {
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        backgroundColor: '#CCFBF1', // teal-100
    },
    blurCircleBottom: {
        bottom: -50,
        left: -50,
        width: 250,
        height: 250,
        backgroundColor: '#EFF6FF', // blue-50
    },
    // Home Content
    homeContent: {
        paddingHorizontal: 24,
        gap: 24,
    },
    // Queue Status Card
    queueCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F0FDFA',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    queueCardServing: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        borderWidth: 2,
        shadowColor: '#F59E0B',
        shadowOpacity: 0.2,
    },
    yourTurnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    yourTurnBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FDE68A',
    },
    yourTurnText: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#92400E',
    },
    yourTurnSubText: {
        fontSize: 12,
        color: '#B45309',
        marginTop: 2,
    },
    yourTurnNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F59E0B',
    },
    queueCardLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    queueCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    queueNumberSection: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    queueNumberHash: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0D9488',
    },
    queueNumber: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#0D9488',
    },
    queueTotal: {
        fontSize: 20,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    queueCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F0FDFA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#0D9488',
    },
    queueCircleLabel: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '500',
    },
    queueCircleValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0D9488',
    },
    queueDetails: {
        gap: 8,
    },
    queueDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    queueDetailText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    // Quick Actions
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    quickActionCard: {
        width: '47%',
        height: 112,
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    quickActionPrimary: {
        backgroundColor: '#0D9488',
    },
    quickActionDisabled: {
        backgroundColor: '#5EEAD4',  // lighter teal to signal "already active"
        opacity: 0.85,
    },
    quickActionSecondary: {
        backgroundColor: '#10B981',
    },
    quickActionLight: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    quickActionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionIconLight: {
        backgroundColor: '#FEF3C7',
    },
    quickActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    quickActionTextDark: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    // Queue Completion Modal
    completionModalContent: {
        alignItems: 'center',
        paddingTop: 32,
        paddingHorizontal: 24,
        paddingBottom: 40,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    completionIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F0FDFA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#CCFBF1',
    },
    completionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    completionMessage: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
        paddingHorizontal: 8,
    },
    completionButton: {
        width: '100%',
        backgroundColor: '#0D9488',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    completionButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    requeueButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    requeueButtonText: {
        color: '#0D9488',
        fontWeight: '600',
        fontSize: 16,
    },
    settingsButton: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: '#F0FDFA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    settingsButtonText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: '#0D9488',
    },
    medicalInfoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    medicalInfoRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 14,
        marginBottom: 16,
    },
    medicalInfoAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden' as const,
        backgroundColor: '#F3F4F6',
    },
    medicalInfoAvatarPlaceholder: {
        backgroundColor: '#F3F4F6',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    medicalInfoName: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#111827',
        marginBottom: 2,
    },
    medicalInfoSub: {
        fontSize: 13,
        color: '#6B7280',
    },
    medicalInfoStats: {
        flexDirection: 'row' as const,
        justifyContent: 'space-around' as const,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    medicalInfoStat: {
        alignItems: 'center' as const,
        flex: 1,
    },
    medicalInfoStatLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500' as const,
        marginBottom: 4,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    medicalInfoStatValue: {
        fontSize: 15,
        fontWeight: '700' as const,
        color: '#111827',
    },
    medicalInfoDivider: {
        width: 1,
        backgroundColor: '#F3F4F6',
    },
});