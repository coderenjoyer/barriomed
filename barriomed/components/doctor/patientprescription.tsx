import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native'
import { Pill, Plus, Trash2, AlertCircle, Search, X } from 'lucide-react-native'

if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

interface Medicine {
    id: string
    name: string
    dosage: string
    stockStatus: 'in_stock' | 'low' | 'out_of_stock'
}

interface PrescriptionItem {
    id: string
    medicineId: string
    name: string
    dosage: string
    frequency: string
    duration: string
    stockStatus: 'in_stock' | 'low' | 'out_of_stock'
}

const MOCK_MEDICINES: Medicine[] = [
    { id: '1', name: 'Amoxicillin', dosage: '500mg', stockStatus: 'in_stock' },
    { id: '2', name: 'Paracetamol', dosage: '500mg', stockStatus: 'in_stock' },
    { id: '3', name: 'Losartan', dosage: '50mg', stockStatus: 'out_of_stock' },
    { id: '4', name: 'Metformin', dosage: '500mg', stockStatus: 'low' },
    { id: '5', name: 'Cetirizine', dosage: '10mg', stockStatus: 'in_stock' },
]

export function PrescriptionBuilder() {
    const [items, setItems] = useState<PrescriptionItem[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const addItem = (medicine: Medicine) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        const newItem: PrescriptionItem = {
            id: Math.random().toString(36).substr(2, 9),
            medicineId: medicine.id,
            name: medicine.name,
            dosage: medicine.dosage,
            frequency: '1 tab every 8 hours',
            duration: '7 days',
            stockStatus: medicine.stockStatus,
        }
        setItems((prev) => [...prev, newItem])
        setIsModalOpen(false)
        setSearchQuery('')
    }

    const removeItem = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setItems((prev) => prev.filter((i) => i.id !== id))
    }

    const updateItem = (id: string, field: keyof PrescriptionItem, value: string) => {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
        )
    }

    const filteredMedicines = MOCK_MEDICINES.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const hasOutOfStock = items.some((i) => i.stockStatus === 'out_of_stock')

    const stockDotColor = (status: Medicine['stockStatus']) => {
        if (status === 'in_stock') return '#10b981'
        if (status === 'low') return '#f59e0b'
        return '#f43f5e'
    }

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitle}>
                    <Pill size={20} color="#0d9488" />
                    <Text style={styles.title}>E-Prescription (Digital Reseta)</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsModalOpen(true)}
                    activeOpacity={0.7}
                >
                    <Plus size={16} color="#374151" />
                    <Text style={styles.addButtonText}>Add Medication</Text>
                </TouchableOpacity>
            </View>

            {/* Out of stock warning */}
            {hasOutOfStock && (
                <View style={styles.warningBanner}>
                    <AlertCircle size={18} color="#e11d48" style={{ marginTop: 1 }} />
                    <View style={styles.warningTextBlock}>
                        <Text style={styles.warningTitle}>Stock Warning</Text>
                        <Text style={styles.warningBody}>
                            Some prescribed items are out of stock in the center. Patient may need to purchase
                            them from an outside pharmacy.
                        </Text>
                    </View>
                </View>
            )}

            {/* Prescription items */}
            <ScrollView
                style={styles.itemList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
            >
                {items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No medications added yet.</Text>
                    </View>
                ) : (
                    items.map((item) => (
                        <View key={item.id} style={styles.prescriptionCard}>
                            {/* Item header */}
                            <View style={styles.itemHeader}>
                                <View style={styles.itemTitleRow}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemDosage}>{item.dosage}</Text>
                                    {item.stockStatus === 'out_of_stock' && (
                                        <View style={styles.badgeRose}>
                                            <Text style={styles.badgeRoseText}>Out of Stock</Text>
                                        </View>
                                    )}
                                    {item.stockStatus === 'low' && (
                                        <View style={styles.badgeAmber}>
                                            <Text style={styles.badgeAmberText}>Low Stock</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeItem(item.id)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Trash2 size={16} color="#9ca3af" />
                                </TouchableOpacity>
                            </View>

                            {/* Frequency & Duration inputs */}
                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>FREQUENCY / SIG</Text>
                                    <TextInput
                                        value={item.frequency}
                                        onChangeText={(val) => updateItem(item.id, 'frequency', val)}
                                        style={styles.input}
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>DURATION / QTY</Text>
                                    <TextInput
                                        value={item.duration}
                                        onChangeText={(val) => updateItem(item.id, 'duration', val)}
                                        style={styles.input}
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Issue Prescription button */}
            <TouchableOpacity
                style={[styles.issueButton, items.length === 0 && styles.issueButtonDisabled]}
                disabled={items.length === 0}
                activeOpacity={0.8}
            >
                <Text style={styles.issueButtonText}>Issue Prescription</Text>
            </TouchableOpacity>

            {/* Medicine Search Modal */}
            <Modal
                visible={isModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsModalOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setIsModalOpen(false)}
                />
                <View style={styles.modalWrapper}>
                    <View style={styles.modalCard}>
                        {/* Modal header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Medication</Text>
                            <TouchableOpacity
                                onPress={() => setIsModalOpen(false)}
                                style={styles.closeButton}
                            >
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Search input */}
                        <View style={styles.searchWrapper}>
                            <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                            <TextInput
                                placeholder="Search inventory..."
                                placeholderTextColor="#9ca3af"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={styles.searchInput}
                                autoFocus
                            />
                        </View>

                        {/* Medicine list */}
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filteredMedicines.map((med) => (
                                <TouchableOpacity
                                    key={med.id}
                                    onPress={() => addItem(med)}
                                    style={styles.medicineRow}
                                    activeOpacity={0.7}
                                >
                                    <View>
                                        <Text style={styles.medicineName}>{med.name}</Text>
                                        <Text style={styles.medicineDosage}>{med.dosage}</Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.stockDot,
                                            { backgroundColor: stockDotColor(med.stockStatus) },
                                        ]}
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 8,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginLeft: 4,
        flexShrink: 1,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
        gap: 6,
    },
    addButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginLeft: 4,
    },

    // Warning banner
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        gap: 10,
    },
    warningTextBlock: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#9f1239',
        marginBottom: 2,
    },
    warningBody: {
        fontSize: 12,
        color: '#e11d48',
        lineHeight: 18,
    },

    // Item list
    itemList: {
        marginBottom: 16,
        maxHeight: 400,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    emptyText: {
        fontSize: 13,
        color: '#9ca3af',
    },

    // Prescription card
    prescriptionCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 12,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    itemTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
        marginRight: 8,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    itemDosage: {
        fontSize: 13,
        color: '#6b7280',
    },
    badgeRose: {
        backgroundColor: '#ffe4e6',
        borderWidth: 1,
        borderColor: '#fecdd3',
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeRoseText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#be123c',
    },
    badgeAmber: {
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeAmberText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#b45309',
    },

    // Inputs
    inputRow: {
        flexDirection: 'row',
        gap: 10,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6b7280',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        color: '#111827',
    },

    // Issue button
    issueButton: {
        backgroundColor: '#0d9488',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    issueButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
        elevation: 0,
    },
    issueButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },

    // Modal
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        pointerEvents: 'box-none',
    },
    modalCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
        borderRadius: 99,
        backgroundColor: '#f3f4f6',
    },

    // Search
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
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

    // Medicine rows
    medicineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
        marginBottom: 4,
    },
    medicineName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    medicineDosage: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 1,
    },
    stockDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
})