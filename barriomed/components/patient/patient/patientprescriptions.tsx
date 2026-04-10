import React, { useState, useEffect, useCallback } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native'
import { Pill, ChevronDown, ChevronUp, Clock, User, RefreshCcw } from 'lucide-react-native'
import { fetchPrescriptionsForPatient, type Prescription, type PrescriptionMedication } from '../../../backend/lib/medicalRecordsService'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface PatientPrescriptionsProps {
    patientId: string
}

export function PatientPrescriptions({ patientId }: PatientPrescriptionsProps) {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const load = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await fetchPrescriptionsForPatient(patientId)
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
            setPrescriptions(data)
        } catch (err) {
            setError('Failed to load prescriptions. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [patientId])

    useEffect(() => { load() }, [load])

    const handleToggle = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setExpandedId(expandedId === id ? null : id)
    }

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            })
        } catch {
            return iso
        }
    }

    const stockColor = (status: string): string => {
        if (status === 'AVAILABLE') return '#059669'
        if (status === 'LOW') return '#D97706'
        return '#DC2626'
    }

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0D9488" />
                <Text style={styles.loadingText}>Loading prescriptions…</Text>
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={load} style={styles.retryButton}>
                    <RefreshCcw size={14} color="#0D9488" />
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Pill size={20} color="#0D9488" />
                <Text style={styles.title}>My Prescriptions</Text>
                {prescriptions.length > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{prescriptions.length}</Text>
                    </View>
                )}
                <TouchableOpacity onPress={load} style={styles.refreshButton}>
                    <RefreshCcw size={14} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {prescriptions.length === 0 ? (
                <View style={styles.emptyState}>
                    <Pill size={48} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>No Prescriptions</Text>
                    <Text style={styles.emptyText}>
                        You don't have any prescriptions yet. Your doctor will add them here after a consultation.
                    </Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {prescriptions.map((rx) => (
                        <View key={rx.id} style={styles.rxCard}>
                            {/* Card header */}
                            <TouchableOpacity
                                onPress={() => handleToggle(rx.id)}
                                style={styles.rxHeader}
                                activeOpacity={0.7}
                            >
                                <View style={styles.rxHeaderLeft}>
                                    <View style={styles.rxIconWrapper}>
                                        <Pill size={18} color="#0D9488" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.rxMeta}>
                                            <Clock size={11} color="#9CA3AF" />
                                            <Text style={styles.rxDate}>{formatDate(rx.created_at)}</Text>
                                        </View>
                                        <View style={styles.rxMeta}>
                                            <User size={11} color="#9CA3AF" />
                                            <Text style={styles.rxDoctor} numberOfLines={1}>
                                                {rx.doctor_name ?? 'Unknown Doctor'}
                                            </Text>
                                        </View>
                                        <Text style={styles.rxMedCount}>
                                            {rx.medications.length} medication(s)
                                        </Text>
                                    </View>
                                </View>
                                {expandedId === rx.id ? (
                                    <ChevronUp size={16} color="#9CA3AF" />
                                ) : (
                                    <ChevronDown size={16} color="#9CA3AF" />
                                )}
                            </TouchableOpacity>

                            {/* Expanded medications */}
                            {expandedId === rx.id && (
                                <View style={styles.rxBody}>
                                    {rx.medications.map((med: PrescriptionMedication, idx: number) => (
                                        <View key={idx} style={styles.medRow}>
                                            <View style={styles.medBullet} />
                                            <View style={styles.medInfo}>
                                                <Text style={styles.medName}>{med.name}</Text>
                                                <View style={styles.medDetails}>
                                                    {med.dosage && (
                                                        <View style={styles.medChip}>
                                                            <Text style={styles.medChipText}>{med.dosage}</Text>
                                                        </View>
                                                    )}
                                                    {med.frequency && (
                                                        <View style={styles.medChip}>
                                                            <Text style={styles.medChipText}>{med.frequency}</Text>
                                                        </View>
                                                    )}
                                                    {med.duration && (
                                                        <View style={styles.medChip}>
                                                            <Text style={styles.medChipText}>{med.duration}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    ))}

                                    {/* Instructions */}
                                    {!!rx.instructions && (
                                        <View style={styles.instructionsBox}>
                                            <Text style={styles.instructionsLabel}>INSTRUCTIONS</Text>
                                            <Text style={styles.instructionsText}>{rx.instructions}</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
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

    // Header
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.3,
        flex: 1,
    },
    countBadge: {
        backgroundColor: '#CCFBF1',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0D9488',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#374151',
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },

    // List
    list: {
        gap: 12,
        paddingBottom: 24,
    },

    // Prescription card
    rxCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    rxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    rxHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        flex: 1,
    },
    rxIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F0FDFA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    rxMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 2,
    },
    rxDate: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    rxDoctor: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
        flex: 1,
    },
    rxMedCount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        marginTop: 4,
    },

    // Body
    rxBody: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        backgroundColor: '#F9FAFB',
        padding: 16,
        gap: 12,
    },

    // Medicine row
    medRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    medBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0D9488',
        marginTop: 6,
    },
    medInfo: {
        flex: 1,
    },
    medName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 6,
    },
    medDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    medChip: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    medChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },

    // Instructions
    instructionsBox: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginTop: 4,
    },
    instructionsLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#9CA3AF',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    instructionsText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
})
