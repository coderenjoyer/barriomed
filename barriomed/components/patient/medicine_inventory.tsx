import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';

interface Medicine {
    id: string;
    name: string;
    dosage: string;
    nextDose: string;
    status: 'In Stock' | 'Low' | 'Refill Needed';
    pillsLeft: number;
}

const medicines: Medicine[] = [
    {
        id: '1',
        name: 'Amoxicillin',
        dosage: '500mg',
        nextDose: '2:00 PM',
        status: 'In Stock',
        pillsLeft: 14,
    },
    {
        id: '2',
        name: 'Lisinopril',
        dosage: '10mg',
        nextDose: '8:00 PM',
        status: 'Low',
        pillsLeft: 4,
    },
    {
        id: '3',
        name: 'Metformin',
        dosage: '850mg',
        nextDose: 'With Dinner',
        status: 'Refill Needed',
        pillsLeft: 0,
    },
    {
        id: '4',
        name: 'Vitamin D3',
        dosage: '2000 IU',
        nextDose: 'Tomorrow',
        status: 'In Stock',
        pillsLeft: 45,
    },
];

const getStatusStyles = (status: Medicine['status']) => {
    switch (status) {
        case 'In Stock':
            return { bg: '#D1FAE5', text: '#047857', border: '#A7F3D0' }; // emerald-100, emerald-700, emerald-200
        case 'Low':
            return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }; // amber-100, amber-700, amber-200
        case 'Refill Needed':
            return { bg: '#FFE4E6', text: '#BE123C', border: '#FECDD3' }; // rose-100, rose-700, rose-200
        default:
            return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
    }
};

const getStatusIcon = (status: Medicine['status'], color: string) => {
    switch (status) {
        case 'In Stock':
            return <Feather name="check-circle" size={10} color={color} style={{ marginRight: 4 }} />;
        case 'Low':
            return <Feather name="alert-circle" size={10} color={color} style={{ marginRight: 4 }} />;
        case 'Refill Needed':
            return <Feather name="alert-circle" size={10} color={color} style={{ marginRight: 4 }} />;
        default:
            return null;
    }
};

export function MedicineInventory() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Medicine</Text>
                <TouchableOpacity style={styles.seeAllButton}>
                    <Text style={styles.seeAllText}>See All</Text>
                    <Feather name="chevron-right" size={16} color="#0D9488" />
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
                snapToInterval={176} // card width + gap
            >
                {medicines.map((med) => {
                    const statusStyle = getStatusStyles(med.status);

                    return (
                        <TouchableOpacity
                            key={med.id}
                            activeOpacity={0.9}
                            style={styles.card}
                        >
                            {/* Background Icon */}
                            <View style={styles.bgIconContainer}>
                                <FontAwesome5 name="pills" size={64} color="#0D9488" style={{ opacity: 0.1, transform: [{ rotate: '45deg' }] }} />
                            </View>

                            <View>
                                <View style={styles.iconContainer}>
                                    <FontAwesome5 name="pills" size={20} color="#0D9488" />
                                </View>
                                <Text style={styles.medName} numberOfLines={2}>{med.name}</Text>
                                <Text style={styles.dosage}>{med.dosage}</Text>
                            </View>

                            <View style={styles.statusSection}>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }
                                ]}>
                                    {getStatusIcon(med.status, statusStyle.text)}
                                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                                        {med.status}
                                    </Text>
                                </View>
                                <Text style={styles.nextDoseLabel}>
                                    Next: <Text style={styles.nextDoseValue}>{med.nextDose}</Text>
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937', // charcoal-800
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0D9488', // teal-600
        marginRight: 2,
    },
    scrollContent: {
        paddingHorizontal: 4,
        paddingBottom: 24, // Space for shadow
        gap: 16,
    },
    card: {
        width: 160,
        height: 192,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6', // gray-100
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    bgIconContainer: {
        position: 'absolute',
        top: 0,
        right: -10,
        padding: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0FDFA', // teal-50
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    medName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
        lineHeight: 20,
    },
    dosage: {
        fontSize: 12,
        color: '#6B7280', // charcoal-500
    },
    statusSection: {
        marginTop: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        marginBottom: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '500',
    },
    nextDoseLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9CA3AF', // charcoal-400
    },
    nextDoseValue: {
        color: '#374151', // charcoal-700
    },
});
