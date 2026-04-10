import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { adminService, InventoryItem } from '../../backend/lib/adminService'
import { useAuth } from '../../backend/lib/AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────

type StockStatus = 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK'
type DisplayStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

const STATUS_DB_TO_DISPLAY: Record<StockStatus, DisplayStatus> = {
    'AVAILABLE':    'In Stock',
    'LOW':          'Low Stock',
    'OUT_OF_STOCK': 'Out of Stock',
}

const DISPLAY_TO_DB: Record<DisplayStatus, StockStatus> = {
    'In Stock':     'AVAILABLE',
    'Low Stock':    'LOW',
    'Out of Stock': 'OUT_OF_STOCK',
}

const STATUS_CONFIG: Record<DisplayStatus, { bg: string; text: string; dot: string; border: string }> = {
    'In Stock':     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
    'Low Stock':    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200'   },
    'Out of Stock': { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    border: 'border-rose-200'    },
}

const STATUS_OPTIONS: DisplayStatus[] = ['In Stock', 'Low Stock', 'Out of Stock']

// ─── Add Medicine Form State ──────────────────────────────────────────────────

interface AddMedicineForm {
    generic_name: string
    brand_name: string
    category: string
    quantity: string
    unit: string
    stock_status: DisplayStatus
    batch_no: string
    expiry_date: string
}

