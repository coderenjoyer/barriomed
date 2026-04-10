import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PatientLookup } from '../doctor/patientsearch';
import { ConsultationHistory } from '../doctor/consultationhistory';
import { ConsultationForm } from '../doctor/consultationform';
import { PrescriptionBuilder } from '../doctor/patientprescription';
import { DoctorQueuePanel } from '../doctor/doctorqueuepanel';
import { DoctorChatMain } from '../doctor/doctorchat/DoctorChatMain';
import { useAuth } from '../../backend/lib/AuthContext';
import { queueService } from '../../backend/lib/queueService';
import {
    fetchPatientById,
    fetchConsultationsForPatient,
    fetchMedicalRecords,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    deleteConsultation,
    deletePrescription,
    crossPlatformConfirm,
    type PatientSummary,
    type ConsultationRecord,
    type MedicalRecord,
    type PrescriptionMedication,
} from '../../backend/lib/medicalRecordsService';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ServingPatient {
    queueNumber: number;
    name: string;
    service: string;
}

// ─── Hook: live currently-served patient ─────────────────────────────────────
function useCurrentServing() {
    const [serving, setServing] = useState<ServingPatient | null>(null);
    const [waitingCount, setWaitingCount] = useState<number>(0);

    const fetchServing = useCallback(async () => {
        try {
            const data = await queueService.getQueueList();
            const servingRow = data.find((r: any) => r.status === 'Serving');
            const waiting    = data.filter((r: any) => r.status === 'Waiting' || r.status === 'Pending');
            setWaitingCount(waiting.length);
            if (servingRow) {
                setServing({
                    queueNumber: servingRow.queue_number,
                    name: servingRow.patient_name || 'Patient',
                    service: servingRow.service_type,
                });
            } else {
                setServing(null);
            }
        } catch { /* silently ignore */ }
    }, []);

    useEffect(() => {
        fetchServing();
        const unsub = queueService.subscribeToStaffQueue(fetchServing);
        return unsub;
    }, [fetchServing]);

    return { serving, waitingCount };
}

// ─── Tab type ────────────────────────────────────────────────────────────────
type ActiveTab = 'patients' | 'queue' | 'chat';

// ─── Patient detail sub-tab ──────────────────────────────────────────────────
type PatientTab = 'overview' | 'history' | 'prescribe';

