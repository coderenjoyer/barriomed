import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PatientLookup } from '../components/doctor/patientsearch';
import { PatientProfile, PatientData } from '../components/doctor/patientprofile';
import { ConsultationHistory, ConsultationRecord } from '../components/doctor/consultationhistory';
import { ConsultationForm } from '../components/doctor/consultationform';
import { PrescriptionBuilder } from '../components/doctor/patientprescription';
import { useAuth } from '../lib/AuthContext';

// Placeholder mock data
const MOCK_PATIENT: PatientData = {
    id: '1',
    name: 'Maria Santos',
    age: 32,
    bloodType: 'O+',
    allergies: ['Penicillin', 'Peanuts'],
    weight: '65 kg',
    height: '160 cm',
    lastVisit: 'Jan 15, 2025',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
};

const MOCK_HISTORY: ConsultationRecord[] = [
    {
        id: 'h1',
        date: 'Jan 15, 2025',
        doctor: 'Dr. Physician',
        diagnosis: 'Acute Bronchitis',
        notes: 'Prescribed antibiotics and advised rest.',
    },
    {
        id: 'h2',
        date: 'Oct 10, 2024',
        doctor: 'Dr. Physician',
        diagnosis: 'Routine Checkup',
        notes: 'All clear. Blood pressure normal.',
    }
];

export function DoctorDashboard({ onLogout }: { onLogout: () => void }) {
    const { userProfile, session } = useAuth();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

    const firstName  = userProfile?.first_name ?? session?.user?.user_metadata?.first_name ?? '';
    const lastName   = userProfile?.last_name  ?? session?.user?.user_metadata?.last_name  ?? '';
    const fullName   = [firstName, lastName].filter(Boolean).join(' ') || 'Doctor';
    const doctorLabel = fullName ? `Dr. ${fullName}` : 'Doctor';
    const emailLabel  = userProfile?.email ?? session?.user?.email ?? '';

    // Substitute the real doctor name into consultation history
    const mockHistory: ConsultationRecord[] = MOCK_HISTORY.map(r => ({
        ...r,
        doctor: doctorLabel,
    }));

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {selectedPatientId && (
                        <TouchableOpacity onPress={() => setSelectedPatientId(null)} style={styles.backButton}>
                            <Feather name="arrow-left" size={20} color="#4B5563" />
                        </TouchableOpacity>
                    )}
                    <View>
                        <Text style={styles.greetingText}>{doctorLabel}</Text>
                        {emailLabel ? <Text style={styles.subText}>{emailLabel}</Text> : null}
                        <Text style={styles.nameText}>Doctor Dashboard</Text>
                    </View>
                </View>

                <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
                    <Feather name="log-out" size={20} color="#4B5563" />
                </TouchableOpacity>
            </View>

            {/* Main view logic */}
            <View style={styles.content}>
                {!selectedPatientId ? (
                    <PatientLookup onSelect={(id) => setSelectedPatientId(id)} />
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
                        <PatientProfile patient={MOCK_PATIENT} />
                        
                        <View style={styles.sectionMargin}>
                        <ConsultationHistory history={mockHistory} />
                        </View>
                        
                        <View style={styles.sectionMargin}>
                            {/* To avoid nested VirtualizedLists/ScrollViews issues from ConsultationForm 
                                We gave ConsultationForm a ScrollView root but here it's inside another ScrollView.
                                React Native allows it as long as the inner one isn't bounded without fixed height,
                                but since ConsultationForm has `flexGrow: 1` it might be better if its content is just View if it's placed in a ScrollView.
                                The components should be smart enough or we keep an eye on it. */}
                            <ConsultationForm />
                        </View>
                        
                        <View style={styles.sectionMargin}>
                            <PrescriptionBuilder />
                        </View>
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 8,
        borderRadius: 999,
        backgroundColor: '#F3F4F6',
    },
    greetingText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    subText: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 1,
    },
    nameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    iconButton: {
        padding: 8,
        borderRadius: 999,
        backgroundColor: '#F3F4F6',
    },
    content: {
        flex: 1,
    },
    scrollPadding: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionMargin: {
        marginTop: 16,
    }
});
