import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StockToggle } from './StockToggle';
import { inventoryService, InventoryItem, StockStatus } from '../../../lib/inventoryService';

export function InventoryMaster() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    
    // Modal state for Add/Edit
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadInventory();

        // Subscribe to real-time changes
        const unsubscribe = inventoryService.subscribeToInventoryChanges((payload) => {
            loadInventory();
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const loadInventory = async () => {
        setLoading(true);
        const { data } = await inventoryService.fetchInventory();
        setInventory(data);
        setLoading(false);
    };

    const handleStatusChange = async (item_id: string, newStatus: StockStatus) => {
        // Optimistic UI update
        setInventory(prev => prev.map(item => item.item_id === item_id ? { ...item, stock_status: newStatus, last_updated: new Date().toISOString() } : item));
        
        const success = await inventoryService.updateStockStatus(item_id, newStatus);
        if (!success) {
            Alert.alert('Error', 'Failed to update stock status.');
            loadInventory(); // Revert optimistic update
        }
    };

    const toggleSelection = (item_id: string) => {
        setSelectedItems((prev) =>
            prev.includes(item_id) ? prev.filter((i) => i !== item_id) : [...prev, item_id],
        );
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === inventory.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(inventory.map((i) => i.item_id));
        }
    };

    const handleBatchStatus = async (status: StockStatus) => {
        if (selectedItems.length === 0) return;
        
        // Optimistic 
        setInventory(prev => prev.map(item => 
            selectedItems.includes(item.item_id) ? { ...item, stock_status: status } : item
        ));
        
        if (status === 'AVAILABLE' && selectedItems.length === inventory.length) {
            await inventoryService.markAllAvailable();
        } else {
            // We sequentially update each item
            await Promise.all(selectedItems.map(id => inventoryService.updateStockStatus(id, status)));
        }

        setSelectedItems([]);
    };

    const handleAddClick = () => {
        setEditingItem(null);
        setFormData({ stock_status: 'AVAILABLE' });
        setModalVisible(true);
    };

    const handleEditClick = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData(item);
        setModalVisible(true);
    };

    const handleDeleteClick = (id: string) => {
        // Alert.alert is a no-op on web — use window.confirm instead
        if (Platform.OS === 'web') {
            const item = inventory.find(i => i.item_id === id);
            const name = item ? `"${item.generic_name}"` : 'this item';
            const confirmed = window.confirm(`Delete ${name}? This action cannot be undone.`);
            if (!confirmed) return;

            (async () => {
                const result = await inventoryService.deleteInventoryItem(id);
                if (result.success) {
                    setInventory(prev => prev.filter(i => i.item_id !== id));
                } else {
                    window.alert('Error: ' + (result.error ?? 'Failed to delete item.'));
                }
            })();
            return;
        }

        // Mobile: use Alert.alert
        Alert.alert('Delete Medicine', 'Are you sure you want to delete this medicine?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const result = await inventoryService.deleteInventoryItem(id);
                    if (result.success) {
                        setInventory(prev => prev.filter(i => i.item_id !== id));
                    } else {
                        Alert.alert('Error', result.error ?? 'Failed to delete item.');
                    }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (!formData.generic_name || !formData.category) {
            Alert.alert('Error', 'Please fill in Generic Name and Category');
            return;
        }

        setSaving(true);
        if (editingItem) {
            const success = await inventoryService.updateInventoryItem(editingItem.item_id, {
                generic_name: formData.generic_name,
                brand_name: formData.brand_name,
                category: formData.category,
                stock_status: formData.stock_status,
            });
            if (success) {
                setModalVisible(false);
            } else {
                Alert.alert('Error', 'Failed to update item.');
            }
        } else {
            const success = await inventoryService.createInventoryItem({
                generic_name: formData.generic_name,
                brand_name: formData.brand_name,
                category: formData.category,
                stock_status: formData.stock_status || 'AVAILABLE',
            });
            if (success) {
                // Let the realtime subscription trigger load
                setModalVisible(false);
            } else {
                Alert.alert('Error', 'Failed to create item.');
            }
        }
        setSaving(false);
    };

    const filteredInventory = inventory.filter(
        (item) =>
            item.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
    };

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
                                            placeholder="Search generic name..."
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
                                        name={inventory.length > 0 && selectedItems.length === inventory.length ? "check-square" : "square"}
                                        size={16}
                                        color={inventory.length > 0 && selectedItems.length === inventory.length ? '#0D9488' : '#9CA3AF'}
                                    />
                                    <Text className="text-sm font-medium text-gray-600">
                                        {inventory.length > 0 && selectedItems.length === inventory.length
                                            ? 'Deselect All'
                                            : 'Select All'}
                                    </Text>
                                </TouchableOpacity>
                                <View className="w-px h-6 bg-gray-200 mx-1" />
                                <TouchableOpacity
                                    onPress={async () => {
                                        await handleBatchStatus('AVAILABLE');
                                    }}
                                    disabled={selectedItems.length === 0}
                                    className={`px-3 py-1.5 bg-emerald-100 rounded-lg ${selectedItems.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-xs font-bold text-emerald-700">Mark Available</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleBatchStatus('LOW')}
                                    disabled={selectedItems.length === 0}
                                    className={`px-3 py-1.5 bg-amber-100 rounded-lg ${selectedItems.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-xs font-bold text-amber-700">Mark Low</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleBatchStatus('OUT_OF_STOCK')}
                                    disabled={selectedItems.length === 0}
                                    className={`px-3 py-1.5 bg-rose-100 rounded-lg ${selectedItems.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-xs font-bold text-rose-700">Mark Out</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Table/Grid */}
                        <View 
                            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex-1 min-h-[400px]"
                            style={Platform.OS === 'web' ? { maxHeight: 'calc(100vh - 260px)' as any } : undefined}
                        >
                            {loading ? (
                                <View className="flex-1 justify-center items-center">
                                    <ActivityIndicator size="large" color="#0D9488" />
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                                    <View className="w-full min-w-[700px] flex-1">
                                        {/* Header */}
                                        <View className="flex-row bg-gray-50 border-b border-gray-100 p-4">
                                            <View className="w-12 items-center justify-center">
                                                <Feather name="minus" size={16} color="#D1D5DB" />
                                            </View>
                                            <Text className="flex-1 text-xs font-bold text-gray-500 uppercase">Medicine Name & Brand</Text>
                                            <Text className="flex-1 text-xs font-bold text-gray-500 uppercase">Category</Text>
                                            <Text className="w-24 text-xs font-bold text-gray-500 uppercase text-center">Status</Text>
                                            <Text className="w-32 text-xs font-bold text-gray-500 uppercase text-right">Last Updated</Text>
                                            <Text className="w-20 text-xs font-bold text-gray-500 uppercase text-right pr-4">Actions</Text>
                                        </View>

                                        {/* Body */}
                                        <ScrollView className="flex-1">
                                            {filteredInventory.map((item) => (
                                                <View
                                                    key={item.item_id}
                                                    className="flex-row items-center p-4 border-b border-gray-50"
                                                >
                                                    <TouchableOpacity
                                                        onPress={() => toggleSelection(item.item_id)}
                                                        className="w-12 items-center justify-center"
                                                    >
                                                        <Feather
                                                            name={selectedItems.includes(item.item_id) ? "check-square" : "square"}
                                                            size={18}
                                                            color={selectedItems.includes(item.item_id) ? "#0D9488" : "#D1D5DB"}
                                                        />
                                                    </TouchableOpacity>
                                                    <View className="flex-1 justify-center">
                                                        <Text className="font-bold text-gray-900">{item.generic_name}</Text>
                                                        {item.brand_name ? (
                                                            <Text className="text-xs text-gray-500">{item.brand_name}</Text>
                                                        ) : null}
                                                    </View>
                                                    <View className="flex-1 justify-center">
                                                        <View className="self-start px-2 py-1 rounded-md bg-gray-100">
                                                            <Text className="text-gray-600 text-xs font-medium">
                                                                {item.category}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View className="w-24 flex items-center justify-center">
                                                        <StockToggle
                                                            status={item.stock_status}
                                                            onChange={(status) => handleStatusChange(item.item_id, status)}
                                                        />
                                                    </View>
                                                    <View className="w-32 items-end justify-center">
                                                        <Text className="text-sm text-gray-400 font-medium text-right">
                                                            {formatTimestamp(item.last_updated)}
                                                        </Text>
                                                    </View>
                                                    <View className="w-20 flex-row justify-end items-center gap-4 pr-4">
                                                        <TouchableOpacity onPress={() => handleEditClick(item)}>
                                                            <Feather name="edit-2" size={16} color="#0D9488" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => handleDeleteClick(item.item_id)}>
                                                            <Feather name="trash-2" size={16} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))}
                                            {filteredInventory.length === 0 && (
                                                <View className="items-center py-6">
                                                    <Text className="text-gray-400">No matching medicines found.</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                </ScrollView>
                            )}
                        </View>
                    </View>

                    {/* RIGHT PANEL - STATS */}
                    <View className="w-full lg:w-[320px] flex-col gap-6">
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
                                    .filter((i) => i.stock_status === 'LOW' || i.stock_status === 'OUT_OF_STOCK')
                                    .slice(0, 5)
                                    .map((item) => (
                                        <View
                                            key={item.item_id}
                                            className="flex-row items-center justify-between bg-teal-800 rounded-lg p-3"
                                        >
                                            <Text className="text-sm font-medium text-white flex-1 mr-2" numberOfLines={1}>
                                                {item.generic_name}
                                            </Text>
                                            <View
                                                className={`px-2 py-1 rounded-full ${item.stock_status === 'OUT_OF_STOCK' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                            >
                                                <Text className="text-xs font-bold text-white">
                                                    {item.stock_status === 'OUT_OF_STOCK' ? 'OUT' : 'LOW'}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                {inventory.filter(
                                    (i) => i.stock_status === 'LOW' || i.stock_status === 'OUT_OF_STOCK',
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
                            {editingItem ? 'Edit Medicine' : 'Add New Medicine'}
                        </Text>

                        <Text className="text-sm font-bold text-gray-700 mb-1">Generic Name *</Text>
                        <TextInput
                            value={formData.generic_name}
                            onChangeText={n => setFormData(prev => ({ ...prev, generic_name: n }))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-3"
                            placeholder="e.g. Paracetamol"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text className="text-sm font-bold text-gray-700 mb-1">Brand Name / Dosage</Text>
                        <TextInput
                            value={formData.brand_name}
                            onChangeText={b => setFormData(prev => ({ ...prev, brand_name: b }))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-3"
                            placeholder="e.g. Biogesic 500mg"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text className="text-sm font-bold text-gray-700 mb-1">Category *</Text>
                        <TextInput
                            value={formData.category}
                            onChangeText={c => setFormData(prev => ({ ...prev, category: c }))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-6"
                            placeholder="e.g. Painkiller"
                            placeholderTextColor="#9CA3AF"
                        />

                        <View className="flex-row justify-end gap-3">
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="px-5 py-2.5 rounded-xl bg-gray-100" disabled={saving}>
                                <Text className="font-bold text-gray-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} className="px-5 py-2.5 rounded-xl bg-teal-600" disabled={saving}>
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text className="font-bold text-white">Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}
