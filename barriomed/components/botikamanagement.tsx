import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, StatusBar, Image, FlatList } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { MedicineStockCard } from './medicinecards';

// Types
export type StockStatus = 'available' | 'limited' | 'out_of_stock';
export interface Medicine {
    id: string;
    genericName: string;
    brandName: string;
    dosage: string;
    category: string;
    status: StockStatus;
    count?: number;
    restockDate?: string;
    patientId?: string; // ID of the patient this medicine is prescribed for
    prescribedDate?: string;
}

// Mock Data
const medicines: Medicine[] = [
    // Maintenance - Prescribed to Sarah (user-1)
    {
        id: '1',
        genericName: 'Losartan',
        brandName: 'Cozaar',
        dosage: '50mg Tablet',
        category: 'Maintenance',
        status: 'out_of_stock',
        restockDate: 'Feb 5',
        patientId: 'user-1',
        prescribedDate: '2024-01-15',
    },
    {
        id: '2',
        genericName: 'Metformin',
        brandName: 'Glucophage',
        dosage: '500mg Tablet',
        category: 'Maintenance',
        status: 'available',
        patientId: 'user-1',
        prescribedDate: '2024-01-15',
    },
    {
        id: '3',
        genericName: 'Amlodipine',
        brandName: 'Norvasc',
        dosage: '5mg Tablet',
        category: 'Maintenance',
        status: 'limited',
        count: 15,
        patientId: 'user-1',
        prescribedDate: '2024-02-01',
    },
    // Antibiotics - Prescribed to Other User (user-2)
    {
        id: '4',
        genericName: 'Amoxicillin',
        brandName: 'Amoxil',
        dosage: '500mg Capsule',
        category: 'Antibiotics',
        status: 'limited',
        count: 20,
        patientId: 'user-2',
        prescribedDate: '2024-02-10',
    },
    // Antibiotics - Prescribed to Sarah (user-1)
    {
        id: '5',
        genericName: 'Co-Amoxiclav',
        brandName: 'Augmentin',
        dosage: '625mg Tablet',
        category: 'Antibiotics',
        status: 'out_of_stock',
        restockDate: 'Feb 8',
        patientId: 'user-1',
        prescribedDate: '2024-02-14',
    },
    // Other - Prescribed to Others
    {
        id: '6',
        genericName: 'Azithromycin',
        brandName: 'Zithromax',
        dosage: '500mg Tablet',
        category: 'Antibiotics',
        status: 'available',
        patientId: 'user-2',
    },
    // Vitamins - Prescribed to Sarah
    {
        id: '7',
        genericName: 'Ascorbic Acid',
        brandName: 'Vitamin C',
        dosage: '500mg Tablet',
        category: 'Vitamins',
        status: 'available',
        patientId: 'user-1',
        prescribedDate: '2024-01-01',
    },
    // Others
    {
        id: '8',
        genericName: 'Ferrous Sulfate',
        brandName: 'Iron',
        dosage: '325mg Tablet',
        category: 'Vitamins',
        status: 'available',
        patientId: 'user-2',
    },
    {
        id: '9',
        genericName: 'Multivitamins',
        brandName: 'Centrum',
        dosage: 'Tablet',
        category: 'Vitamins',
        status: 'limited',
        count: 30,
        patientId: 'user-1',
        prescribedDate: '2024-01-01',
    },
    // First Aid - Mix
    {
        id: '10',
        genericName: 'Povidone Iodine',
        brandName: 'Betadine',
        dosage: '10% Solution',
        category: 'First Aid',
        status: 'available',
        patientId: 'user-2',
    },
    {
        id: '11',
        genericName: 'Paracetamol',
        brandName: 'Biogesic',
        dosage: '500mg Tablet',
        category: 'First Aid',
        status: 'available',
        patientId: 'user-1', // Often prescribed or OTC, assigning to user for demo
        prescribedDate: '2024-02-15',
    },
    {
        id: '12',
        genericName: 'Mefenamic Acid',
        brandName: 'Ponstan',
        dosage: '500mg Tablet',
        category: 'First Aid',
        status: 'limited',
        count: 10,
        patientId: 'user-2',
    },
];

const categories = [
    'All',
    'Maintenance',
    'Antibiotics',
    'Vitamins',
    'First Aid',
];

interface BotikaPageProps {
    userId?: string;
    scrollEnabled?: boolean;
}

export function BotikaPage({ userId = 'user-1', scrollEnabled = true }: BotikaPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const userInfoMedicines = useMemo(() => {
        return medicines.filter(med => med.patientId === userId);
    }, [userId]);

    const filteredMedicines = useMemo(() => {
        return userInfoMedicines.filter((med) => {
            const matchesSearch =
                med.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                med.brandName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                activeCategory === 'All' || med.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory, userInfoMedicines]);

    const getCategoryCount = (category: string) => {
        if (category === 'All') return userInfoMedicines.length;
        return userInfoMedicines.filter((m) => m.category === category).length;
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

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search medicine (e.g., Biogesic)"
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
                            <View style={[ // Badge for count
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
            {scrollEnabled ? (
                <FlatList
                    data={filteredMedicines}
                    keyExtractor={(item) => item.id}
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
                            <MedicineStockCard key={item.id} medicine={item} index={index} />
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
        paddingBottom: 100, // Space for bottom content if needed
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
