import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native'
import { Search, QrCode, User, ChevronRight } from 'lucide-react-native'

if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

export interface PatientSearchResult {
    id: string
    name: string
    age: number
    lastVisit: string
}

interface PatientLookupProps {
    onSelect: (patientId: string) => void
}

const MOCK_RESULTS: PatientSearchResult[] = [
    { id: '1', name: 'Maria Santos', age: 32, lastVisit: 'Jan 15, 2025' },
    { id: '2', name: 'Juan Dela Cruz', age: 45, lastVisit: 'Dec 10, 2024' },
    { id: '3', name: 'Pedro Garcia', age: 28, lastVisit: 'Jan 20, 2025' },
]

export function PatientLookup({ onSelect }: PatientLookupProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [isScanning, setIsScanning] = useState(false)

    const filteredResults = searchQuery
        ? MOCK_RESULTS.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : MOCK_RESULTS

    const handleToggleScan = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setIsScanning((prev) => !prev)
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Patient Lookup</Text>

                {/* Search row */}
                <View style={styles.searchRow}>
                    <View style={styles.searchInputWrapper}>
                        <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                        <TextInput
                            placeholder="Search name..."
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={handleToggleScan}
                        style={[styles.qrButton, isScanning && styles.qrButtonActive]}
                        activeOpacity={0.7}
                    >
                        <QrCode size={20} color={isScanning ? '#0d9488' : '#4b5563'} />
                    </TouchableOpacity>
                </View>

                {/* QR Scanner placeholder */}
                {isScanning && (
                    <View style={styles.scannerBox}>
                        <View style={styles.scannerFrame}>
                            <View style={styles.scannerPulse} />
                            <QrCode size={64} color="#14b8a6" />
                        </View>
                        <Text style={styles.scannerHint}>Point camera at patient QR code</Text>
                    </View>
                )}
            </View>

            {/* Patient list */}
            <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionLabel}>
                    {searchQuery ? 'Search Results' : 'Recent Patients'}
                </Text>

                {filteredResults.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No patients found</Text>
                    </View>
                ) : (
                    filteredResults.map((patient) => (
                        <TouchableOpacity
                            key={patient.id}
                            onPress={() => onSelect(patient.id)}
                            style={styles.patientRow}
                            activeOpacity={0.7}
                        >
                            <View style={styles.avatarCircle}>
                                <User size={20} color="#6b7280" />
                            </View>
                            <View style={styles.patientInfo}>
                                <Text style={styles.patientName}>{patient.name}</Text>
                                <Text style={styles.patientMeta}>
                                    Age: {patient.age} • Last: {patient.lastVisit}
                                </Text>
                            </View>
                            <ChevronRight size={16} color="#d1d5db" />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
    },

    // Header
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 14,
    },

    // Search row
    searchRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 0,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
    },
    qrButton: {
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrButtonActive: {
        backgroundColor: '#f0fdfa',
        borderColor: '#99f6e4',
    },

    // QR scanner
    scannerBox: {
        backgroundColor: '#111827',
        borderRadius: 12,
        paddingVertical: 28,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        overflow: 'hidden',
    },
    scannerFrame: {
        width: 120,
        height: 120,
        borderWidth: 2,
        borderColor: '#14b8a6',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'hidden',
    },
    scannerPulse: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(20,184,166,0.15)',
    },
    scannerHint: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
    },

    // Patient list
    listContainer: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9ca3af',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        paddingHorizontal: 4,
        marginBottom: 8,
    },

    // Patient row
    patientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
        marginBottom: 4,
        backgroundColor: '#ffffff',
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    patientMeta: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 1,
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