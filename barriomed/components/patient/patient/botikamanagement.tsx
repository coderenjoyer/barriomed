import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { MedicineStockCard } from './medicinecards';
import { inventoryService, InventoryItem } from '../../../lib/inventoryService';

interface BotikaPageProps {
    userId?: string;
    scrollEnabled?: boolean;
}

export function BotikaPage({ userId = 'user-1', scrollEnabled = true }: BotikaPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [medicines, setMedicines] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    useEffect(() => {
        loadData();

        const unsubscribe = inventoryService.subscribeToInventoryChanges(() => {
            loadData();
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        const { data, lastUpdated, offline } = await inventoryService.fetchInventory();

        // Ensure data is structured properly if we modified the interface slightly
        const mappedData = data.map(m => ({ ...m, genericName: m.generic_name }));

        setMedicines(mappedData);
        setIsOffline(offline);
        setLastUpdated(lastUpdated);
        setLoading(false);
    };

    // Extract categories dynamically from the data, plus "All"
    const categories = useMemo(() => {
        const cats = new Set(medicines.map(m => m.category));
        return ['All', ...Array.from(cats)].sort();
    }, [medicines]);

    const filteredMedicines = useMemo(() => {
        return medicines.filter((med) => {
            const generic = med.generic_name || '';
            const brand = med.brand_name || '';
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                generic.toLowerCase().includes(query) ||
                brand.toLowerCase().includes(query);
            const matchesCategory =
                activeCategory === 'All' || med.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory, medicines]);

    const getCategoryCount = (category: string) => {
        if (category === 'All') return medicines.length;
        return medicines.filter((m) => m.category === category).length;
    };

    const formatTime = (ts: string | null) => {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
    };

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Feather name="search" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No medicines found</Text>
            <Text style={styles.emptySubtitle}>
                Try searching for a different generic or brand name.
            </Text>
        </View>
    );

    const content = (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.iconContainer}>
                        <FontAwesome5 name="pills" size={24} color="#0D9488" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>E-Botika ng Bayan</Text>
                        <Text style={styles.headerSubtitle}>Check medicine availability</Text>
                    </View>
                </View>

                {isOffline && lastUpdated && (
                    <View style={{ backgroundColor: '#FFFBEB', padding: 8, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="wifi-off" size={16} color="#B45309" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#B45309', fontSize: 12 }}>
                            Offline. Displaying stock status as of {formatTime(lastUpdated)}
                        </Text>
                    </View>
                )}

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search generic or brand..."
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            style={styles.clearButton}
                        >
                            <Feather name="x" size={12} color="#4B5563" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Categories */}
            <View style={styles.categoriesContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContent}
                >
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            onPress={() => setActiveCategory(category)}
                            style={[
                                styles.categoryButton,
                                activeCategory === category && styles.categoryButtonActive
                            ]}
                        >
                            <Text
                                style={[
                                    styles.categoryText,
                                    activeCategory === category && styles.categoryTextActive
                                ]}
                            >
                                {category}
                            </Text>
                            <View style={[
                                styles.categoryBadge,
                                activeCategory === category ? styles.categoryBadgeActive : styles.categoryBadgeInactive
                            ]}>
                                <Text style={[
                                    styles.categoryBadgeText,
                                    activeCategory === category ? styles.categoryBadgeTextActive : styles.categoryBadgeTextInactive
                                ]}>
                                    {getCategoryCount(category)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Medicine List */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#0D9488" />
                </View>
            ) : scrollEnabled ? (
                <FlatList
                    data={filteredMedicines}
                    keyExtractor={(item) => item.item_id}
                    renderItem={({ item, index }) => (
                        <MedicineStockCard medicine={item} index={index} />
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<EmptyState />}
                />
            ) : (
                <View style={styles.listContent}>
                    {filteredMedicines.length > 0 ? (
                        filteredMedicines.map((item, index) => (
                            <MedicineStockCard key={item.item_id} medicine={item} index={index} />
                        ))
                    ) : (
                        <EmptyState />
                    )}
                </View>
            )}
        </View>
    );

    if (scrollEnabled) {
        return <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>;
    }
    return content;
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB', // gray-50
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F0FDFA', // teal-50
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827', // gray-900
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280', // gray-500
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6', // gray-100
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 48,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    clearButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: '#E5E7EB', // gray-200
    },
    categoriesContainer: {
        backgroundColor: 'white',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    categoriesContent: {
        paddingHorizontal: 24,
        gap: 8,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F3F4F6', // gray-100
        marginRight: 8,
    },
    categoryButtonActive: {
        backgroundColor: '#0D9488', // teal-600
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563', // gray-600
        marginRight: 8,
    },
    categoryTextActive: {
        color: 'white',
    },
    categoryBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 99,
    },
    categoryBadgeInactive: {
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    categoryBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    categoryBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    categoryBadgeTextInactive: {
        color: '#6B7280',
    },
    categoryBadgeTextActive: {
        color: 'white',
    },
    listContent: {
        padding: 24,
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        maxWidth: 200,
    },
});
