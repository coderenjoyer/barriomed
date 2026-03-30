import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchMedicalRecords, type MedicalRecord } from '../../../lib/medicalRecordsService';

// ─── Props ────────────────────────────────────────────────────────────────────
interface PatientMedicalRecordsProps {
    patientId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

// ─── Single record card (read-only) ──────────────────────────────────────────
function RecordCard({ record, index }: { record: MedicalRecord; index: number }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setExpanded((p) => !p)}
            style={styles.card}
        >
            {/* Header row */}
            <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                    <Feather name="file-text" size={16} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {record.title || 'Medical Record'}
                    </Text>
                    <Text style={styles.cardDate}>{formatDate(record.updated_at)}</Text>
                </View>
                <Feather
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#9CA3AF"
                />
            </View>

            {/* Diagnosis pill */}
            {!!record.diagnosis && (
                <View style={styles.diagnosisPill}>
                    <Feather name="activity" size={11} color="#0D9488" />
                    <Text style={styles.diagnosisText}>{record.diagnosis}</Text>
                </View>
            )}

            {/* Notes (expanded) */}
            {expanded && !!record.description && (
                <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>NOTES</Text>
                    <Text style={styles.notesText}>{record.description}</Text>
                </View>
            )}

            {/* Read-only badge */}
            <View style={styles.readOnlyBadge}>
                <Feather name="lock" size={9} color="#9CA3AF" />
                <Text style={styles.readOnlyText}>View only</Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PatientMedicalRecords({ patientId }: PatientMedicalRecordsProps) {
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchMedicalRecords(patientId);
            setRecords(data);
        } catch (e: any) {
            setError('Could not load medical records.');
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <View style={styles.container}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                    <View style={styles.sectionIconWrap}>
                        <Feather name="file-text" size={18} color="#0D9488" />
                    </View>
                    <Text style={styles.sectionTitle}>Medical Records</Text>
                    {records.length > 0 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{records.length}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={load} style={styles.refreshBtn} activeOpacity={0.7}>
                    <Feather name="refresh-cw" size={14} color="#0D9488" />
                </TouchableOpacity>
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
                <Feather name="info" size={13} color="#3B82F6" />
                <Text style={styles.infoBannerText}>
                    These records are managed by your doctor. Contact the clinic to request changes.
                </Text>
            </View>

            {/* Content */}
            {isLoading ? (
                <ActivityIndicator
                    color="#0D9488"
                    style={{ paddingVertical: 40 }}
                />
            ) : error ? (
                <View style={styles.emptyState}>
                    <Feather name="alert-circle" size={32} color="#FCA5A5" />
                    <Text style={styles.emptyTitle}>Unable to Load</Text>
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity onPress={load} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : records.length === 0 ? (
                <View style={styles.emptyState}>
                    <Feather name="file-text" size={40} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>No Records Yet</Text>
                    <Text style={styles.emptyText}>
                        Your medical records will appear here once your doctor adds them.
                    </Text>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {records.map((record, index) => (
                        <RecordCard key={record.id} record={record} index={index} />
                    ))}
                </View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F0FDFA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#111827',
    },
    countBadge: {
        backgroundColor: '#CCFBF1',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0D9488',
    },
    refreshBtn: {
        padding: 8,
        backgroundColor: '#F0FDFA',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        marginBottom: 16,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 12,
        color: '#1D4ED8',
        lineHeight: 17,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 8,
    },
    emptyText: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#0D9488',
        borderRadius: 12,
    },
    retryBtnText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    listContainer: {
        gap: 12,
    },

    // Card
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 11,
        backgroundColor: '#F0FDFA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    cardDate: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    diagnosisPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDFA',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    diagnosisText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0D9488',
    },
    notesContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    notesLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#9CA3AF',
        letterSpacing: 1,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 20,
    },
    readOnlyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-end',
    },
    readOnlyText: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500',
    },
});
