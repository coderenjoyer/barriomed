import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native'
import { Save, Stethoscope, CheckCircle } from 'lucide-react-native'
import {
    createConsultation,
    createPrescription,
    type PrescriptionMedication,
} from '../../lib/medicalRecordsService'

interface ConsultationFormProps {
    patientId: string
    doctorId: string
    /** Optional list of medications to attach to this consultation as a prescription */
    prescriptionItems?: PrescriptionMedication[]
    onSaved?: (consultationId: string) => void
}

const CONDITIONS = ['URTI', 'Hypertension', 'Diabetes', 'Gastroenteritis', 'Dengue', 'Asthma', 'UTI', 'Anemia']

export function ConsultationForm({ patientId, doctorId, prescriptionItems = [], onSaved }: ConsultationFormProps) {
    const [soap, setSoap] = useState({
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
    })
    const [instructions, setInstructions] = useState('')
    const [isSaving, setIsSaving]   = useState(false)
    const [savedOk, setSavedOk]     = useState(false)

    const handleChange = (field: keyof typeof soap, value: string) => {
        setSoap((prev) => ({ ...prev, [field]: value }))
    }

    const notesText = [
        soap.subjective && `S: ${soap.subjective}`,
        soap.objective  && `O: ${soap.objective}`,
        soap.plan       && `P: ${soap.plan}`,
    ].filter(Boolean).join('\n\n')

    const handleSave = async () => {
        if (!soap.assessment.trim()) {
            Alert.alert('Assessment Required', 'Please enter a diagnosis / assessment before saving.')
            return
        }

        setIsSaving(true)
        try {
            // If medicines were prescribed, save a prescription first
            let prescriptionId: string | null = null
            if (prescriptionItems.length > 0) {
                const presResult = await createPrescription({
                    patient_id: patientId,
                    doctor_id: doctorId,
                    medications: prescriptionItems,
                    instructions: instructions.trim(),
                })
                if (presResult.success && presResult.data) {
                    prescriptionId = presResult.data.id
                }
            }

            // Save the consultation record
            const result = await createConsultation({
                patient_id: patientId,
                doctor_id: doctorId,
                notes: notesText,
                diagnosis: soap.assessment.trim(),
                prescription_id: prescriptionId,
            })

            if (!result.success) {
                Alert.alert('Save Failed', result.error ?? 'Could not save consultation.')
                return
            }

            // Reset form
            setSoap({ subjective: '', objective: '', assessment: '', plan: '' })
            setInstructions('')
            setSavedOk(true)
            setTimeout(() => setSavedOk(false), 3000)

            onSaved?.(result.data!.id)
        } catch (err: any) {
            Alert.alert('Error', err.message ?? 'An unexpected error occurred.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitle}>
                        <Stethoscope size={20} color="#0D9488" />
                        <Text style={styles.title}>Digital Diagnosis (SOAP)</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                        activeOpacity={0.8}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : savedOk ? (
                            <CheckCircle size={16} color="#fff" />
                        ) : (
                            <Save size={16} color="#fff" />
                        )}
                        <Text style={styles.saveButtonText}>
                            {isSaving ? 'Saving…' : savedOk ? 'Saved!' : 'Save Consultation'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Success banner */}
                {savedOk && (
                    <View style={styles.successBanner}>
                        <CheckCircle size={16} color="#059669" />
                        <Text style={styles.successText}>
                            Consultation saved successfully and added to patient history.
                        </Text>
                    </View>
                )}

                {/* Subjective */}
                <View style={styles.section}>
                    <View style={styles.labelRow}>
                        <View style={[styles.badge, styles.badgeBlue]}>
                            <Text style={[styles.badgeText, styles.badgeTextBlue]}>S</Text>
                        </View>
                        <Text style={styles.label}>Subjective (Complaints)</Text>
                    </View>
                    <TextInput
                        value={soap.subjective}
                        onChangeText={(val) => handleChange('subjective', val)}
                        placeholder="Patient's chief complaint, history of present illness..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Objective */}
                <View style={styles.section}>
                    <View style={styles.labelRow}>
                        <View style={[styles.badge, styles.badgeEmerald]}>
                            <Text style={[styles.badgeText, styles.badgeTextEmerald]}>O</Text>
                        </View>
                        <Text style={styles.label}>Objective (Findings)</Text>
                    </View>
                    <TextInput
                        value={soap.objective}
                        onChangeText={(val) => handleChange('objective', val)}
                        placeholder="Physical exam findings, vital signs, lab results..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Assessment */}
                <View style={styles.section}>
                    <View style={styles.labelRow}>
                        <View style={[styles.badge, styles.badgeAmber]}>
                            <Text style={[styles.badgeText, styles.badgeTextAmber]}>A</Text>
                        </View>
                        <Text style={styles.label}>Assessment (Diagnosis) <Text style={styles.required}>*</Text></Text>
                    </View>
                    <TextInput
                        value={soap.assessment}
                        onChangeText={(val) => handleChange('assessment', val)}
                        placeholder="Primary diagnosis (e.g. Acute Upper Respiratory Infection)"
                        placeholderTextColor="#9CA3AF"
                        style={styles.input}
                    />
                    {/* Quick-fill chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.conditionScroll}
                    >
                        {CONDITIONS.map((c) => (
                            <TouchableOpacity
                                key={c}
                                onPress={() => handleChange('assessment', c)}
                                style={[styles.conditionButton, soap.assessment === c && styles.conditionButtonActive]}
                            >
                                <Text style={[styles.conditionButtonText, soap.assessment === c && styles.conditionButtonTextActive]}>
                                    {c}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Plan */}
                <View style={styles.section}>
                    <View style={styles.labelRow}>
                        <View style={[styles.badge, styles.badgePurple]}>
                            <Text style={[styles.badgeText, styles.badgeTextPurple]}>P</Text>
                        </View>
                        <Text style={styles.label}>Plan (Treatment)</Text>
                    </View>
                    <TextInput
                        value={soap.plan}
                        onChangeText={(val) => handleChange('plan', val)}
                        placeholder="Medications, lifestyle changes, follow-up instructions..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Prescription instructions (only if medicines exist) */}
                {prescriptionItems.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.labelRow}>
                            <View style={[styles.badge, styles.badgeRose]}>
                                <Text style={[styles.badgeText, styles.badgeTextRose]}>Rx</Text>
                            </View>
                            <Text style={styles.label}>Prescription Instructions</Text>
                        </View>
                        <TextInput
                            value={instructions}
                            onChangeText={setInstructions}
                            placeholder="General instructions for the prescription (e.g. take with food)..."
                            placeholderTextColor="#9CA3AF"
                            style={styles.textArea}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        <View style={styles.medicationsSummary}>
                            <Text style={styles.medicationsSummaryLabel}>
                                {prescriptionItems.length} medication(s) will be attached
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: 'transparent',
    },
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
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.3,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0D9488',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },

    // Success banner
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
    },
    successText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#059669',
    },

    // Sections
    section: {
        marginBottom: 24,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    required: {
        color: '#EF4444',
    },

    // Badges
    badge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    badgeBlue: { backgroundColor: '#DBEAFE' },
    badgeTextBlue: { color: '#2563EB' },
    badgeEmerald: { backgroundColor: '#D1FAE5' },
    badgeTextEmerald: { color: '#059669' },
    badgeAmber: { backgroundColor: '#FEF3C7' },
    badgeTextAmber: { color: '#D97706' },
    badgePurple: { backgroundColor: '#EDE9FE' },
    badgeTextPurple: { color: '#7C3AED' },
    badgeRose: { backgroundColor: '#FFE4E6' },
    badgeTextRose: { color: '#E11D48', fontSize: 10 },

    // Inputs
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    textArea: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 14,
        color: '#111827',
        minHeight: 100,
    },

    // Condition chips
    conditionScroll: {
        marginTop: 10,
    },
    conditionButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
    },
    conditionButtonActive: {
        backgroundColor: '#CCFBF1',
        borderColor: '#0D9488',
    },
    conditionButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
    },
    conditionButtonTextActive: {
        color: '#0D9488',
    },

    // Prescription medications summary
    medicationsSummary: {
        marginTop: 8,
        backgroundColor: '#F0FDFA',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    medicationsSummaryLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0D9488',
    },
})