import React, { useState, useEffect, useCallback } from 'react'
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
} from 'react-native'
import { Search, QrCode, User, ChevronRight, RefreshCcw } from 'lucide-react-native'
import { searchPatients, type PatientSummary } from '../../lib/medicalRecordsService'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface PatientLookupProps {
    onSelect: (patient: PatientSummary) => void
}

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

            {/* Content */}
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
                        <Text style={styles.sectionLabel}>
                            {searchQuery ? `${patients.length} result(s) for "${searchQuery}"` : 'All Patients'}
                        </Text>
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