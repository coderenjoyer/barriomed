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
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        marginBottom: 16,
    },

    // Top row
    topRow: {
        gap: 12,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#f3f4f6',
    },
    nameBlock: {
        flex: 1,
        justifyContent: 'center',
    },
    patientName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 26,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    badgeGray: {
        backgroundColor: '#f3f4f6',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeGrayText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4b5563',
    },
    badgeRose: {
        backgroundColor: '#fff1f2',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#ffe4e6',
    },
    badgeRoseText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#be123c',
    },

    // Allergy banner
    allergyBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    allergyIconWrapper: {
        backgroundColor: '#ffe4e6',
        borderRadius: 8,
        padding: 6,
    },
    allergyContent: {
        flex: 1,
    },
    allergyTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9f1239',
        letterSpacing: 0.6,
        marginBottom: 6,
    },
    allergyChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    allergyChip: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#ffe4e6',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 1,
        elevation: 1,
    },
    allergyChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#be123c',
    },

    // No allergy banner
    noAllergyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#a7f3d0',
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    noAllergyIconWrapper: {
        backgroundColor: '#d1fae5',
        borderRadius: 8,
        padding: 6,
    },
    noAllergyText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#065f46',
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 16,
    },

    // Vitals grid — 2x2
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    vitalCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        padding: 12,
        width: '48%',
    },
    vitalCardMuted: {
        opacity: 0.7,
    },
    vitalLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    vitalLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 0.4,
        marginLeft: 2,
    },

    // BP inputs
    bpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    bpInput: {
        width: 40,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingVertical: 5,
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },
    bpSlash: {
        fontSize: 14,
        color: '#9ca3af',
    },

    // Generic vital input
    vitalInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    vitalInput: {
        width: 56,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingVertical: 5,
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },
    vitalUnit: {
        fontSize: 11,
        color: '#9ca3af',
    },

    // Static height value
    vitalStaticValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },
})