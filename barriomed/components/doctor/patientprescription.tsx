import React, { useState, useEffect } from 'react'
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
    ActivityIndicator,
    Alert,
} from 'react-native'
import { Pill, Plus, Trash2, AlertCircle, Search, X } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import type { PrescriptionMedication } from '../../lib/medicalRecordsService'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ── Types ────────────────────────────────────────────────────────────────────

interface InventoryMedicine {
    item_id: string
    generic_name: string
    brand_name?: string
    stock_status: 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK'
}

interface PrescriptionItem extends PrescriptionMedication {
    id: string            // local-only ID for list key
    stockStatus: 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK'
}

interface PrescriptionBuilderProps {
    /** Called whenever the items list changes so a parent can store them */
    onItemsChange?: (items: PrescriptionMedication[]) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function PrescriptionBuilder({ onItemsChange }: PrescriptionBuilderProps) {
    const [items, setItems]               = useState<PrescriptionItem[]>([])
    const [isModalOpen, setIsModalOpen]   = useState(false)
    const [searchQuery, setSearchQuery]   = useState('')
    const [medicines, setMedicines]       = useState<InventoryMedicine[]>([])
    const [isMedLoading, setIsMedLoading] = useState(false)

    // Load inventory medicines from Supabase
    useEffect(() => {
        if (!isModalOpen) return
        let mounted = true
        setIsMedLoading(true)
        supabase
            .from('inventory')
            .select('item_id, generic_name, brand_name, stock_status')
            .order('generic_name', { ascending: true })
            .then(({ data, error }) => {
                if (!mounted) return
                if (error) {
                    console.error('[PrescriptionBuilder] inventory fetch error:', error)
                    setMedicines([])
                } else {
                    setMedicines((data ?? []) as InventoryMedicine[])
                }
                setIsMedLoading(false)
            })
        return () => { mounted = false }
    }, [isModalOpen])

    const notifyParent = (updated: PrescriptionItem[]) => {
        const clean: PrescriptionMedication[] = updated.map(({ id, stockStatus, ...med }) => med)
        onItemsChange?.(clean)
    }

    const addItem = (medicine: InventoryMedicine) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        const newItem: PrescriptionItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: medicine.generic_name + (medicine.brand_name ? ` (${medicine.brand_name})` : ''),
            dosage: '',
            frequency: '1 tablet TID',
            duration: '7 days',
            stockStatus: medicine.stock_status,
        }
        const updated = [...items, newItem]
        setItems(updated)
        notifyParent(updated)
        setIsModalOpen(false)
        setSearchQuery('')
    }

    const removeItem = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        const updated = items.filter((i) => i.id !== id)
        setItems(updated)
        notifyParent(updated)
    }

    const updateItem = (id: string, field: keyof PrescriptionItem, value: string) => {
        const updated = items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
        setItems(updated)
        notifyParent(updated)
    }

    const filteredMedicines = medicines.filter((m) =>
        m.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.brand_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const hasOutOfStock = items.some((i) => i.stockStatus === 'OUT_OF_STOCK')

    const stockDotColor = (status: InventoryMedicine['stock_status']) => {
        if (status === 'AVAILABLE') return '#10B981'
        if (status === 'LOW') return '#F59E0B'
        return '#F43F5E'
    }

    const stockLabel = (status: InventoryMedicine['stock_status']) => {
        if (status === 'AVAILABLE') return null
        if (status === 'LOW') return 'Low Stock'
        return 'Out of Stock'
    }

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitle}>
                    <Pill size={20} color="#0D9488" />
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
                    <AlertCircle size={18} color="#E11D48" style={{ marginTop: 1 }} />
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
            <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Pill size={32} color="#D1FAE5" />
                        <Text style={styles.emptyText}>No medications added yet.</Text>
                        <Text style={styles.emptyHint}>Tap "Add Medication" to prescribe from inventory.</Text>
                    </View>
                ) : (
                    items.map((item) => (
                        <View key={item.id} style={styles.prescriptionCard}>
                            {/* Item header */}
                            <View style={styles.itemHeader}>
                                <View style={styles.itemTitleRow}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    {stockLabel(item.stockStatus) && (
                                        <View style={item.stockStatus === 'OUT_OF_STOCK' ? styles.badgeRose : styles.badgeAmber}>
                                            <Text style={item.stockStatus === 'OUT_OF_STOCK' ? styles.badgeRoseText : styles.badgeAmberText}>
                                                {stockLabel(item.stockStatus)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeItem(item.id)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Trash2 size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            {/* Dosage / Frequency / Duration inputs */}
                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>DOSAGE</Text>
                                    <TextInput
                                        value={item.dosage}
                                        onChangeText={(val) => updateItem(item.id, 'dosage', val)}
                                        placeholder="e.g. 500mg"
                                        placeholderTextColor="#9CA3AF"
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>FREQUENCY / SIG</Text>
                                    <TextInput
                                        value={item.frequency}
                                        onChangeText={(val) => updateItem(item.id, 'frequency', val)}
                                        style={styles.input}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputRow, { marginTop: 8 }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>DURATION / QTY</Text>
                                    <TextInput
                                        value={item.duration}
                                        onChangeText={(val) => updateItem(item.id, 'duration', val)}
                                        style={styles.input}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Item count */}
            {items.length > 0 && (
                <View style={styles.summaryRow}>
                    <Pill size={14} color="#0D9488" />
                    <Text style={styles.summaryText}>{items.length} medication(s) in this prescription</Text>
                </View>
            )}

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
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Search input */}
                        <View style={styles.searchWrapper}>
                            <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                            <TextInput
                                placeholder="Search inventory..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={styles.searchInput}
                                autoFocus
                            />
                        </View>

                        {/* Medicine list */}
                        {isMedLoading ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color="#0D9488" />
                                <Text style={styles.modalLoadingText}>Loading inventory…</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {filteredMedicines.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No items match "{searchQuery}"</Text>
                                    </View>
                                ) : (
                                    filteredMedicines.map((med) => (
                                        <TouchableOpacity
                                            key={med.item_id}
                                            onPress={() => addItem(med)}
                                            style={styles.medicineRow}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.medicineName}>{med.generic_name}</Text>
                                                {med.brand_name && (
                                                    <Text style={styles.medicineDosage}>{med.brand_name}</Text>
                                                )}
                                            </View>
                                            <View
                                                style={[
                                                    styles.stockDot,
                                                    { backgroundColor: stockDotColor(med.stock_status) },
                                                ]}
                                            />
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        )}
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
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.3,
        flexShrink: 1,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },

    // Warning banner
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        gap: 12,
    },
    warningTextBlock: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#991B1B',
        marginBottom: 4,
    },
    warningBody: {
        fontSize: 12,
        color: '#B91C1C',
        lineHeight: 18,
    },

    // Item list
    itemList: {
        marginBottom: 16,
        maxHeight: 400,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        borderWidth: 2,
        borderColor: '#F3F4F6',
        borderStyle: 'dashed',
        borderRadius: 16,
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    emptyHint: {
        fontSize: 12,
        color: '#D1D5DB',
    },

    // Prescription card
    prescriptionCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
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
        gap: 8,
        flex: 1,
        marginRight: 10,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#111827',
    },
    badgeRose: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeRoseText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#991B1B',
    },
    badgeAmber: {
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeAmberText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#92400E',
    },

    // Inputs
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6B7280',
        marginBottom: 6,
        letterSpacing: 0.8,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },

    // Summary row
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F0FDFA',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    summaryText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0D9488',
    },

    // Modal
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: '#ffffff',
        borderRadius: 32,
        padding: 24,
        width: '100%',
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalLoading: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    modalLoadingText: {
        fontSize: 14,
        color: '#9CA3AF',
    },

    // Search
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        marginBottom: 16,
        height: 52,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },

    // Medicine rows
    medicineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 8,
        backgroundColor: '#ffffff',
    },
    medicineName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    medicineDosage: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    stockDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
})