import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TextInput,
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    chatService,
    Conversation,
    DoctorAvailability,
    isEffectivelyAvailable,
} from '../../../lib/chatService';
import { PatientChatWindow } from './patientchatwindow';
import { useAuth } from '../../../lib/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorInfo {
    id: string;
    first_name: string;
    last_name: string;
    availability?: DoctorAvailability;
}

interface AvailableDoctor {
    id: string;
    first_name: string;
    last_name: string;
    availability: DoctorAvailability | null;
}

type ActiveSection = 'chats' | 'doctors';

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientChatMain() {
    const { userProfile, session } = useAuth();
    const patientId = userProfile?.id ?? session?.user?.id ?? '';
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, 16) + 64;

    const [activeSection, setActiveSection] = useState<ActiveSection>('chats');

    // ── Conversations state ──────────────────────────────────────────────────
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [doctorMap, setDoctorMap] = useState<Record<string, DoctorInfo>>({});
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, DoctorAvailability>>({});
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [convLoading, setConvLoading] = useState(true);
    const [convSearch, setConvSearch] = useState('');

    // ── Available doctors state ──────────────────────────────────────────────
    const [availableDoctors, setAvailableDoctors] = useState<AvailableDoctor[]>([]);
    const [doctorSearch, setDoctorSearch] = useState('');
    const [doctorLoading, setDoctorLoading] = useState(false);
    const [startingChat, setStartingChat] = useState<string | null>(null); // doctorId being opened

    // ── Load conversations ────────────────────────────────────────────────────
    const loadConversations = useCallback(async () => {
        if (!patientId) return;
        const convs = await chatService.getPatientConversations(patientId);
        setConversations(convs);
        setConvLoading(false);

        for (const conv of convs) {
            if (!doctorMap[conv.doctor_id]) {
                const info = await chatService.getUserInfo(conv.doctor_id);
                if (info) setDoctorMap((prev) => ({ ...prev, [info.id]: info as DoctorInfo }));
            }
            if (!availabilityMap[conv.doctor_id]) {
                const avail = await chatService.getDoctorAvailability(conv.doctor_id);
                if (avail) setAvailabilityMap((prev) => ({ ...prev, [conv.doctor_id]: avail }));
            }
        }
    }, [patientId]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    useEffect(() => {
        if (!patientId) return;
        const unsub = chatService.subscribeToConversations(patientId, 'patient', loadConversations);
        return unsub;
    }, [patientId, loadConversations]);

    // Subscribe to availability for each doctor in conversations
    useEffect(() => {
        const unsubscribers: (() => void)[] = [];
        conversations.forEach((conv) => {
            const unsub = chatService.subscribeToDoctorAvailability(conv.doctor_id, (avail) => {
                setAvailabilityMap((prev) => ({ ...prev, [conv.doctor_id]: avail }));
            });
            unsubscribers.push(unsub);
        });
        return () => unsubscribers.forEach((fn) => fn());
    }, [conversations]);

    // ── Load available doctors ────────────────────────────────────────────────
    const loadAvailableDoctors = useCallback(async () => {
        setDoctorLoading(true);
        const docs = await chatService.getAvailableDoctors();
        setAvailableDoctors(docs);
        setDoctorLoading(false);
    }, []);

    useEffect(() => {
        if (activeSection === 'doctors') loadAvailableDoctors();
    }, [activeSection, loadAvailableDoctors]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getDoctorName = (conv: Conversation) => {
        const d = doctorMap[conv.doctor_id];
        return d ? `Dr. ${d.first_name} ${d.last_name}` : 'Doctor';
    };

    const getDoctorAvailStatus = (conv: Conversation): { label: string; color: string; available: boolean } => {
        const avail = availabilityMap[conv.doctor_id];
        if (!avail) return { label: 'Checking…', color: '#9CA3AF', available: false };
        if (isEffectivelyAvailable(avail)) return { label: 'Available', color: '#10B981', available: true };
        if (avail.is_available && avail.working_hours_start && avail.working_hours_end) {
            return {
                label: `Outside working hours (${avail.working_hours_start}–${avail.working_hours_end})`,
                color: '#F59E0B',
                available: false,
            };
        }
        return { label: 'Unavailable', color: '#EF4444', available: false };
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            const isToday = date.toDateString() === new Date().toDateString();
            return isToday
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch { return ''; }
    };

    // ── Start chat with a doctor ──────────────────────────────────────────────
    const handleStartChat = async (doctor: AvailableDoctor) => {
        if (!doctor.availability || !isEffectivelyAvailable(doctor.availability)) {
            Alert.alert('Doctor Unavailable', 'This doctor is not available for chat right now.');
            return;
        }
        setStartingChat(doctor.id);
        const result = await chatService.getOrCreateConversation(doctor.id, patientId);
        setStartingChat(null);
        if (!result.success || !result.data) {
            Alert.alert('Error', result.error ?? 'Could not open conversation.');
            return;
        }
        // Update local availability map if needed
        if (doctor.availability) {
            setAvailabilityMap((prev) => ({ ...prev, [doctor.id]: doctor.availability! }));
        }
        setDoctorMap((prev) => ({
            ...prev,
            [doctor.id]: { id: doctor.id, first_name: doctor.first_name, last_name: doctor.last_name },
        }));
        setSelectedConversation(result.data);
        setActiveSection('chats');
        await loadConversations();
    };

    // ── Filter helpers ────────────────────────────────────────────────────────
    const filteredConversations = conversations.filter((conv) => {
        if (!convSearch.trim()) return true;
        return getDoctorName(conv).toLowerCase().includes(convSearch.toLowerCase());
    });

    const filteredDoctors = availableDoctors.filter((d) => {
        if (!doctorSearch.trim()) return true;
        const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
        return fullName.includes(doctorSearch.toLowerCase());
    });

    // ── Open conversation window ──────────────────────────────────────────────
    if (selectedConversation) {
        const avail = availabilityMap[selectedConversation.doctor_id];
        const available = avail ? isEffectivelyAvailable(avail) : false;
        return (
            <View style={[styles.flex, { paddingBottom: bottomPadding }]}>
                <PatientChatWindow
                    conversation={selectedConversation}
                    patientId={patientId}
                    doctorName={getDoctorName(selectedConversation)}
                    availability={avail ?? null}
                    isAvailable={available}
                    onBack={() => {
                        setSelectedConversation(null);
                        loadConversations();
                    }}
                />
            </View>
        );
    }

    return (
        <View style={[styles.flex, { paddingBottom: bottomPadding }]}>
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
                {/* Refresh button for doctors panel */}
                {activeSection === 'doctors' && (
                    <TouchableOpacity
                        onPress={loadAvailableDoctors}
                        style={styles.headerIcon}
                        disabled={doctorLoading}
                    >
                        <Feather name="refresh-cw" size={16} color="#0D9488" />
                    </TouchableOpacity>
                )}
            </View>

            {/* ─── Tab switcher ────────────────────────────────────────────── */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeSection === 'chats' && styles.tabItemActive]}
                    onPress={() => setActiveSection('chats')}
                    activeOpacity={0.7}
                >
                    <Feather
                        name="message-circle"
                        size={15}
                        color={activeSection === 'chats' ? '#0D9488' : '#9CA3AF'}
                    />
                    <Text style={[styles.tabLabel, activeSection === 'chats' && styles.tabLabelActive]}>
                        My Chats
                    </Text>
                    {conversations.filter(c => (c.unread_count ?? 0) > 0).length > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>
                                {conversations.filter(c => (c.unread_count ?? 0) > 0).length}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeSection === 'doctors' && styles.tabItemActive]}
                    onPress={() => setActiveSection('doctors')}
                    activeOpacity={0.7}
                >
                    <Feather
                        name="user-plus"
                        size={15}
                        color={activeSection === 'doctors' ? '#0D9488' : '#9CA3AF'}
                    />
                    <Text style={[styles.tabLabel, activeSection === 'doctors' && styles.tabLabelActive]}>
                        Find a Doctor
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ─── My Chats panel ─────────────────────────────────────────── */}
            {activeSection === 'chats' && (
                <>
                    <View style={styles.searchRow}>
                        <Feather name="search" size={15} color="#9CA3AF" />
                        <TextInput
                            value={convSearch}
                            onChangeText={setConvSearch}
                            placeholder="Search conversations…"
                            placeholderTextColor="#9CA3AF"
                            style={styles.searchInput}
                        />
                        {convSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setConvSearch('')}>
                                <Feather name="x" size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView
                        style={styles.flex}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {convLoading ? (
                            <ActivityIndicator color="#0D9488" style={{ marginTop: 40 }} />
                        ) : filteredConversations.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="message-circle" size={40} color="#E5E7EB" />
                                <Text style={styles.emptyTitle}>No conversations yet</Text>
                                <Text style={styles.emptyText}>
                                    Use "Find a Doctor" to start your first conversation.
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyAction}
                                    onPress={() => setActiveSection('doctors')}
                                >
                                    <Feather name="user-plus" size={14} color="#fff" />
                                    <Text style={styles.emptyActionText}>Find a Doctor</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            filteredConversations.map((conv) => {
                                const status = getDoctorAvailStatus(conv);
                                const hasUnread = (conv.unread_count ?? 0) > 0;
                                return (
                                    <TouchableOpacity
                                        key={conv.id}
                                        style={[styles.convRow, hasUnread && styles.convRowUnread]}
                                        onPress={() => setSelectedConversation(conv)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.avatarWrapper}>
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>
                                                    {getDoctorName(conv).replace('Dr. ', '').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={[
                                                styles.statusDot,
                                                { backgroundColor: status.available ? '#10B981' : '#D1D5DB' },
                                            ]} />
                                        </View>

                                        <View style={styles.convInfo}>
                                            <View style={styles.convTopRow}>
                                                <Text style={[styles.convName, hasUnread && styles.convNameBold]}>
                                                    {getDoctorName(conv)}
                                                </Text>
                                                <Text style={[styles.convTime, hasUnread && styles.convTimeBold]}>
                                                    {formatTime(conv.last_message_at)}
                                                </Text>
                                            </View>
                                            <Text style={[styles.statusLabel, { color: status.color }]} numberOfLines={1}>
                                                {status.label}
                                            </Text>
                                            <View style={styles.convBottomRow}>
                                                <Text numberOfLines={1} style={[styles.lastMsg, hasUnread && styles.lastMsgBold]}>
                                                    {conv.last_message || 'No messages yet'}
                                                </Text>
                                                {hasUnread && (
                                                    <View style={styles.badge}>
                                                        <Text style={styles.badgeText}>{conv.unread_count}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                </>
            )}

            {/* ─── Find a Doctor panel ────────────────────────────────────── */}
            {activeSection === 'doctors' && (
                <>
                    <View style={styles.searchRow}>
                        <Feather name="search" size={15} color="#9CA3AF" />
                        <TextInput
                            value={doctorSearch}
                            onChangeText={setDoctorSearch}
                            placeholder="Search by doctor name…"
                            placeholderTextColor="#9CA3AF"
                            style={styles.searchInput}
                        />
                        {doctorSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setDoctorSearch('')}>
                                <Feather name="x" size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Info banner */}
                    <View style={styles.infoBanner}>
                        <Feather name="info" size={12} color="#0D9488" />
                        <Text style={styles.infoBannerText}>
                            Only doctors who are currently available are shown.
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.flex}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {doctorLoading ? (
                            <ActivityIndicator color="#0D9488" style={{ marginTop: 40 }} />
                        ) : filteredDoctors.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="user-x" size={40} color="#E5E7EB" />
                                <Text style={styles.emptyTitle}>No available doctors</Text>
                                <Text style={styles.emptyText}>
                                    No doctors are currently available. Please check back later.
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyAction}
                                    onPress={loadAvailableDoctors}
                                >
                                    <Feather name="refresh-cw" size={14} color="#fff" />
                                    <Text style={styles.emptyActionText}>Refresh</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            filteredDoctors.map((doctor) => {
                                const isStarting = startingChat === doctor.id;
                                return (
                                    <TouchableOpacity
                                        key={doctor.id}
                                        style={styles.doctorRow}
                                        onPress={() => handleStartChat(doctor)}
                                        disabled={isStarting}
                                        activeOpacity={0.7}
                                    >
                                        {/* Avatar */}
                                        <View style={styles.doctorAvatarWrap}>
                                            <View style={styles.doctorAvatar}>
                                                <Text style={styles.doctorAvatarText}>
                                                    {doctor.first_name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={styles.availDot} />
                                        </View>

                                        {/* Info */}
                                        <View style={styles.doctorInfo}>
                                            <Text style={styles.doctorName}>
                                                Dr. {doctor.first_name} {doctor.last_name}
                                            </Text>
                                            <View style={styles.availBadge}>
                                                <View style={styles.availBadgeDot} />
                                                <Text style={styles.availBadgeText}>Available now</Text>
                                            </View>
                                        </View>

                                        {/* Action */}
                                        <View style={styles.chatAction}>
                                            {isStarting ? (
                                                <ActivityIndicator size="small" color="#0D9488" />
                                            ) : (
                                                <>
                                                    <Feather name="message-circle" size={16} color="#0D9488" />
                                                    <Text style={styles.chatActionText}>Chat</Text>
                                                </>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#FAFAFA' },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    headerIcon: {
        padding: 8,
        backgroundColor: '#F0FDFA',
        borderRadius: 10,
    },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 9,
    },
    tabItemActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    tabLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
    tabLabelActive: { color: '#0D9488' },
    tabBadge: {
        minWidth: 17,
        height: 17,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

    // Search
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 16,
        marginTop: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111827' },

    // Info banner
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 16,
        marginTop: 8,
        backgroundColor: '#F0FDFA',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    infoBannerText: { fontSize: 12, color: '#0D9488', fontWeight: '500', flex: 1 },

    scrollContent: { padding: 16, paddingTop: 10, flexGrow: 1 },

    // Conversation rows
    convRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    convRowUnread: { borderColor: '#CCFBF1', backgroundColor: '#F0FFF4' },
    avatarWrapper: { position: 'relative', flexShrink: 0 },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 20, fontWeight: '700', color: '#0D9488' },
    statusDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    convInfo: { flex: 1, minWidth: 0 },
    convTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    convName: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8 },
    convNameBold: { fontWeight: '800', color: '#111827' },
    convTime: { fontSize: 11, color: '#9CA3AF' },
    convTimeBold: { color: '#0D9488', fontWeight: '600' },
    statusLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    convBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lastMsg: { fontSize: 13, color: '#9CA3AF', flex: 1, marginRight: 8 },
    lastMsgBold: { color: '#374151', fontWeight: '600' },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

    // Doctor rows
    doctorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    doctorAvatarWrap: { position: 'relative', flexShrink: 0 },
    doctorAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#BFDBFE',
    },
    doctorAvatarText: { fontSize: 20, fontWeight: '700', color: '#3B82F6' },
    availDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    doctorInfo: { flex: 1, minWidth: 0 },
    doctorName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
    availBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    availBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    availBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },
    chatAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F0FDFA',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#CCFBF1',
        minWidth: 60,
        justifyContent: 'center',
    },
    chatActionText: { fontSize: 13, fontWeight: '700', color: '#0D9488' },

    // Empty state
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 10,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
    emptyText: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 240,
    },
    emptyAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0D9488',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 18,
        marginTop: 8,
    },
    emptyActionText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
