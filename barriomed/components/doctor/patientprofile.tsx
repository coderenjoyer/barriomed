import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    Image,
    StyleSheet,
    ScrollView,
} from 'react-native'
import {
    AlertTriangle,
    Activity,
    Thermometer,
    Weight,
    Ruler,
} from 'lucide-react-native'

export interface PatientData {
    id: string
    name: string
    age: number
    bloodType: string
    allergies: string[]
    weight: string
    height: string
    lastVisit: string
    avatar: string
}

interface PatientProfileProps {
    patient: PatientData
}

export function PatientProfile({ patient }: PatientProfileProps) {
    const [bp, setBp] = useState({ sys: '', dia: '' })
    const [temp, setTemp] = useState('')
    const [weight, setWeight] = useState(patient.weight.replace(' kg', ''))

    return (
        <View style={styles.card}>
            {/* Top row: avatar + info + allergies */}
            <View style={styles.topRow}>
                {/* Avatar + name */}
                <View style={styles.headerInfo}>
                    <Image
                        source={{ uri: patient.avatar }}
                        style={styles.avatar}
                        resizeMode="cover"
                    />
                    <View style={styles.nameBlock}>
                        <Text style={styles.patientName}>{patient.name}</Text>
                        <View style={styles.badgeRow}>
                            <View style={styles.badgeGray}>
                                <Text style={styles.badgeGrayText}>{patient.age} Years Old</Text>
                            </View>
                            <View style={styles.badgeRose}>
                                <Text style={styles.badgeRoseText}>Type {patient.bloodType}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Allergies */}
                {patient.allergies.length > 0 ? (
                    <View style={styles.allergyBanner}>
                        <View style={styles.allergyIconWrapper}>
                            <AlertTriangle size={18} color="#e11d48" />
                        </View>
                        <View style={styles.allergyContent}>
                            <Text style={styles.allergyTitle}>KNOWN ALLERGIES</Text>
                            <View style={styles.allergyChips}>
                                {patient.allergies.map((allergy) => (
                                    <View key={allergy} style={styles.allergyChip}>
                                        <Text style={styles.allergyChipText}>{allergy}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.noAllergyBanner}>
                        <View style={styles.noAllergyIconWrapper}>
                            <Activity size={18} color="#059669" />
                        </View>
                        <Text style={styles.noAllergyText}>No known allergies</Text>
                    </View>
                )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Vitals Grid */}
            <View style={styles.vitalsGrid}>
                {/* Blood Pressure */}
                <View style={styles.vitalCard}>
                    <View style={styles.vitalLabelRow}>
                        <Activity size={11} color="#6b7280" />
                        <Text style={styles.vitalLabel}>BLOOD PRESSURE</Text>
                    </View>
                    <View style={styles.bpRow}>
                        <TextInput
                            placeholder="120"
                            placeholderTextColor="#9ca3af"
                            value={bp.sys}
                            onChangeText={(val) => setBp({ ...bp, sys: val })}
                            style={styles.bpInput}
                            keyboardType="numeric"
                            textAlign="center"
                        />
                        <Text style={styles.bpSlash}>/</Text>
                        <TextInput
                            placeholder="80"
                            placeholderTextColor="#9ca3af"
                            value={bp.dia}
                            onChangeText={(val) => setBp({ ...bp, dia: val })}
                            style={styles.bpInput}
                            keyboardType="numeric"
                            textAlign="center"
                        />
                        <Text style={styles.vitalUnit}>mmHg</Text>
                    </View>
                </View>

                {/* Temperature */}
                <View style={styles.vitalCard}>
                    <View style={styles.vitalLabelRow}>
                        <Thermometer size={11} color="#6b7280" />
                        <Text style={styles.vitalLabel}>TEMPERATURE</Text>
                    </View>
                    <View style={styles.vitalInputRow}>
                        <TextInput
                            placeholder="36.5"
                            placeholderTextColor="#9ca3af"
                            value={temp}
                            onChangeText={setTemp}
                            style={styles.vitalInput}
                            keyboardType="decimal-pad"
                            textAlign="center"
                        />
                        <Text style={styles.vitalUnit}>°C</Text>
                    </View>
                </View>

                {/* Weight */}
                <View style={styles.vitalCard}>
                    <View style={styles.vitalLabelRow}>
                        <Weight size={11} color="#6b7280" />
                        <Text style={styles.vitalLabel}>WEIGHT</Text>
                    </View>
                    <View style={styles.vitalInputRow}>
                        <TextInput
                            placeholder="0"
                            placeholderTextColor="#9ca3af"
                            value={weight}
                            onChangeText={setWeight}
                            style={styles.vitalInput}
                            keyboardType="decimal-pad"
                            textAlign="center"
                        />
                        <Text style={styles.vitalUnit}>kg</Text>
                    </View>
                </View>

                {/* Height (read-only) */}
                <View style={[styles.vitalCard, styles.vitalCardMuted]}>
                    <View style={styles.vitalLabelRow}>
                        <Ruler size={11} color="#6b7280" />
                        <Text style={styles.vitalLabel}>HEIGHT</Text>
                    </View>
                    <Text style={styles.vitalStaticValue}>{patient.height}</Text>
                </View>
            </View>
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
        marginBottom: 16,
    },

    // Top row
    topRow: {
        gap: 16,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#F3F4F6',
    },
    nameBlock: {
        flex: 1,
        justifyContent: 'center',
    },
    patientName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 28,
        letterSpacing: -0.5,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    badgeGray: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    badgeGrayText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563',
    },
    badgeRose: {
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    badgeRoseText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#991B1B',
    },

    // Allergy banner
    allergyBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 16,
        padding: 14,
        gap: 12,
    },
    allergyIconWrapper: {
        backgroundColor: '#FEE2E2',
        borderRadius: 10,
        padding: 8,
    },
    allergyContent: {
        flex: 1,
    },
    allergyTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#991B1B',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    allergyChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    allergyChip: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    allergyChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#991B1B',
    },

    // No allergy banner
    noAllergyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDFA',
        borderWidth: 1,
        borderColor: '#CCFBF1',
        borderRadius: 16,
        padding: 14,
        gap: 12,
    },
    noAllergyIconWrapper: {
        backgroundColor: '#CCFBF1',
        borderRadius: 10,
        padding: 8,
    },
    noAllergyText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0D9488',
    },

    // Divider
    divider: {
        height: 1.5,
        backgroundColor: '#F3F4F6',
        marginVertical: 20,
    },

    // Vitals grid — 2x2
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    vitalCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
        width: '48%',
    },
    vitalCardMuted: {
        opacity: 0.8,
        backgroundColor: '#F3F4F6',
    },
    vitalLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    vitalLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6B7280',
        letterSpacing: 0.5,
    },

    // BP inputs
    bpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    bpInput: {
        width: 48,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingVertical: 6,
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    bpSlash: {
        fontSize: 16,
        color: '#9CA3AF',
        fontWeight: '600',
    },

    // Generic vital input
    vitalInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    vitalInput: {
        width: 64,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingVertical: 6,
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    vitalUnit: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },

    // Static height value
    vitalStaticValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
})