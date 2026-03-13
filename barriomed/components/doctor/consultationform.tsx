import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native'
import { Save, Stethoscope } from 'lucide-react-native'

export function ConsultationForm() {
    const [soap, setSoap] = useState({
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
    })

    const handleChange = (field: keyof typeof soap, value: string) => {
        setSoap((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const conditions = ['URTI', 'Hypertension', 'Diabetes', 'Gastroenteritis']

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitle}>
                        <Stethoscope size={20} color="#0d9488" />
                        <Text style={styles.title}>Digital Diagnosis (SOAP)</Text>
                    </View>
                    <TouchableOpacity style={styles.saveButton}>
                        <Save size={16} color="#fff" />
                        <Text style={styles.saveButtonText}>Save Consultation</Text>
                    </TouchableOpacity>
                </View>

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
                        placeholderTextColor="#9ca3af"
                        style={[styles.textArea]}
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
                        placeholderTextColor="#9ca3af"
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
                        <Text style={styles.label}>Assessment (Diagnosis)</Text>
                    </View>
                    <TextInput
                        value={soap.assessment}
                        onChangeText={(val) => handleChange('assessment', val)}
                        placeholder="Primary diagnosis (e.g. Acute Upper Respiratory Infection)"
                        placeholderTextColor="#9ca3af"
                        style={styles.input}
                    />
                    {/* Quick condition buttons */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.conditionScroll}
                    >
                        {conditions.map((condition) => (
                            <TouchableOpacity
                                key={condition}
                                onPress={() => handleChange('assessment', condition)}
                                style={styles.conditionButton}
                            >
                                <Text style={styles.conditionButtonText}>{condition}</Text>
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
                        placeholderTextColor="#9ca3af"
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        padding: 16,
        backgroundColor: '#f9fafb',
    },
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
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 8,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
        marginLeft: 6,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0d9488',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
        gap: 6,
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    saveButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 13,
        marginLeft: 4,
    },

    // Sections
    section: {
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginLeft: 4,
    },

    // Badges
    badge: {
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    badgeBlue: { backgroundColor: '#dbeafe' },
    badgeTextBlue: { color: '#2563eb' },
    badgeEmerald: { backgroundColor: '#d1fae5' },
    badgeTextEmerald: { color: '#059669' },
    badgeAmber: { backgroundColor: '#fef3c7' },
    badgeTextAmber: { color: '#d97706' },
    badgePurple: { backgroundColor: '#ede9fe' },
    badgeTextPurple: { color: '#7c3aed' },

    // Inputs
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 13,
        fontWeight: '500',
        color: '#111827',
    },
    textArea: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 13,
        color: '#111827',
        height: 96,
    },

    // Condition chips
    conditionScroll: {
        marginTop: 8,
    },
    conditionButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
    },
    conditionButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4b5563',
    },
})