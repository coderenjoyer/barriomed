import React, { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { StockToggle, StockStatus } from './StockToggle'
import { RestockLog } from './RestockLog'

interface InventoryItem {
    id: string
    name: string
    dosage: string
    category: string
    status: StockStatus
    lastUpdated: string
}

const MOCK_INVENTORY: InventoryItem[] = [
    {
        id: '1',
        name: 'Paracetamol (Biogesic)',
        dosage: '500mg Tablet',
        category: 'Analgesic',
        status: 'in_stock',
        lastUpdated: '10 mins ago',
    },
    {
        id: '2',
        name: 'Amoxicillin',
        dosage: '500mg Capsule',
        category: 'Antibiotic',
        status: 'low',
        lastUpdated: '1 hour ago',
    },
    {
        id: '3',
        name: 'Losartan',
        dosage: '50mg Tablet',
        category: 'Maintenance',
        status: 'out_of_stock',
        lastUpdated: 'Yesterday',
    },
    {
        id: '4',
        name: 'Metformin',
        dosage: '500mg Tablet',
        category: 'Maintenance',
        status: 'in_stock',
        lastUpdated: '2 days ago',
    },
    {
        id: '5',
        name: 'Ascorbic Acid',
        dosage: '500mg Tablet',
        category: 'Vitamin',
        status: 'in_stock',
        lastUpdated: '3 days ago',
    },
    {
        id: '6',
        name: 'Mefenamic Acid',
        dosage: '500mg Tablet',
        category: 'Analgesic',
        status: 'low',
        lastUpdated: '5 hours ago',
    },
    {
        id: '7',
        name: 'Cetirizine',
        dosage: '10mg Tablet',
        category: 'Antihistamine',
        status: 'in_stock',
        lastUpdated: '1 day ago',
    },
    {
        id: '8',
        name: 'Omeprazole',
        dosage: '20mg Capsule',
        category: 'Antacid',
        status: 'out_of_stock',
        lastUpdated: 'Yesterday',
    },
]

export function InventoryMaster() {
    const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [isModalVisible, setModalVisible] = useState(false)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [formData, setFormData] = useState<Partial<InventoryItem>>({})

    const handleStatusChange = (id: string, newStatus: StockStatus) => {
        setInventory((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        status: newStatus,
                        lastUpdated: 'Just now',
                    }
                    : item,
            ),
        )
    }

    const toggleSelection = (id: string) => {
        setSelectedItems((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        )
    }

    const toggleSelectAll = () => {
        if (selectedItems.length === inventory.length) {
            setSelectedItems([])
        } else {
            setSelectedItems(inventory.map((i) => i.id))
        }
    }

    const handleBatchStatus = (status: StockStatus) => {
        setInventory((prev) =>
            prev.map((item) =>
                selectedItems.includes(item.id)
                    ? {
                        ...item,
                        status,
                        lastUpdated: 'Just now',
                    }
                    : item,
            ),
        )
        setSelectedItems([])
    }

    const handleAddClick = () => {
        setEditingItem(null)
        setFormData({ status: 'in_stock' })
        setModalVisible(true)
    }

    const handleEditClick = (item: InventoryItem) => {
        setEditingItem(item)
        setFormData(item)
        setModalVisible(true)
    }

    const handleDeleteClick = (id: string) => {
        Alert.alert('Delete Medicine', 'Are you sure you want to delete this medicine?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => setInventory(prev => prev.filter(i => i.id !== id)) }
        ])
    }

    const handleSave = () => {
        if (!formData.name || !formData.category) {
            Alert.alert('Error', 'Please fill in Name and Category');
            return;
        }

        if (editingItem) {
            setInventory(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData as InventoryItem, lastUpdated: 'Just now' } : i))
        } else {
            const newItem: InventoryItem = {
                id: Math.random().toString(),
                name: formData.name || '',
                dosage: formData.dosage || '',
                category: formData.category || '',
                status: formData.status || 'in_stock',
                lastUpdated: 'Just now'
            }
            setInventory(prev => [newItem, ...prev])
        }
        setModalVisible(false)
    }

    const filteredInventory = inventory.filter(
        (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    return (
        <>
            <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ flexGrow: 1 }}>
                <View className="flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
                    {/* LEFT PANEL - INVENTORY GRID */}
                    <View className="flex-1 flex-col gap-6">
                        {/* Header & Controls */}
                        <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-col">
                            <View className="flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        Inventory Master
                                    </Text>
                                    <Text className="text-gray-500 text-sm">
                                        Manage medicine availability in real-time
                                    </Text>
                                </View>

                                <View className="flex-row flex-1 md:flex-none items-center gap-3">
                                    <View className="flex-1 md:w-64 relative justify-center">
                                        <View className="absolute left-3 z-10 top-3">
                                            <Feather name="search" size={16} color="#9CA3AF" />
                                        </View>
                                        <TextInput
                                            placeholder="Search medicine..."
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-teal-500"
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleAddClick}
                                        className="bg-teal-600 px-4 py-2.5 rounded-xl flex-row items-center gap-2"
                                    >
                                        <Feather name="plus" size={16} color="white" />
                                        <Text className="text-white font-bold hidden md:flex">Add</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Batch Actions */}
                            <View className="flex-row flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <TouchableOpacity
                                    onPress={toggleSelectAll}
                                    className="flex-row items-center gap-2 px-3 py-1.5 rounded-lg"
                                >
                                    <Feather
                                        name={selectedItems.length === inventory.length ? "check-square" : "square"}
                                        size={16}
                                        color={selectedItems.length === inventory.length ? '#0D9488' : '#9CA3AF'}
                                    />
                                    <Text className="text-sm font-medium text-gray-600">
                                        {selectedItems.length === inventory.length
                                            ? 'Deselect All'
                                            : 'Select All'}
                                    </Text>
                                </TouchableOpacity>
                                <View className="w-px h-6 bg-gray-200 mx-1" />
                                <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
                                    Set Selected:
                                </Text>
                                <TouchableOpacity
                                    onPress={() => handleBatchStatus('in_stock')}
                                    disabled={selectedItems.length === 0}
                                    className={`px-3 py-1.5 bg-emerald-100 rounded-lg ${selectedItems.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-xs font-bold text-emerald-700">Available</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleBatchStatus('low')}
                                    disabled={selectedItems.length === 0}
                                    className={`px-3 py-1.5 bg-amber-100 rounded-lg ${selectedItems.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-xs font-bold text-amber-700">Low</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleBatchStatus('out_of_stock')}
                                    disabled={selectedItems.length === 0}
                                    className={`px-3 py-1.5 bg-rose-100 rounded-lg ${selectedItems.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-xs font-bold text-rose-700">Out</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Table/Grid */}
                        <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex-1">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="w-full min-w-[700px]">
                                    {/* Header */}
                                    <View className="flex-row bg-gray-50 border-b border-gray-100 p-4">
                                        <View className="w-12 items-center justify-center">
                                            <Feather name="minus" size={16} color="#D1D5DB" />
                                        </View>
                                        <Text className="flex-1 text-xs font-bold text-gray-500 uppercase">Medicine Name</Text>
                                        <Text className="flex-1 text-xs font-bold text-gray-500 uppercase">Category</Text>
                                        <Text className="w-24 text-xs font-bold text-gray-500 uppercase">Status</Text>
                                        <Text className="w-24 text-xs font-bold text-gray-500 uppercase text-right">Last Updated</Text>
                                        <Text className="w-20 text-xs font-bold text-gray-500 uppercase text-right pr-4">Actions</Text>
                                    </View>

                                    {/* Body */}
                                    <ScrollView className="flex-1">
                                        {filteredInventory.map((item) => (
                                            <View
                                                key={item.id}
                                                className="flex-row items-center p-4 border-b border-gray-50"
                                            >
                                                <TouchableOpacity
                                                    onPress={() => toggleSelection(item.id)}
                                                    className="w-12 items-center justify-center"
                                                >
                                                    <Feather
                                                        name={selectedItems.includes(item.id) ? "check-square" : "square"}
                                                        size={18}
                                                        color={selectedItems.includes(item.id) ? "#0D9488" : "#D1D5DB"}
                                                    />
                                                </TouchableOpacity>
                                                <View className="flex-1 justify-center">
                                                    <Text className="font-bold text-gray-900">{item.name}</Text>
                                                    <Text className="text-xs text-gray-500">{item.dosage}</Text>
                                                </View>
                                                <View className="flex-1 justify-center">
                                                    <View className="self-start px-2 py-1 rounded-md bg-gray-100">
                                                        <Text className="text-gray-600 text-xs font-medium">
                                                            {item.category}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View className="w-24 justify-center">
                                                    <StockToggle
                                                        status={item.status}
                                                        onChange={(status) => handleStatusChange(item.id, status)}
                                                    />
                                                </View>
                                                <View className="w-24 items-end justify-center">
                                                    <Text className="text-sm text-gray-400 font-medium text-right">
                                                        {item.lastUpdated}
                                                    </Text>
                                                </View>
                                                <View className="w-20 flex-row justify-end items-center gap-4 pr-4">
                                                    <TouchableOpacity onPress={() => handleEditClick(item)}>
                                                        <Feather name="edit-2" size={16} color="#0D9488" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleDeleteClick(item.id)}>
                                                        <Feather name="trash-2" size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                        {filteredInventory.length === 0 && (
                                            <View className="items-center py-6">
                                                <Text className="text-gray-400">No matching stocks found</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                </View>
                            </ScrollView>
                        </View>
                    </View>

                    {/* RIGHT PANEL - RESTOCK LOG */}
                    <View className="w-full lg:w-[320px] flex-col gap-6">
                        <RestockLog />

                        {/* Stats Card */}
                        <View className="bg-teal-700 rounded-2xl p-6 shadow-lg">
                            <View className="flex-row items-center gap-2 mb-4">
                                <Feather name="alert-triangle" size={16} color="#CCFBF1" />
                                <Text className="font-medium text-teal-100">
                                    Low Stock Alerts
                                </Text>
                            </View>
                            <View className="flex-col gap-3">
                                {inventory
                                    .filter((i) => i.status === 'low' || i.status === 'out_of_stock')
                                    .slice(0, 3)
                                    .map((item) => (
                                        <View
                                            key={item.id}
                                            className="flex-row items-center justify-between bg-teal-800 rounded-lg p-3"
                                        >
                                            <Text className="text-sm font-medium text-white flex-1 mr-2" numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <View
                                                className={`px-2 py-1 rounded-full ${item.status === 'out_of_stock' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                            >
                                                <Text className="text-xs font-bold text-white">
                                                    {item.status === 'out_of_stock' ? 'OUT' : 'LOW'}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                {inventory.filter(
                                    (i) => i.status === 'low' || i.status === 'out_of_stock',
                                ).length === 0 && (
                                        <View className="items-center py-4">
                                            <Text className="text-teal-100 opacity-60 text-sm">
                                                All stocks healthy
                                            </Text>
                                        </View>
                                    )}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Modal for Creating / Editing Medicines */}
            <Modal visible={isModalVisible} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                    <View className="bg-white rounded-3xl p-6 w-full max-w-md">
                        <Text className="text-xl font-bold text-gray-900 mb-4">
                            {editingItem ? 'Edit Medicine' : 'Add Medicine'}
                        </Text>

                        <Text className="text-sm font-bold text-gray-700 mb-1">Name</Text>
                        <TextInput
                            value={formData.name}
                            onChangeText={n => setFormData(prev => ({ ...prev, name: n }))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-3"
                            placeholder="e.g. Paracetamol"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text className="text-sm font-bold text-gray-700 mb-1">Dosage</Text>
                        <TextInput
                            value={formData.dosage}
                            onChangeText={d => setFormData(prev => ({ ...prev, dosage: d }))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-3"
                            placeholder="e.g. 500mg Tablet"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text className="text-sm font-bold text-gray-700 mb-1">Category</Text>
                        <TextInput
                            value={formData.category}
                            onChangeText={c => setFormData(prev => ({ ...prev, category: c }))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-6"
                            placeholder="e.g. Analgesic"
                            placeholderTextColor="#9CA3AF"
                        />

                        <View className="flex-row justify-end gap-3">
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="px-5 py-2.5 rounded-xl bg-gray-100">
                                <Text className="font-bold text-gray-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} className="px-5 py-2.5 rounded-xl bg-teal-600">
                                <Text className="font-bold text-white">Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    )
}
