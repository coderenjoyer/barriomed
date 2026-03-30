import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { chatService, Conversation, DoctorAvailability } from '../../../lib/chatService';
import { AvailabilityToggle } from './AvailabilityToggle';
import { DoctorChatWindow } from './DoctorChatWindow';
import { useAuth } from '../../../lib/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientInfo {
    id: string;
    first_name: string;
    last_name: string;
    mobile_number?: string;
}

type ActiveSection = 'chats' | 'search';

// ─── Component ────────────────────────────────────────────────────────────────

export function DoctorChatMain() {
    const { userProfile, session } = useAuth();
    const doctorId = userProfile?.id ?? session?.user?.id ?? '';

    const [activeSection, setActiveSection] = useState<ActiveSection>('chats');
    const [availability, setAvailability] = useState<DoctorAvailability | null>(null);

    // ── Conversations state ──────────────────────────────────────────────────
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [patientMap, setPatientMap] = useState<Record<string, PatientInfo>>({});
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [convLoading, setConvLoading] = useState(true);
    const [convSearch, setConvSearch] = useState('');

    // ── Patient search state ─────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PatientInfo[]>([]);
    const [searching, setSearching] = useState(false);
    const [openingChat, setOpeningChat] = useState<string | null>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Load availability ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!doctorId) return;
        chatService.getDoctorAvailability(doctorId).then(setAvailability);
    }, [doctorId]);

    useEffect(() => {
        if (!doctorId) return;
        const unsub = chatService.subscribeToDoctorAvailability(doctorId, setAvailability);
        return unsub;
    }, [doctorId]);

    // ── Load conversations ────────────────────────────────────────────────────
    const loadConversations = useCallback(async () => {
        if (!doctorId) return;
        const convs = await chatService.getDoctorConversations(doctorId);
        setConversations(convs);
        setConvLoading(false);

        // Batch-fetch missing patient info
        const missing = convs.filter((c) => !patientMap[c.patient_id]);
        for (const conv of missing) {
            const info = await chatService.getUserInfo(conv.patient_id);
            if (info) setPatientMap((prev) => ({ ...prev, [info.id]: info as PatientInfo }));
        }
    }, [doctorId]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    useEffect(() => {
        if (!doctorId) return;
        const unsub = chatService.subscribeToConversations(doctorId, 'doctor', loadConversations);
        return unsub;
    }, [doctorId, loadConversations]);

    // ── Patient search (debounced) ────────────────────────────────────────────
    const runSearch = useCallback(async (q: string) => {
        setSearching(true);
        const results = await chatService.searchPatients(q);
        setSearchResults(results);
        setSearching(false);
    }, []);

    // Load all patients on first search tab open
    useEffect(() => {
        if (activeSection === 'search' && searchResults.length === 0) {
            runSearch('');
        }
    }, [activeSection]);

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => runSearch(text), 350);
    };

    // ── Open / create conversation with a patient ────────────────────────────
    const handleOpenChat = async (patient: PatientInfo) => {
        setOpeningChat(patient.id);
        const result = await chatService.getOrCreateConversation(doctorId, patient.id);
        setOpeningChat(null);

        if (!result.success || !result.data) {
            Alert.alert('Error', result.error ?? 'Could not open conversation.');
            return;
        }

        // Cache patient info
        setPatientMap((prev) => ({ ...prev, [patient.id]: patient }));
        setSelectedConversation(result.data);
        setActiveSection('chats');
        await loadConversations();
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getPatientName = (conv: Conversation) => {
        const p = patientMap[conv.patient_id];
        return p ? `${p.first_name} ${p.last_name}` : 'Patient';
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

    const filteredConversations = conversations.filter((conv) => {
        if (!convSearch.trim()) return true;
        return getPatientName(conv).toLowerCase().includes(convSearch.toLowerCase());
    });

    // ── Open conversation window ──────────────────────────────────────────────
    if (selectedConversation) {
        return (
            <View style={styles.flex}>
                <DoctorChatWindow
                    conversation={selectedConversation}
                    doctorId={doctorId}
                    patientName={getPatientName(selectedConversation)}
                    onBack={() => {
                        setSelectedConversation(null);
                        loadConversations();
                    }}
                />
            </View>
        );
    }

    return (
        <View style={styles.flex}>
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            {/* ─── Availability toggle (always visible) ────────────────────── */}
            <View style={styles.availSection}>
                <AvailabilityToggle
                    doctorId={doctorId}
                    availability={availability}
                    onAvailabilityChange={setAvailability}
                />
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
                        Conversations
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
                    style={[styles.tabItem, activeSection === 'search' && styles.tabItemActive]}
                    onPress={() => setActiveSection('search')}
                    activeOpacity={0.7}
                >
                    <Feather
                        name="user-plus"
                        size={15}
                        color={activeSection === 'search' ? '#0D9488' : '#9CA3AF'}
                    />
                    <Text style={[styles.tabLabel, activeSection === 'search' && styles.tabLabelActive]}>
                        Find Patient
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ─── Conversations tab ───────────────────────────────────────── */}
            {activeSection === 'chats' && (
                <>
                    <View style={styles.searchRow}>
                        <Feather name="search" size={15} color="#9CA3AF" />
                        <TextInput
                            value={convSearch}
                            onChangeText={setConvSearch}
                            placeholder="Filter conversations…"
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
                            <ActivityIndicator color="#0D9488" style={{ paddingVertical: 24 }} />
                        ) : filteredConversations.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="message-circle" size={36} color="#E5E7EB" />
                                <Text style={styles.emptyStateTitle}>No conversations yet</Text>
                                <Text style={styles.emptyStateText}>
                                    Use "Find Patient" to start a conversation.
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyAction}
                                    onPress={() => setActiveSection('search')}
                                >
                                    <Feather name="user-plus" size={14} color="#fff" />
                                    <Text style={styles.emptyActionText}>Find Patient</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            filteredConversations.map((conv) => {
                                const name = getPatientName(conv);
                                const hasUnread = (conv.unread_count ?? 0) > 0;
                                return (
                                    <TouchableOpacity
                                        key={conv.id}
                                        style={[styles.convRow, hasUnread && styles.convRowUnread]}
                                        onPress={() => setSelectedConversation(conv)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.convAvatar}>
                                            <Text style={styles.convAvatarText}>
                                                {name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.convInfo}>
                                            <View style={styles.convTopRow}>
                                                <Text style={[styles.convName, hasUnread && styles.convNameUnread]}>
                                                    {name}
                                                </Text>
                                                <Text style={[styles.convTime, hasUnread && styles.convTimeUnread]}>
                                                    {formatTime(conv.last_message_at)}
                                                </Text>
                                            </View>
                                            <View style={styles.convBottomRow}>
                                                <Text
                                                    numberOfLines={1}
                                                    style={[styles.convLastMsg, hasUnread && styles.convLastMsgUnread]}
                                                >
                                                    {conv.last_message || 'No messages yet'}
                                                </Text>
                                                {hasUnread && (
                                                    <View style={styles.unreadBadge}>
                                                        <Text style={styles.unreadBadgeText}>
                                                            {conv.unread_count}
                                                        </Text>
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

            {/* ─── Find Patient (search) tab ───────────────────────────────── */}
            {activeSection === 'search' && (
                <>
                    {/* Search bar */}
                    <View style={styles.searchRow}>
                        <Feather name="search" size={15} color="#9CA3AF" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={handleSearchChange}
                            placeholder="Name or mobile number…"
                            placeholderTextColor="#9CA3AF"
                            style={styles.searchInput}
                            autoFocus
                        />
                        {searching && <ActivityIndicator size="small" color="#0D9488" />}
                        {!searching && searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); runSearch(''); }}>
                                <Feather name="x" size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Search hint */}
                    <View style={styles.searchHint}>
                        <Feather name="info" size={12} color="#6B7280" />
                        <Text style={styles.searchHintText}>
                            Search by first name, last name, or mobile number
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.flex}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {searching ? (
                            <ActivityIndicator color="#0D9488" style={{ marginTop: 32 }} />
                        ) : searchResults.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="users" size={36} color="#E5E7EB" />
                                <Text style={styles.emptyStateTitle}>No patients found</Text>
                                <Text style={styles.emptyStateText}>
                                    Try a different name or mobile number.
                                </Text>
                            </View>
                        ) : (
                            searchResults.map((patient) => {
                                const isOpening = openingChat === patient.id;
                                const initials = `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`.toUpperCase();
                                return (
                                    <TouchableOpacity
                                        key={patient.id}
                                        style={styles.patientRow}
                                        onPress={() => handleOpenChat(patient)}
                                        disabled={isOpening}
                                        activeOpacity={0.7}
                                    >
                                        {/* Avatar */}
                                        <View style={styles.patientAvatar}>
                                            <Text style={styles.patientAvatarText}>{initials}</Text>
                                        </View>

                                        {/* Info */}
                                        <View style={styles.patientInfo}>
                                            <Text style={styles.patientName}>
                                                {patient.first_name} {patient.last_name}
                                            </Text>
                                            {patient.mobile_number && (
                                                <View style={styles.mobileRow}>
                                                    <Feather name="smartphone" size={11} color="#9CA3AF" />
                                                    <Text style={styles.mobileText}>{patient.mobile_number}</Text>
                                                </View>
                                            )}
                                            <View style={styles.rolePill}>
                                                <Text style={styles.rolePillText}>Patient</Text>
                                            </View>
                                        </View>

                                        {/* Action */}
                                        <View style={styles.chatAction}>
                                            {isOpening ? (
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
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },

    // Availability section
    availSection: {
        paddingHorizontal: 16,
        paddingTop: 12,
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

    // Search bar
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

    // Search hint
    searchHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 16,
        marginTop: 6,
    },
    searchHintText: { fontSize: 11, color: '#9CA3AF' },

    scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40, flexGrow: 1 },

    // Conversation rows
    convRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    convRowUnread: { borderColor: '#CCFBF1', backgroundColor: '#F0FFF4' },
    convAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    convAvatarText: { fontSize: 18, fontWeight: '700', color: '#0D9488' },
    convInfo: { flex: 1, minWidth: 0 },
    convTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
    convName: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8 },
    convNameUnread: { fontWeight: '800', color: '#111827' },
    convTime: { fontSize: 11, color: '#9CA3AF' },
    convTimeUnread: { color: '#0D9488', fontWeight: '600' },
    convBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    convLastMsg: { fontSize: 13, color: '#9CA3AF', flex: 1, marginRight: 8 },
    convLastMsgUnread: { color: '#374151', fontWeight: '600' },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        flexShrink: 0,
    },
    unreadBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

    // Patient search results
    patientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    patientAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        borderWidth: 2,
        borderColor: '#BFDBFE',
    },
    patientAvatarText: { fontSize: 16, fontWeight: '700', color: '#3B82F6' },
    patientInfo: { flex: 1, minWidth: 0 },
    patientName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
    mobileRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    mobileText: { fontSize: 12, color: '#9CA3AF' },
    rolePill: {
        alignSelf: 'flex-start',
        backgroundColor: '#FEF3C7',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    rolePillText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
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
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyStateTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
    emptyStateText: {
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
