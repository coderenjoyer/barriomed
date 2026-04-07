import React, { useState } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native'
import { Calendar, User, ChevronDown, ChevronUp, FileText, Pill, Trash2 } from 'lucide-react-native'
import type { ConsultationRecord } from '../../lib/medicalRecordsService'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface ConsultationHistoryProps {
    history: ConsultationRecord[]
    /** If true, shows patient name rather than doctor name (doctor's own history view) */
    showPatientName?: boolean
    /** Optional delete handler. When provided, a delete button appears on each record. */
    onDelete?: (record: ConsultationRecord) => void
}

export function ConsultationHistory({ history, showPatientName = false, onDelete }: ConsultationHistoryProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const handleToggle = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setExpandedId(expandedId === id ? null : id)
    }

    const formatTimestamp = (ts: string) => {
        try {
            return new Date(ts).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })
        } catch {
            return ts
        }
    }

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <FileText size={20} color="#0D9488" />
                <Text style={styles.title}>Consultation History</Text>
                {history.length > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{history.length}</Text>
                    </View>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {history.length === 0 ? (
                    <View style={styles.emptyState}>
                        <FileText size={36} color="#E5E7EB" />
                        <Text style={styles.emptyTitle}>No consultations yet</Text>
                        <Text style={styles.emptyText}>No previous consultation records.</Text>
                    </View>
                ) : (
                    history.map((record, index) => (
                        <View key={record.id} style={styles.timelineItem}>
                            {/* Timeline line */}
                            {index !== history.length - 1 && (
                                <View style={styles.timelineLine} />
                            )}

                            {/* Timeline dot */}
                            <View style={styles.timelineDotWrapper}>
                                <View style={styles.timelineDotInner} />
                            </View>

                            {/* Card */}
                            <View style={styles.recordCard}>
                                <TouchableOpacity
                                    onPress={() => handleToggle(record.id)}
                                    style={styles.recordHeader}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.recordMeta}>
                                        <View style={styles.metaRow}>
                                            <Calendar size={12} color="#9CA3AF" />
                                            <Text style={styles.metaText}>{formatTimestamp(record.timestamp)}</Text>
                                            <Text style={styles.metaDot}>•</Text>
                                            <User size={12} color="#9CA3AF" />
                                            <Text style={styles.metaText} numberOfLines={1}>
                                                {showPatientName
                                                    ? (record.patient_name ?? 'Unknown Patient')
                                                    : (record.doctor_name ?? 'Unknown Doctor')}
                                            </Text>
                                        </View>
                                        <Text style={styles.diagnosis}>{record.diagnosis}</Text>
                                        {record.prescription_id && (
                                            <View style={styles.prescriptionBadge}>
                                                <Pill size={10} color="#0D9488" />
                                                <Text style={styles.prescriptionBadgeText}>Prescription attached</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.recordActions}>
                                        {onDelete && (
                                            <TouchableOpacity
                                                onPress={() => onDelete(record)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                style={styles.deleteButton}
                                            >
                                                <Trash2 size={14} color="#EF4444" />
                                            </TouchableOpacity>
                                        )}
                                        {expandedId === record.id ? (
                                            <ChevronUp size={16} color="#9CA3AF" />
                                        ) : (
                                            <ChevronDown size={16} color="#9CA3AF" />
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Expanded notes */}
                                {expandedId === record.id && (
                                    <View style={styles.notesContainer}>
                                        <Text style={styles.notesLabel}>NOTES</Text>
                                        <Text style={styles.notesText}>
                                            {record.notes || 'No notes recorded for this consultation.'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        flex: 1,
    },

    // Header
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
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

    scrollContent: {
        paddingBottom: 8,
    },

    // Timeline
    timelineItem: {
        paddingLeft: 32,
        marginBottom: 20,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: 11,
        top: 28,
        bottom: -20,
        width: 2,
        backgroundColor: '#F3F4F6',
    },
    timelineDotWrapper: {
        position: 'absolute',
        left: 0,
        top: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#CCFBF1',
        borderWidth: 2,
        borderColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    timelineDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0D9488',
    },

    // Record card
    recordCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    recordHeader: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    recordMeta: {
        flex: 1,
        marginRight: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    metaText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    metaDot: {
        fontSize: 12,
        color: '#D1D5DB',
        marginHorizontal: 2,
    },
    diagnosis: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 6,
    },
    prescriptionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F0FDFA',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    prescriptionBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#0D9488',
    },

    // Record actions row (chevron + optional delete)
    recordActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    deleteButton: {
        padding: 4,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Expanded notes
    notesContainer: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#ffffff',
        padding: 16,
    },
    notesLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#9CA3AF',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    notesText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
    },

    // Empty state
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
        fontSize: 14,
        color: '#9CA3AF',
    },
})