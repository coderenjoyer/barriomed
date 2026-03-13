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
import { Calendar, User, ChevronDown, ChevronUp, FileText } from 'lucide-react-native'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

export interface ConsultationRecord {
    id: string
    date: string
    doctor: string
    diagnosis: string
    notes: string
}

interface ConsultationHistoryProps {
    history: ConsultationRecord[]
}

export function ConsultationHistory({ history }: ConsultationHistoryProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const handleToggle = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setExpandedId(expandedId === id ? null : id)
    }

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <FileText size={20} color="#0d9488" />
                <Text style={styles.title}>Consultation History</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {history.length === 0 ? (
                    <View style={styles.emptyState}>
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
                                            <Calendar size={12} color="#9ca3af" />
                                            <Text style={styles.metaText}>{record.date}</Text>
                                            <Text style={styles.metaDot}>•</Text>
                                            <User size={12} color="#9ca3af" />
                                            <Text style={styles.metaText}>{record.doctor}</Text>
                                        </View>
                                        <Text style={styles.diagnosis}>{record.diagnosis}</Text>
                                    </View>
                                    {expandedId === record.id ? (
                                        <ChevronUp size={16} color="#9ca3af" />
                                    ) : (
                                        <ChevronDown size={16} color="#9ca3af" />
                                    )}
                                </TouchableOpacity>

                                {/* Expanded notes */}
                                {expandedId === record.id && (
                                    <View style={styles.notesContainer}>
                                        <Text style={styles.notesText}>{record.notes}</Text>
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
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        flex: 1,
    },

    // Header
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
        marginLeft: 6,
    },

    scrollContent: {
        paddingBottom: 8,
    },

    // Timeline
    timelineItem: {
        paddingLeft: 28,
        marginBottom: 16,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: 11,
        top: 24,
        bottom: 0,
        width: 2,
        backgroundColor: '#f3f4f6',
    },
    timelineDotWrapper: {
        position: 'absolute',
        left: 0,
        top: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ccfbf1',
        borderWidth: 2,
        borderColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
        zIndex: 10,
    },
    timelineDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#14b8a6',
    },

    // Record card
    recordCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
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
        gap: 4,
        marginBottom: 4,
    },
    metaText: {
        fontSize: 11,
        color: '#6b7280',
        marginLeft: 2,
    },
    metaDot: {
        fontSize: 11,
        color: '#6b7280',
        marginHorizontal: 2,
    },
    diagnosis: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },

    // Expanded notes
    notesContainer: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#ffffff',
        padding: 16,
    },
    notesText: {
        fontSize: 13,
        color: '#4b5563',
        lineHeight: 20,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 13,
        color: '#9ca3af',
    },
})