// ─── Component ───────────────────────────────────────────────────────────────
export function DoctorDashboard({ onLogout }: { onLogout: () => void }) {
    const { userProfile, session } = useAuth();
    const { serving, waitingCount } = useCurrentServing();

    const firstName   = userProfile?.first_name ?? session?.user?.user_metadata?.first_name ?? '';
    const lastName    = userProfile?.last_name  ?? session?.user?.user_metadata?.last_name  ?? '';
    const fullName    = [firstName, lastName].filter(Boolean).join(' ') || 'Doctor';
    const doctorLabel = fullName ? `Dr. ${fullName}` : 'Doctor';
    const doctorId    = userProfile?.id ?? session?.user?.id ?? '';

    // ── Navigation state ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab]                     = useState<ActiveTab>('patients');
    const [selectedPatient, setSelectedPatient]         = useState<PatientSummary | null>(null);
    const [patientTab, setPatientTab]                   = useState<PatientTab>('overview');

    // ── Patient data ──────────────────────────────────────────────────────────
    const [consultations, setConsultations]     = useState<ConsultationRecord[]>([]);
    const [medicalRecords, setMedicalRecords]   = useState<MedicalRecord[]>([]);
    const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionMedication[]>([]);
    const [isDataLoading, setIsDataLoading]     = useState(false);

    // For medical record inline editing
    const [editingRecord, setEditingRecord]   = useState<MedicalRecord | null>(null);
    const [isRecordSaving, setIsRecordSaving] = useState(false);

    // ── Load patient data ─────────────────────────────────────────────────────
    const loadPatientData = useCallback(async (patientId: string) => {
        setIsDataLoading(true);
        try {
            const [cons, records] = await Promise.all([
                fetchConsultationsForPatient(patientId),
                fetchMedicalRecords(patientId),
            ]);
            setConsultations(cons);
            setMedicalRecords(records);
        } catch (err) {
            console.error('[DoctorDashboard] loadPatientData error:', err);
        } finally {
            setIsDataLoading(false);
        }
    }, []);

    const handlePatientSelect = useCallback((patient: PatientSummary) => {
        setSelectedPatient(patient);
        setPatientTab('overview');
        setPrescriptionItems([]);
        loadPatientData(patient.id);
    }, [loadPatientData]);

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        if (tab !== 'patients') setSelectedPatient(null);
    };

    // ── Chat unread badge (simple dot) ────────────────────────────────────────
    // We intentionally keep this lightweight; real unread count is inside DoctorChatMain.


    const handleBack = () => {
        setSelectedPatient(null);
        setConsultations([]);
        setMedicalRecords([]);
        setPrescriptionItems([]);
        setEditingRecord(null);
    };

    // ── Medical Record handlers ───────────────────────────────────────────────
    const handleAddRecord = async () => {
        if (!selectedPatient) return;
        setIsRecordSaving(true);
        const result = await createMedicalRecord({
            patient_id: selectedPatient.id,
            doctor_id: doctorId,
            title: 'New Record',
            description: '',
            diagnosis: '',
        });
        setIsRecordSaving(false);
        if (result.success && result.data) {
            setMedicalRecords((prev) => [result.data!, ...prev]);
            setEditingRecord(result.data!);
        } else {
            Alert.alert('Error', result.error ?? 'Failed to create record.');
        }
    };

    const handleSaveRecord = async (record: MedicalRecord) => {
        setIsRecordSaving(true);
        const result = await updateMedicalRecord(record.id, doctorId, {
            title: record.title,
            description: record.description,
            diagnosis: record.diagnosis,
        });
        setIsRecordSaving(false);
        if (result.success && result.data) {
            setMedicalRecords((prev) =>
                prev.map((r) => (r.id === result.data!.id ? result.data! : r))
            );
            setEditingRecord(null);
        } else {
            Alert.alert('Error', result.error ?? 'Failed to save record.');
        }
    };

    const handleDeleteRecord = (record: MedicalRecord) => {
        crossPlatformConfirm(
            'Delete Record',
            `Delete "${record.title}"? This cannot be undone.`,
            async () => {
                const result = await deleteMedicalRecord(record.id);
                if (result.success) {
                    // Optimistic UI: remove immediately from local state
                    setMedicalRecords((prev) => prev.filter((r) => r.id !== record.id));
                } else {
                    if (Platform.OS === 'web') {
                        window.alert('Error: ' + (result.error ?? 'Failed to delete record.'));
                    } else {
                        Alert.alert('Error', result.error ?? 'Failed to delete record.');
                    }
                }
            },
        );
    };

    const handleDeleteConsultation = (record: ConsultationRecord) => {
        crossPlatformConfirm(
            'Delete Consultation',
            `Delete consultation "${record.diagnosis}"? This cannot be undone.`,
            async () => {
                const result = await deleteConsultation(record.id);
                if (result.success) {
                    // Optimistic UI: remove immediately from local state
                    setConsultations((prev) => prev.filter((c) => c.id !== record.id));
                } else {
                    if (Platform.OS === 'web') {
                        window.alert('Error: ' + (result.error ?? 'Failed to delete consultation.'));
                    } else {
                        Alert.alert('Error', result.error ?? 'Failed to delete consultation.');
                    }
                }
            },
        );
    };

    // ── Header ────────────────────────────────────────────────────────────────
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                {selectedPatient && activeTab === 'patients' && (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Feather name="arrow-left" size={18} color="#0D9488" />
                    </TouchableOpacity>
                )}
                <View>
                    <Text style={styles.greetingText}>{doctorLabel}</Text>
                    <Text style={styles.nameText}>
                        {selectedPatient
                            ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
                            : 'Doctor Dashboard'}
                    </Text>
                </View>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
                    <Feather name="log-out" size={18} color="#4B5563" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Feather name="bell" size={18} color="#4B5563" />
                </TouchableOpacity>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarInitial}>
                        <Text style={styles.avatarInitialText}>
                            {(firstName?.[0] || 'D').toUpperCase()}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    // ── Main Tab Bar ──────────────────────────────────────────────────────────
    const renderTabBar = () => (
        <View style={styles.tabBar}>
            <TouchableOpacity
                style={[styles.tabItem, activeTab === 'patients' && styles.tabItemActive]}
                onPress={() => handleTabChange('patients')}
                activeOpacity={0.8}
            >
                <Feather name="users" size={16} color={activeTab === 'patients' ? '#0D9488' : '#9CA3AF'} />
                <Text style={[styles.tabLabel, activeTab === 'patients' ? styles.tabLabelActive : styles.tabLabelInactive]}>
                    Patients
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tabItem, activeTab === 'queue' && styles.tabItemActive]}
                onPress={() => handleTabChange('queue')}
                activeOpacity={0.8}
            >
                <Feather name="list" size={16} color={activeTab === 'queue' ? '#0D9488' : '#9CA3AF'} />
                <Text style={[styles.tabLabel, activeTab === 'queue' ? styles.tabLabelActive : styles.tabLabelInactive]}>
                    Queue
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
                onPress={() => handleTabChange('chat')}
                activeOpacity={0.8}
            >
                <Feather name="message-circle" size={16} color={activeTab === 'chat' ? '#0D9488' : '#9CA3AF'} />
                <Text style={[styles.tabLabel, activeTab === 'chat' ? styles.tabLabelActive : styles.tabLabelInactive]}>
                    Chat
                </Text>
            </TouchableOpacity>
        </View>
    );

    // ── Patient Sub-Tab Bar ───────────────────────────────────────────────────
    const renderPatientTabBar = () => (
        <View style={styles.patientTabBar}>
            {(['overview', 'history', 'prescribe'] as PatientTab[]).map((tab) => {
                const labels: Record<PatientTab, string> = {
                    overview: 'Overview',
                    history: 'History',
                    prescribe: 'Prescribe',
                };
                const icons: Record<PatientTab, string> = {
                    overview: 'user',
                    history: 'clock',
                    prescribe: 'activity',
                };
                const isActive = patientTab === tab;
                return (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.patientTabItem, isActive && styles.patientTabItemActive]}
                        onPress={() => setPatientTab(tab)}
                        activeOpacity={0.7}
                    >
                        <Feather
                            name={icons[tab] as any}
                            size={13}
                            color={isActive ? '#0D9488' : '#9CA3AF'}
                        />
                        <Text style={[styles.patientTabLabel, isActive && styles.patientTabLabelActive]}>
                            {labels[tab]}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    // ── Patient Overview (vitals + medical records) ─────────────────────────
    const renderPatientOverview = () => {
        if (!selectedPatient) return null;
        const p = selectedPatient;

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>

                {/* Patient Info Card */}
                <View style={styles.patientInfoCard}>
                    <View style={styles.patientInfoHeader}>
                        <View style={styles.patientAvatar}>
                            <Text style={styles.patientAvatarText}>
                                {`${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.patientFullName}>{p.first_name} {p.last_name}</Text>
                            <Text style={styles.patientEmail}>{p.email}</Text>
                            <View style={styles.badgeRow}>
                                {p.blood_type && (
                                    <View style={styles.badgeRose}>
                                        <Text style={styles.badgeRoseText}>Type {p.blood_type}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Vitals grid */}
                    <View style={styles.vitalsGrid}>
                        <View style={styles.vitalCell}>
                            <Text style={styles.vitalLabel}>HEIGHT</Text>
                            <Text style={styles.vitalValue}>{p.height ? `${p.height} cm` : '—'}</Text>
                        </View>
                        <View style={[styles.vitalCell, styles.vitalCellDivider]}>
                            <Text style={styles.vitalLabel}>WEIGHT</Text>
                            <Text style={styles.vitalValue}>{p.weight ? `${p.weight} kg` : '—'}</Text>
                        </View>
                        <View style={[styles.vitalCell, styles.vitalCellDivider]}>
                            <Text style={styles.vitalLabel}>BMI</Text>
                            <Text style={styles.vitalValue}>{p.bmi ?? '—'}</Text>
                        </View>
                    </View>
                </View>

                {/* Medical Records */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                            <Feather name="file-text" size={16} color="#0D9488" />
                            <Text style={styles.sectionTitle}>Medical Records</Text>
                            {medicalRecords.length > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{medicalRecords.length}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={handleAddRecord}
                            style={styles.addRecordButton}
                            disabled={isRecordSaving}
                        >
                            {isRecordSaving
                                ? <ActivityIndicator size="small" color="#0D9488" />
                                : <Feather name="plus" size={14} color="#0D9488" />
                            }
                            <Text style={styles.addRecordButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {isDataLoading ? (
                        <ActivityIndicator color="#0D9488" style={{ paddingVertical: 24 }} />
                    ) : medicalRecords.length === 0 ? (
                        <View style={styles.emptyRecords}>
                            <Feather name="file-text" size={28} color="#E5E7EB" />
                            <Text style={styles.emptyRecordsText}>No medical records yet.</Text>
                        </View>
                    ) : (
                        medicalRecords.map((record) => {
                            const isEditing = editingRecord?.id === record.id;
                            return (
                                <View key={record.id} style={styles.recordCard}>
                                    {isEditing ? (
                                        <RecordEditor
                                            record={editingRecord!}
                                            onSave={handleSaveRecord}
                                            onCancel={() => setEditingRecord(null)}
                                            isSaving={isRecordSaving}
                                            onChange={setEditingRecord}
                                        />
                                    ) : (
                                        <RecordRow
                                            record={record}
                                            onEdit={() => setEditingRecord({ ...record })}
                                            onDelete={() => handleDeleteRecord(record)}
                                        />
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        );
    };

    // ── Prescribe tab ─────────────────────────────────────────────────────────
    const renderPrescribeTab = () => {
        if (!selectedPatient) return null;
        return (
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollPadding}
            >
                <View style={styles.sectionMargin}>
                    <PrescriptionBuilder onItemsChange={setPrescriptionItems} />
                </View>
                <View style={styles.sectionMargin}>
                    <ConsultationForm
                        patientId={selectedPatient.id}
                        doctorId={doctorId}
                        prescriptionItems={prescriptionItems}
                        onSaved={() => {
                            // Refresh consultation history after save
                            loadPatientData(selectedPatient.id);
                            setPrescriptionItems([]);
                            setPatientTab('history');
                        }}
                    />
                </View>
            </ScrollView>
        );
    };

    // ── Tab Content ───────────────────────────────────────────────────────────
    const renderContent = () => {
        if (activeTab === 'queue') {
            return <DoctorQueuePanel />;
        }

        if (activeTab === 'chat') {
            return <DoctorChatMain />;
        }

        // Patients tab — no patient selected
        if (!selectedPatient) {
            return <PatientLookup onSelect={handlePatientSelect} />;
        }

        // Patient selected
        return (
            <View style={{ flex: 1 }}>
                {renderPatientTabBar()}
                <View style={{ flex: 1 }}>
                    {patientTab === 'overview' && renderPatientOverview()}
                    {patientTab === 'history' && (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollPadding}
                        >
                            {isDataLoading ? (
                                <ActivityIndicator color="#0D9488" style={{ paddingVertical: 40 }} />
                            ) : (
                                <ConsultationHistory
                                    history={consultations}
                                    showPatientName={false}
                                    onDelete={handleDeleteConsultation}
                                />
                            )}
                        </ScrollView>
                    )}
                    {patientTab === 'prescribe' && renderPrescribeTab()}
                </View>
            </View>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Decorative Background Elements */}
            <View style={[styles.blurCircle, styles.blurCircleTop]} />
            <View style={[styles.blurCircle, styles.blurCircleBottom]} />

            <View style={{ flex: 1 }}>
                {renderHeader()}

                {/* ── Now Serving Banner ─────────────────────────────────── */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleTabChange('queue')}
                    style={[
                        styles.nowServingBanner,
                        serving ? styles.nowServingBannerActive : styles.nowServingBannerIdle,
                    ]}
                >
                    <View style={styles.nowServingBannerLeft}>
                        <View style={[
                            styles.nowServingDot,
                            { backgroundColor: serving ? '#10B981' : '#D1D5DB' },
                        ]} />
                        <View>
                            <Text style={[
                                styles.nowServingBannerLabel,
                                { color: serving ? '#065F46' : '#9CA3AF' },
                            ]}>
                                {serving ? 'NOW SERVING' : 'QUEUE IDLE'}
                            </Text>
                            <Text style={[
                                styles.nowServingBannerName,
                                { color: serving ? '#111827' : '#6B7280' },
                            ]} numberOfLines={1}>
                                {serving ? serving.name : 'No patient being served'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.nowServingBannerRight}>
                        {waitingCount > 0 && (
                            <View style={styles.waitingBadge}>
                                <Text style={styles.waitingBadgeText}>{waitingCount} waiting</Text>
                            </View>
                        )}
                        <View style={[
                            styles.queueNumberChip,
                            { backgroundColor: serving ? '#0D9488' : '#E5E7EB' },
                        ]}>
                            <Text style={[
                                styles.queueNumberChipText,
                                { color: serving ? '#FFFFFF' : '#9CA3AF' },
                            ]}>
                                {serving ? `#${serving.queueNumber}` : '#--'}
                            </Text>
                        </View>
                        <Feather name="chevron-right" size={14} color={serving ? '#0D9488' : '#D1D5DB'} />
                    </View>
                </TouchableOpacity>

                {renderTabBar()}
                <View style={styles.content}>
                    {renderContent()}
                </View>
            </View>
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecordRow({
    record,
    onEdit,
    onDelete,
}: {
    record: MedicalRecord;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return iso; }
    };

    return (
        <View style={row.container}>
            <View style={{ flex: 1 }}>
                <Text style={row.title}>{record.title}</Text>
                {!!record.diagnosis && (
                    <Text style={row.diagnosis}>{record.diagnosis}</Text>
                )}
                <Text style={row.date}>{formatDate(record.updated_at)}</Text>
            </View>
            <View style={row.actions}>
                <TouchableOpacity onPress={onEdit} style={row.editBtn}>
                    <Feather name="edit-2" size={13} color="#0D9488" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={row.deleteBtn}>
                    <Feather name="trash-2" size={13} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function RecordEditor({
    record,
    onChange,
    onSave,
    onCancel,
    isSaving,
}: {
    record: MedicalRecord;
    onChange: (r: MedicalRecord) => void;
    onSave: (r: MedicalRecord) => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    return (
        <View>
            <View style={editor.fieldGroup}>
                <Text style={editor.label}>Title</Text>
                <RecordInput
                    value={record.title}
                    onChange={(v) => onChange({ ...record, title: v })}
                    placeholder="Record title"
                />
            </View>
            <View style={editor.fieldGroup}>
                <Text style={editor.label}>Diagnosis</Text>
                <RecordInput
                    value={record.diagnosis}
                    onChange={(v) => onChange({ ...record, diagnosis: v })}
                    placeholder="Diagnosis"
                />
            </View>
            <View style={editor.fieldGroup}>
                <Text style={editor.label}>Notes / Description</Text>
                <RecordInput
                    value={record.description}
                    onChange={(v) => onChange({ ...record, description: v })}
                    placeholder="Additional notes…"
                    multiline
                />
            </View>
            <View style={editor.buttons}>
                <TouchableOpacity onPress={onCancel} style={editor.cancelBtn} disabled={isSaving}>
                    <Text style={editor.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onSave(record)}
                    style={[editor.saveBtn, isSaving && editor.saveBtnDisabled]}
                    disabled={isSaving}
                >
                    {isSaving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Feather name="check" size={14} color="#fff" />
                    }
                    <Text style={editor.saveText}>{isSaving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

import { TextInput } from 'react-native';

function RecordInput({
    value, onChange, placeholder, multiline,
}: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
    return (
        <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={[editor.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
            multiline={multiline}
        />
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backButton: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: '#F0FDFA', alignItems: 'center',
        justifyContent: 'center', borderWidth: 1, borderColor: '#CCFBF1',
    },
    greetingText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    nameText: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    iconButton: { padding: 10, borderRadius: 999, backgroundColor: '#F3F4F6' },
    avatarContainer: {
        width: 40, height: 40, borderRadius: 20,
        overflow: 'hidden', borderWidth: 2, borderColor: '#CCFBF1',
    },
    avatarInitial: {
        width: '100%', height: '100%',
        backgroundColor: '#0D9488', alignItems: 'center', justifyContent: 'center',
    },
    avatarInitialText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },

    // Now Serving Banner
    nowServingBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: 24, marginBottom: 12, borderRadius: 16,
        paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1,
    },
    nowServingBannerActive: { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' },
    nowServingBannerIdle: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
    nowServingBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    nowServingDot: { width: 9, height: 9, borderRadius: 5 },
    nowServingBannerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
    nowServingBannerName: { fontSize: 13, fontWeight: '700', marginTop: 1 },
    nowServingBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    waitingBadge: {
        backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
        borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
    },
    waitingBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
    queueNumberChip: {
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
        alignItems: 'center', justifyContent: 'center',
    },
    queueNumberChipText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

    // Main Tab Bar
    tabBar: {
        flexDirection: 'row', marginHorizontal: 24, marginBottom: 4,
        backgroundColor: '#F3F4F6', borderRadius: 14, padding: 4,
    },
    tabItem: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11,
    },
    tabItemActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    },
    tabLabel: { fontSize: 14, fontWeight: '600' },
    tabLabelActive: { color: '#0D9488' },
    tabLabelInactive: { color: '#9CA3AF' },

    // Patient Sub-Tab Bar
    patientTabBar: {
        flexDirection: 'row', marginHorizontal: 24, marginBottom: 4,
        backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3,
    },
    patientTabItem: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10,
    },
    patientTabItemActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    patientTabLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
    patientTabLabelActive: { color: '#0D9488' },

    // Content
    content: { flex: 1, marginTop: 8 },
    scrollPadding: { padding: 20, paddingBottom: 40 },
    sectionMargin: { marginTop: 16 },

    // Patient Info Card
    patientInfoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 16,
    },
    patientInfoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
    patientAvatar: {
        width: 56, height: 56, borderRadius: 18,
        backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center',
    },
    patientAvatarText: { fontSize: 20, fontWeight: '800', color: '#0D9488' },
    patientFullName: { fontSize: 20, fontWeight: '800', color: '#111827' },
    patientEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    badgeRose: {
        backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 10,
        paddingVertical: 4, borderWidth: 1, borderColor: '#FEE2E2',
    },
    badgeRoseText: { fontSize: 12, fontWeight: '700', color: '#991B1B' },
    vitalsGrid: {
        flexDirection: 'row', backgroundColor: '#F9FAFB',
        borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6',
    },
    vitalCell: { flex: 1, padding: 14, alignItems: 'center' },
    vitalCellDivider: { borderLeftWidth: 1, borderLeftColor: '#F3F4F6' },
    vitalLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 4 },
    vitalValue: { fontSize: 16, fontWeight: '800', color: '#111827' },

    // Medical Records Section
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 16,
    },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
    countBadge: {
        backgroundColor: '#CCFBF1', borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 2,
    },
    countBadgeText: { fontSize: 12, fontWeight: '800', color: '#0D9488' },
    addRecordButton: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#F0FDFA', paddingHorizontal: 12,
        paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#CCFBF1',
    },
    addRecordButtonText: { fontSize: 13, fontWeight: '700', color: '#0D9488' },
    emptyRecords: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyRecordsText: { fontSize: 14, color: '#9CA3AF' },
    recordCard: {
        borderRadius: 14, borderWidth: 1, borderColor: '#F3F4F6',
        padding: 14, marginBottom: 10, backgroundColor: '#F9FAFB',
    },

    // Decorative
    blurCircle: { position: 'absolute', borderRadius: 9999, opacity: 0.4 },
    blurCircleTop: { top: -100, right: -100, width: 300, height: 300, backgroundColor: '#CCFBF1' },
    blurCircleBottom: { bottom: -50, left: -50, width: 250, height: 250, backgroundColor: '#EFF6FF' },
});

// ── RecordRow styles
const row = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'flex-start' },
    title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
    diagnosis: { fontSize: 13, color: '#0D9488', fontWeight: '500', marginBottom: 2 },
    date: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
    actions: { flexDirection: 'row', gap: 8, marginLeft: 12 },
    editBtn: {
        padding: 8, backgroundColor: '#F0FDFA', borderRadius: 10,
        borderWidth: 1, borderColor: '#CCFBF1',
    },
    deleteBtn: {
        padding: 8, backgroundColor: '#FEF2F2', borderRadius: 10,
        borderWidth: 1, borderColor: '#FEE2E2',
    },
});

// ── RecordEditor styles
const editor = StyleSheet.create({
    fieldGroup: { marginBottom: 12 },
    label: { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6 },
    input: {
        backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#E5E7EB',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 14, color: '#111827', fontWeight: '500',
    },
    buttons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
    cancelBtn: {
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB',
    },
    cancelText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#0D9488', paddingHorizontal: 14,
        paddingVertical: 9, borderRadius: 10,
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
