import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';

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
}

interface MedicineStockCardProps {
    medicine: Medicine;
    index: number;
}

export function MedicineStockCard({ medicine, index }: MedicineStockCardProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 500,
                delay: index * 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    const getStatusConfig = (status: StockStatus) => {
        switch (status) {
            case 'available':
                return {
                    bg: '#ECFDF5', // emerald-50
                    border: '#D1FAE5', // emerald-100
                    text: '#047857', // emerald-700
                    dot: '#10B981', // emerald-500
                    label: 'Available',
                };
            case 'limited':
                return {
                    bg: '#FFFBEB', // amber-50
                    border: '#FEF3C7', // amber-100
                    text: '#B45309', // amber-700
                    dot: '#F59E0B', // amber-500
                    label: `Limited Stock - ${medicine.count} left`,
                };
            case 'out_of_stock':
                return {
                    bg: '#FFF1F2', // rose-50
                    border: '#FFE4E6', // rose-100
                    text: '#BE123C', // rose-700
                    dot: '#F43F5E', // rose-500
                    label: `Out of Stock - Restock: ${medicine.restockDate}`,
                };
        }
    };

    const config = getStatusConfig(medicine.status);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: translateY }],
                },
            ]}
        >
            <View style={styles.contentRow}>
                <View style={styles.textContainer}>
                    <Text style={styles.genericName}>{medicine.genericName}</Text>
                    <Text style={styles.brandName}>
                        {medicine.brandName} • {medicine.dosage}
                    </Text>
                </View>
                <View style={styles.iconContainer}>
                    <FontAwesome5 name="pills" size={20} color="#0D9488" />
                </View>
            </View>

            <View
                style={[
                    styles.statusContainer,
                    { backgroundColor: config.bg, borderColor: config.border },
                ]}
            >
                <View style={[styles.statusDot, { backgroundColor: config.dot }]} />
                <Text style={[styles.statusText, { color: config.text }]}>
                    {config.label}
                </Text>
            </View>

            {/* Decorative background icon */}
            <View style={styles.decorativeIcon}>
                <FontAwesome5
                    name="pills"
                    size={96}
                    color="#000"
                    style={{ opacity: 0.03, transform: [{ rotate: '-12deg' }] }}
                />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6', // gray-100
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    textContainer: {
        flex: 1,
    },
    genericName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827', // gray-900
        marginBottom: 4,
    },
    brandName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280', // gray-500
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0FDFA', // teal-50
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    decorativeIcon: {
        position: 'absolute',
        bottom: -16,
        right: -16,
        pointerEvents: 'none',
    },
});
