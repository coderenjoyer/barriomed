import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    LayoutAnimation,
    Platform,
    UIManager,
    ActivityIndicator,
    Image,
    ScrollView,
} from 'react-native'
import { Search, QrCode, User, ChevronRight, RefreshCcw, Clock, Zap } from 'lucide-react-native'
import { Feather } from '@expo/vector-icons'
import { searchPatients, fetchPatientById, type PatientSummary } from '../../lib/medicalRecordsService'
import { queueService, type RecentQueuedPatient } from '../../lib/queueService'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface PatientLookupProps {
    onSelect: (patient: PatientSummary) => void
}

// ─── Recently Queued Section ──────────────────────────────────────────────────

function RecentQueueSection({ onSelect }: { onSelect: (patient: PatientSummary) => void }) {
    const [recentPatients, setRecentPatients] = useState<RecentQueuedPatient[]>([])
    const [isLoading, setIsLoading] = useState(true)
    // Track which item is being loaded (to show per-item spinner)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const loadRecent = useCallback(async () => {
        try {
            const data = await queueService.getRecentQueuedPatients()
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
            setRecentPatients(data)
        } catch (err) {
            console.error('[RecentQueueSection] load error:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadRecent()
        // Realtime: re-fetch whenever queue changes
        const unsub = queueService.subscribeToStaffQueue(() => loadRecent())
        return unsub
    }, [loadRecent])

    const handlePress = async (item: RecentQueuedPatient) => {
        if (!item.userId) return // Walk-in, no user record
        setLoadingId(item.ticketId)
        try {
            const patient = await fetchPatientById(item.userId)
            if (patient) {
                onSelect(patient)
            }
        } catch (err) {
            console.error('[RecentQueueSection] fetchPatient error:', err)
        } finally {
            setLoadingId(null)
        }
    }

    // Don't render the section at all while loading AND there's nothing yet
    if (isLoading && recentPatients.length === 0) {
        return (
            <View style={rq.sectionWrapper}>
                <View style={rq.sectionHeader}>
                    <View style={rq.sectionHeaderLeft}>
                        <Zap size={14} color="#0D9488" />
                        <Text style={rq.sectionTitle}>Recently Queued</Text>
                    </View>
                </View>
                <View style={rq.loadingRow}>
                    <ActivityIndicator size="small" color="#0D9488" />
                    <Text style={rq.loadingText}>Loading queue...</Text>
                </View>
            </View>
        )
    }

    // No active queue — render nothing (PatientLookup will show default search)
    if (recentPatients.length === 0) return null

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Serving':
                return { label: 'NOW SERVING', bg: '#ECFDF5', text: '#065F46', dot: '#10B981' }
            case 'Waiting':
                return { label: 'WAITING', bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6' }
            case 'Pending':
            default:
                return { label: 'PENDING', bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' }
        }
    }

    const getInitials = (first: string, last: string) =>
        `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'

    return (
        <View style={rq.sectionWrapper}>
            {/* Section Header */}
            <View style={rq.sectionHeader}>
                <View style={rq.sectionHeaderLeft}>
                    <Zap size={14} color="#0D9488" />
                    <Text style={rq.sectionTitle}>Recently Queued</Text>
                    <View style={rq.countBadge}>
                        <Text style={rq.countBadgeText}>{recentPatients.length}</Text>
                    </View>
                </View>
                <Text style={rq.sectionSub}>Active queue patients</Text>
            </View>

            {/* Queue Items */}
            <View style={rq.itemList}>
                {recentPatients.map((item, index) => {
                    const cfg = getStatusConfig(item.status as string)
                    const isItemLoading = loadingId === item.ticketId
                    const isWalkin = !item.userId

                    return (
                        <TouchableOpacity
                            key={item.ticketId}
                            style={[
                                rq.queueItem,
                                index === recentPatients.length - 1 && rq.queueItemLast,
                                isWalkin && rq.queueItemWalkin,
                            ]}
                            onPress={() => handlePress(item)}
                            activeOpacity={isWalkin ? 1 : 0.7}
                            disabled={isWalkin || isItemLoading}
                        >
                            {/* Queue number badge */}
                            <View style={rq.queueBadge}>
                                <Text style={rq.queueBadgeText}>#{item.queueNumber}</Text>
                            </View>

                            {/* Avatar */}
                            <View style={rq.avatar}>
                                <Text style={rq.avatarText}>
                                    {getInitials(item.patientFirstName, item.patientLastName)}
                                </Text>
                            </View>

                            {/* Info */}
                            <View style={rq.itemInfo}>
                                <Text style={rq.itemName} numberOfLines={1}>
                                    {item.patientName}
                                </Text>
                                {isWalkin && (
                                    <Text style={rq.walkinLabel}>Walk-in · No profile</Text>
                                )}
                            </View>

                            {/* Status chip */}
                            <View style={[rq.statusChip, { backgroundColor: cfg.bg }]}>
                                <View style={[rq.statusDot, { backgroundColor: cfg.dot }]} />
                                <Text style={[rq.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                            </View>

                            {/* Chevron or spinner */}
                            {isItemLoading ? (
                                <ActivityIndicator size="small" color="#0D9488" />
                            ) : !isWalkin ? (
                                <ChevronRight size={15} color="#D1D5DB" />
                            ) : null}
                        </TouchableOpacity>
                    )
                })}
            </View>

            {/* Divider */}
            <View style={rq.divider}>
                <View style={rq.dividerLine} />
                <Text style={rq.dividerLabel}>All Patients</Text>
                <View style={rq.dividerLine} />
            </View>
        </View>
    )
}

// ─── Patient Lookup ───────────────────────────────────────────────────────────

export function PatientLookup({ onSelect }: PatientLookupProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [patients, setPatients] = useState<PatientSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadPatients(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const loadPatients = useCallback(async (query: string) => {
        setIsLoading(true)
        setError(null)
        try {
            const results = await searchPatients(query)
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
            setPatients(results)
        } catch (err) {
            console.error('[PatientLookup] search error:', err)
            setError('Failed to load patients. Check your connection.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleToggleScan = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setIsScanning((prev) => !prev)
    }

    const getInitials = (first: string, last: string) =>
        `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })
        } catch {
            return iso
        }
    }

    const renderPatient = ({ item }: { item: PatientSummary }) => (
        <TouchableOpacity
            onPress={() => onSelect(item)}
            style={styles.patientRow}
            activeOpacity={0.7}
        >
            {/* Avatar */}
            {item.profile_picture_url ? (
                <Image
                    source={{ uri: item.profile_picture_url }}
                    style={styles.avatarImage}
                />
            ) : (
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>
                        {getInitials(item.first_name, item.last_name)}
                    </Text>
                </View>
            )}

            {/* Info */}
            <View style={styles.patientInfo}>
                <Text style={styles.patientName}>
                    {item.first_name} {item.last_name}
                </Text>
                <Text style={styles.patientMeta} numberOfLines={1}>
                    {item.blood_type ? `Blood: ${item.blood_type} · ` : ''}
                    Joined {formatDate(item.created_at)}
                </Text>
            </View>

            {/* Stats chips */}
            {(item.height || item.weight) && (
                <View style={styles.statChips}>
                    {item.height && (
                        <View style={styles.statChip}>
                            <Text style={styles.statChipText}>{item.height}cm</Text>
                        </View>
                    )}
                    {item.weight && (
                        <View style={styles.statChip}>
                            <Text style={styles.statChipText}>{item.weight}kg</Text>
                        </View>
                    )}
                </View>
            )}

            <ChevronRight size={16} color="#D1D5DB" />
        </TouchableOpacity>
    )

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Patient Lookup</Text>

                {/* Search row */}
                <View style={styles.searchRow}>
                    <View style={styles.searchInputWrapper}>
                        <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                        <TextInput
                            placeholder="Search by name or email..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <View style={styles.clearBtn}>
                                    <Text style={styles.clearBtnText}>✕</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={handleToggleScan}
                        style={[styles.qrButton, isScanning && styles.qrButtonActive]}
                        activeOpacity={0.7}
                    >
                        <QrCode size={20} color={isScanning ? '#0D9488' : '#4B5563'} />
                    </TouchableOpacity>
                </View>

                {/* QR Scanner placeholder */}
                {isScanning && (
                    <View style={styles.scannerBox}>
                        <View style={styles.scannerFrame}>
                            <View style={styles.scannerPulse} />
                            <QrCode size={64} color="#14B8A6" />
                        </View>
                        <Text style={styles.scannerHint}>Point camera at patient QR code</Text>
                    </View>
                )}
            </View>

            {/* Content — FlatList with ListHeaderComponent for queue section */}
            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0D9488" />
                    <Text style={styles.loadingText}>Loading patients...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        onPress={() => loadPatients(searchQuery)}
                        style={styles.retryButton}
                    >
                        <RefreshCcw size={14} color="#0D9488" />
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={patients}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPatient}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <>
                            {/* Recently Queued — only shown when no active search */}
                            {!searchQuery && (
                                <RecentQueueSection onSelect={onSelect} />
                            )}
                            <Text style={styles.sectionLabel}>
                                {searchQuery
                                    ? `${patients.length} result(s) for "${searchQuery}"`
                                    : 'All Patients'}
                            </Text>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <User size={40} color="#E5E7EB" />
                            <Text style={styles.emptyTitle}>No patients found</Text>
                            <Text style={styles.emptyText}>
                                {searchQuery
                                    ? 'Try a different name or email.'
                                    : 'No registered patients yet.'}
                            </Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    )
}