const EMPTY_FORM: AddMedicineForm = {
    generic_name: '',
    brand_name: '',
    category: '',
    quantity: '',
    unit: '',
    stock_status: 'In Stock',
    batch_no: '',
    expiry_date: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryOversight() {
    const { userProfile } = useAuth()

    const [items, setItems]               = useState<InventoryItem[]>([])
    const [search, setSearch]             = useState('')
    const [filterStatus, setFilterStatus] = useState<DisplayStatus | 'All'>('All')
    const [overridingId, setOverridingId] = useState<string | null>(null)
    const [pendingStatus, setPendingStatus] = useState<DisplayStatus | null>(null)
    const [saving, setSaving]             = useState(false)
    const [deletingId, setDeletingId]     = useState<string | null>(null)
    const [isLoading, setIsLoading]       = useState(true)
    const [error, setError]               = useState<string | null>(null)
    const [feedback, setFeedback]         = useState<{ id: string; success: boolean; msg: string } | null>(null)

    // Add Medicine modal
    const [showAddModal, setShowAddModal] = useState(false)
    const [addForm, setAddForm]           = useState<AddMedicineForm>(EMPTY_FORM)
    const [addSaving, setAddSaving]       = useState(false)
    const [addError, setAddError]         = useState<string | null>(null)

    const adminId   = userProfile?.id ?? ''
    const adminName = userProfile
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : 'Admin'
    const adminRole = (userProfile?.role as string) ?? 'system_admin'

    // ── Data Loading ─────────────────────────────────────────────────────────

    const loadInventory = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await adminService.fetchInventory()
            setItems(data)
        } catch {
            setError('Failed to load inventory. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadInventory()
        const unsub = adminService.subscribeToInventory(loadInventory)
        return unsub
    }, [loadInventory])

    // ── Add Medicine ─────────────────────────────────────────────────────────

    const handleAddMedicine = async () => {
        if (!addForm.generic_name.trim() || !addForm.category.trim()) {
            setAddError('Generic name and category are required.')
            return
        }
        setAddSaving(true)
        setAddError(null)

        const result = await adminService.addInventoryItem({
            item: {
                generic_name: addForm.generic_name.trim(),
                brand_name:   addForm.brand_name.trim() || null,
                category:     addForm.category.trim(),
                quantity:     addForm.quantity ? Number(addForm.quantity) : null,
                unit:         addForm.unit.trim() || null,
                stock_status: DISPLAY_TO_DB[addForm.stock_status],
                batch_no:     addForm.batch_no.trim() || null,
                expiry_date:  addForm.expiry_date.trim() || null,
            },
            adminId,
            adminName,
            adminRole,
        })

        if (result.success && result.item) {
            setItems(prev => [result.item!, ...prev])
            setShowAddModal(false)
            setAddForm(EMPTY_FORM)
        } else {
            setAddError(result.error ?? 'Failed to add medicine.')
        }
        setAddSaving(false)
    }

    // ── Override (status change) ──────────────────────────────────────────────

    const openOverride = (item: InventoryItem) => {
        setOverridingId(item.item_id)
        setPendingStatus(STATUS_DB_TO_DISPLAY[item.stock_status as StockStatus])
    }

    const handleSaveOverride = async (item: InventoryItem) => {
        if (!pendingStatus) return
        setSaving(true)

        const newDbStatus = DISPLAY_TO_DB[pendingStatus]
        const result = await adminService.overrideInventoryQuantity({
            itemId:       item.item_id,
            genericName:  item.generic_name,
            newStatus:    newDbStatus,
            adminId,
            adminName,
            adminRole,
            previousItem: item,          // ← captures old_value for audit
        })

        if (result.success) {
            setItems(prev => prev.map(i =>
                i.item_id === item.item_id
                    ? { ...i, stock_status: newDbStatus, last_updated: new Date().toISOString(), updated_by: `Admin: ${adminName}` }
                    : i
            ))
            setFeedback({ id: item.item_id, success: true, msg: 'Status updated' })
        } else {
            setFeedback({ id: item.item_id, success: false, msg: result.error ?? 'Update failed' })
        }

        setTimeout(() => setFeedback(null), 2500)
        setOverridingId(null)
        setPendingStatus(null)
        setSaving(false)
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDelete = async (item: InventoryItem) => {
        // window.confirm works on web; Alert.alert is a no-op in browsers
        const confirmed = window.confirm(
            `Delete "${item.generic_name}"${item.brand_name ? ` (${item.brand_name})` : ''}?\n\nThis action cannot be undone.`
        )
        if (!confirmed) return

        setDeletingId(item.item_id)
        try {
            const result = await adminService.deleteInventoryItem({
                itemId:       item.item_id,
                genericName:  item.generic_name,
                adminId,
                adminName,
                adminRole,
                itemSnapshot: item,      // ← captures old_value for audit
            })

            if (result.success) {
                // Optimistic UI: remove immediately, no refetch required
                setItems(prev => prev.filter(i => i.item_id !== item.item_id))
            } else {
                setFeedback({ id: item.item_id, success: false, msg: result.error ?? 'Delete failed' })
                setTimeout(() => setFeedback(null), 3000)
            }
        } finally {
            setDeletingId(null)
        }
    }

    // ── Derived state ─────────────────────────────────────────────────────────

    const getDisplayStatus = (item: InventoryItem): DisplayStatus =>
        STATUS_DB_TO_DISPLAY[item.stock_status as StockStatus] ?? 'Out of Stock'

    const filtered = items.filter(i => {
        const matchSearch =
            (i.generic_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (i.category     ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (i.brand_name   ?? '').toLowerCase().includes(search.toLowerCase())
        const displayStatus = getDisplayStatus(i)
        const matchStatus   = filterStatus === 'All' || displayStatus === filterStatus
        return matchSearch && matchStatus
    })

    const inStock    = items.filter(i => i.stock_status === 'AVAILABLE').length
    const lowStock   = items.filter(i => i.stock_status === 'LOW').length
    const outOfStock = items.filter(i => i.stock_status === 'OUT_OF_STOCK').length

    // ── Loading guard ─────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center py-24">
                <ActivityIndicator size="large" color="#0D9488" />
                <Text className="text-gray-400 mt-3 text-sm">Loading inventory…</Text>
            </View>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
                <View>
                    <Text className="text-2xl font-bold text-gray-900">Inventory Oversight</Text>
                    <Text className="text-gray-500 mt-1">Monitor stock levels and apply administrative overrides</Text>
                </View>
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={() => { setAddForm(EMPTY_FORM); setAddError(null); setShowAddModal(true) }}
                        className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-teal-600 border border-teal-600"
                    >
                        <Feather name="plus" size={15} color="white" />
                        <Text className="text-white font-semibold text-sm">Add Medicine</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={loadInventory} className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <Feather name="refresh-cw" size={16} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Error Banner */}
            {error && (
                <View className="flex-row items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4">
                    <Feather name="alert-circle" size={16} color="#E11D48" />
                    <Text className="text-rose-700 text-sm font-medium flex-1">{error}</Text>
                    <TouchableOpacity onPress={loadInventory}>
                        <Text className="text-rose-600 text-sm font-bold">Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Summary Cards */}
            <View className="flex-row gap-4 mb-6 flex-wrap">
                {[
                    { label: 'In Stock',     value: inStock,      color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: 'check-circle'    as const },
                    { label: 'Low Stock',    value: lowStock,     color: 'bg-amber-50 border-amber-100',    text: 'text-amber-700',   icon: 'alert-triangle' as const },
                    { label: 'Out of Stock', value: outOfStock,   color: 'bg-rose-50 border-rose-100',      text: 'text-rose-700',    icon: 'x-circle'       as const },
                    { label: 'Total Items',  value: items.length, color: 'bg-blue-50 border-blue-100',      text: 'text-blue-700',    icon: 'package'        as const },
                ].map(card => (
                    <View key={card.label} className={`flex-1 min-w-[140px] rounded-2xl p-4 border ${card.color} flex-row items-center gap-3`}>
                        <Feather name={card.icon} size={20} />
                        <View>
                            <Text className={`text-2xl font-bold ${card.text}`}>{card.value}</Text>
                            <Text className="text-xs text-gray-500 font-medium">{card.label}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Table */}
            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">

                {/* Toolbar */}
                <View className="p-4 border-b border-gray-100 bg-gray-50 flex-row items-center gap-3 flex-wrap">
                    <View className="relative flex-1 min-w-[200px] justify-center">
                        <View className="absolute left-3 z-10">
                            <Feather name="search" size={16} color="#9CA3AF" />
                        </View>
                        <TextInput
                            placeholder="Search medicine or category…"
                            placeholderTextColor="#9CA3AF"
                            value={search}
                            onChangeText={setSearch}
                            className="w-full pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 h-10"
                        />
                    </View>
                    <View className="flex-row gap-2">
                        {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map(s => (
                            <TouchableOpacity
                                key={s}
                                onPress={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-xl border ${filterStatus === s ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={`text-xs font-bold ${filterStatus === s ? 'text-white' : 'text-gray-600'}`}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Table Header */}
                <View className="bg-gray-50 border-b border-gray-100 flex-row px-4 py-3">
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-[2]">Medicine</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">Status</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">Last Updated</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider w-48 text-right">Actions</Text>
                </View>

                {/* Rows */}
                <View>
                    {filtered.map((item, idx) => {
                        const displayStatus = getDisplayStatus(item)
                        const cfg           = STATUS_CONFIG[displayStatus]
                        const isOverriding  = overridingId === item.item_id
                        const isDeleting    = deletingId    === item.item_id
                        const itemFeedback  = feedback?.id  === item.item_id ? feedback : null

                        return (
                            <View
                                key={item.item_id}
                                className={`flex-row items-center px-4 py-3 gap-2
                                    ${idx !== filtered.length - 1 ? 'border-b border-gray-50' : ''}
                                    ${isOverriding ? 'bg-teal-50/50' : ''}
                                    ${isDeleting   ? 'opacity-50'   : ''}
                                `}
                            >
                                {/* Medicine Info */}
                                <View className="flex-[2]">
                                    <Text className="font-bold text-gray-900 text-sm">{item.generic_name}</Text>
                                    <Text className="text-xs text-gray-400">
                                        {item.category}
                                        {item.brand_name  ? ` · ${item.brand_name}`          : ''}
                                        {item.expiry_date ? ` · Exp: ${item.expiry_date}` : ''}
                                    </Text>
                                </View>

                                {/* Status Badge */}
                                <View className="flex-1">
                                    <View className={`flex-row items-center gap-1.5 px-2 py-1 rounded-lg border self-start ${cfg.bg} ${cfg.border}`}>
                                        <View className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                        <Text className={`text-xs font-bold ${cfg.text}`}>{displayStatus}</Text>
                                    </View>
                                </View>

                                {/* Last Updated / Feedback */}
                                <View className="flex-1">
                                    {itemFeedback ? (
                                        <Text className={`text-xs font-bold ${itemFeedback.success ? 'text-teal-600' : 'text-rose-600'}`}>
                                            {itemFeedback.msg}
                                        </Text>
                                    ) : (
                                        <>
                                            <Text className="text-xs text-gray-500">
                                                {item.last_updated ? item.last_updated.split('T')[0] : '—'}
                                            </Text>
                                            <Text className="text-xs text-gray-400">{item.updated_by ?? '—'}</Text>
                                        </>
                                    )}
                                </View>

                                {/* Actions */}
                                <View className="w-48 flex-row items-center justify-end gap-1">
                                    {isOverriding ? (
                                        /* ── Override mode ── */
                                        <>
                                            <View className="flex-row gap-1">
                                                {STATUS_OPTIONS.map(s => (
                                                    <TouchableOpacity
                                                        key={s}
                                                        onPress={() => setPendingStatus(s)}
                                                        className={`px-1.5 py-1 rounded-lg border ${
                                                            pendingStatus === s
                                                                ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].border}`
                                                                : 'bg-gray-50 border-gray-200'
                                                        }`}
                                                    >
                                                        <Text className={`text-[10px] font-bold ${pendingStatus === s ? STATUS_CONFIG[s].text : 'text-gray-500'}`}>
                                                            {s === 'In Stock' ? '✓' : s === 'Low Stock' ? '!' : '✕'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                            {saving ? (
                                                <ActivityIndicator size="small" color="#0D9488" />
                                            ) : (
                                                <>
                                                    <TouchableOpacity
                                                        onPress={() => handleSaveOverride(item)}
                                                        className="p-1.5 rounded-lg bg-teal-600"
                                                    >
                                                        <Feather name="check" size={13} color="white" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => { setOverridingId(null); setPendingStatus(null) }}
                                                        className="p-1.5 rounded-lg bg-gray-100"
                                                    >
                                                        <Feather name="x" size={13} color="#6B7280" />
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        /* ── Normal mode: Override + Delete ── */
                                        <>
                                            <TouchableOpacity
                                                onPress={() => openOverride(item)}
                                                disabled={isDeleting}
                                                className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200"
                                            >
                                                <Feather name="edit-2" size={12} color="#6B7280" />
                                                <Text className="text-xs text-gray-600 font-medium">Override</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => handleDelete(item)}
                                                disabled={isDeleting}
                                                className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-50 border border-rose-200"
                                            >
                                                {isDeleting
                                                    ? <ActivityIndicator size="small" color="#E11D48" />
                                                    : <Feather name="trash-2" size={12} color="#E11D48" />
                                                }
                                                <Text className="text-xs text-rose-600 font-medium">
                                                    {isDeleting ? '…' : 'Delete'}
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </View>
                        )
                    })}

                    {filtered.length === 0 && (
                        <View className="py-12 items-center">
                            <Feather name="package" size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-2">No items match your filter</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ── Add Medicine Modal ── */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ width: '100%', maxWidth: 520, backgroundColor: 'white', borderRadius: 24, padding: 28 }}>

                        {/* Modal Header */}
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center gap-3">
                                <View className="w-9 h-9 rounded-xl bg-teal-100 items-center justify-center">
                                    <Feather name="plus-circle" size={18} color="#0D9488" />
                                </View>
                                <View>
                                    <Text className="text-lg font-bold text-gray-900">Add Medicine</Text>
                                    <Text className="text-xs text-gray-400">New inventory item · audit log will be created</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setShowAddModal(false)} className="p-1.5 rounded-lg bg-gray-100">
                                <Feather name="x" size={16} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Form Fields */}
                        <View className="flex-col gap-4">

                            {/* Generic Name */}
                            <View>
                                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Generic Name <Text className="text-rose-500">*</Text>
                                </Text>
                                <TextInput
                                    value={addForm.generic_name}
                                    onChangeText={v => setAddForm(f => ({ ...f, generic_name: v }))}
                                    placeholder="e.g. Paracetamol"
                                    placeholderTextColor="#9CA3AF"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                />
                            </View>

                            {/* Brand Name */}
                            <View>
                                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Brand Name</Text>
                                <TextInput
                                    value={addForm.brand_name}
                                    onChangeText={v => setAddForm(f => ({ ...f, brand_name: v }))}
                                    placeholder="e.g. Biogesic (optional)"
                                    placeholderTextColor="#9CA3AF"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                />
                            </View>

                            {/* Category */}
                            <View>
                                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Category <Text className="text-rose-500">*</Text>
                                </Text>
                                <TextInput
                                    value={addForm.category}
                                    onChangeText={v => setAddForm(f => ({ ...f, category: v }))}
                                    placeholder="e.g. Analgesic"
                                    placeholderTextColor="#9CA3AF"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                />
                            </View>

                            {/* Quantity + Unit */}
                            <View className="flex-row gap-3">
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</Text>
                                    <TextInput
                                        value={addForm.quantity}
                                        onChangeText={v => setAddForm(f => ({ ...f, quantity: v.replace(/[^0-9]/g, '') }))}
                                        placeholder="0"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Unit</Text>
                                    <TextInput
                                        value={addForm.unit}
                                        onChangeText={v => setAddForm(f => ({ ...f, unit: v }))}
                                        placeholder="e.g. tablets"
                                        placeholderTextColor="#9CA3AF"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                    />
                                </View>
                            </View>

                            {/* Stock Status */}
                            <View>
                                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Initial Stock Status</Text>
                                <View className="flex-row gap-2">
                                    {STATUS_OPTIONS.map(s => {
                                        const cfg = STATUS_CONFIG[s]
                                        const isSelected = addForm.stock_status === s
                                        return (
                                            <TouchableOpacity
                                                key={s}
                                                onPress={() => setAddForm(f => ({ ...f, stock_status: s }))}
                                                className={`flex-1 py-2.5 rounded-xl border items-center ${isSelected ? `${cfg.bg} ${cfg.border}` : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <Text className={`text-xs font-bold ${isSelected ? cfg.text : 'text-gray-500'}`}>{s}</Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </View>

                            {/* Batch No + Expiry */}
                            <View className="flex-row gap-3">
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Batch No.</Text>
                                    <TextInput
                                        value={addForm.batch_no}
                                        onChangeText={v => setAddForm(f => ({ ...f, batch_no: v }))}
                                        placeholder="e.g. BN-2025-01"
                                        placeholderTextColor="#9CA3AF"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Expiry Date</Text>
                                    <TextInput
                                        value={addForm.expiry_date}
                                        onChangeText={v => setAddForm(f => ({ ...f, expiry_date: v }))}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#9CA3AF"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                    />
                                </View>
                            </View>

                            {/* Error */}
                            {addError && (
                                <View className="flex-row items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
                                    <Feather name="alert-circle" size={13} color="#E11D48" />
                                    <Text className="text-rose-700 text-sm font-medium">{addError}</Text>
                                </View>
                            )}

                            {/* Audit note */}
                            <View className="flex-row items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-100">
                                <Feather name="shield" size={12} color="#0D9488" />
                                <Text className="text-teal-700 text-xs flex-1">
                                    An audit log entry will be created automatically (action: CREATE, performed by: {adminName}).
                                </Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View className="flex-row gap-3 mt-6">
                            <TouchableOpacity
                                onPress={() => setShowAddModal(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 border border-gray-200 items-center"
                            >
                                <Text className="text-sm font-semibold text-gray-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAddMedicine}
                                disabled={addSaving}
                                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${addSaving ? 'bg-teal-600 opacity-60' : 'bg-teal-600'}`}
                            >
                                {addSaving
                                    ? <ActivityIndicator size="small" color="white" />
                                    : <Feather name="plus" size={15} color="white" />
                                }
                                <Text className="text-white font-semibold text-sm">
                                    {addSaving ? 'Adding…' : 'Add Medicine'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </ScrollView>
    )
}