// ─── Recently Queued Styles ───────────────────────────────────────────────────
const rq = StyleSheet.create({
    sectionWrapper: {
        marginBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0D9488',
        letterSpacing: 0.3,
    },
    sectionSub: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    countBadge: {
        backgroundColor: '#CCFBF1',
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#99F6E4',
    },
    countBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0D9488',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    loadingText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    itemList: {
        backgroundColor: '#F8FFFE',
        borderWidth: 1.5,
        borderColor: '#CCFBF1',
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 16,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E6FDF9',
    },
    queueItemLast: {
        borderBottomWidth: 0,
    },
    queueItemWalkin: {
        opacity: 0.6,
    },
    queueBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
    },
    queueBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0D9488',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    walkinLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 1,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#F3F4F6',
    },
    dividerLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
})

// ─── Patient Lookup Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },

    // Header
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },

    // Search row
    searchRow: {
        flexDirection: 'row',
        gap: 10,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },
    clearBtn: {
        padding: 4,
    },
    clearBtnText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    qrButton: {
        width: 52,
        height: 52,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrButtonActive: {
        backgroundColor: '#F0FDFA',
        borderColor: '#0D9488',
    },

    // QR scanner
    scannerBox: {
        backgroundColor: '#111827',
        borderRadius: 20,
        paddingVertical: 32,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        overflow: 'hidden',
    },
    scannerFrame: {
        width: 140,
        height: 140,
        borderWidth: 2,
        borderColor: '#0D9488',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    scannerPulse: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13, 148, 136, 0.15)',
    },
    scannerHint: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },

    // List
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginTop: 4,
    },

    // Patient row
    patientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 10,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0D9488',
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    patientMeta: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    statChips: {
        flexDirection: 'row',
        gap: 4,
        marginRight: 4,
    },
    statChip: {
        backgroundColor: '#F0FDFA',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    statChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0D9488',
    },

    // States
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
    },
    loadingText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDFA',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    retryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0D9488',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
    },
    emptyText: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
    },
})