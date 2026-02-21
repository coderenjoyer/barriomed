import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';

export interface VaccineRecord {
    id: string;
    vaccine: string;
    date: string;
    status: 'completed' | 'pending';
    location?: string;
}

interface VaccineTimelineProps {
    records: VaccineRecord[];
}

const TimelineItem = ({ record, index }: { record: VaccineRecord; index: number }) => {
    const isCompleted = record.status === 'completed';

    // Animation - Standard RN Animated API
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateXAnim = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        const delay = 200 + index * 100;

        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 500,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateXAnim, {
                toValue: 0,
                duration: 500,
                delay,
                useNativeDriver: true,
            })
        ]).start();
    }, [index]);

    return (
        <Animated.View
            style={[
                styles.itemContainer,
                {
                    opacity: opacityAnim,
                    transform: [{ translateX: translateXAnim }]
                }
            ]}
        >
            {/* Timeline Node */}
            <View
                style={[
                    styles.node,
                    isCompleted ? styles.nodeCompleted : styles.nodePending,
                ]}
            >
                {isCompleted ? (
                    <Feather name="check" size={12} color="#059669" />
                ) : (
                    <Feather name="clock" size={12} color="#D97706" />
                )}
            </View>

            {/* Content Card */}
            <View
                style={[
                    styles.card,
                    isCompleted ? styles.cardCompleted : styles.cardPending,
                ]}
            >
                <View style={styles.cardHeader}>
                    <Text
                        style={[
                            styles.vaccineName,
                            isCompleted ? styles.textCompleted : styles.textPending,
                        ]}
                    >
                        {record.vaccine}
                    </Text>
                    <View
                        style={[
                            styles.badge,
                            isCompleted ? styles.badgeCompleted : styles.badgePending,
                        ]}
                    >
                        <Text
                            style={[
                                styles.badgeText,
                                isCompleted ? styles.badgeTextCompleted : styles.badgeTextPending,
                            ]}
                        >
                            {isCompleted ? 'Completed' : 'Due'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                        <Feather
                            name="calendar"
                            size={12}
                            color={isCompleted ? '#6B7280' : '#B45309'}
                            style={{ opacity: 0.7 }}
                        />
                        <Text
                            style={[
                                styles.detailText,
                                isCompleted ? styles.textGray : styles.textAmber,
                            ]}
                        >
                            {record.date}
                        </Text>
                    </View>

                    {isCompleted && record.location && (
                        <View style={styles.detailRow}>
                            <Feather name="map-pin" size={12} color="#0D9488" />
                            <Text style={[styles.detailText, styles.textGray]}>
                                {record.location}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

export function VaccineTimeline({ records }: VaccineTimelineProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                <FontAwesome5 name="syringe" size={18} color="#0D9488" style={{ marginRight: 8 }} />
                {'  '}
                Vaccination History
            </Text>

            <View style={styles.timelineContainer}>
                {/* Vertical Line */}
                <View style={styles.verticalLine} />

                <View style={styles.listContainer}>
                    {records.map((record, index) => (
                        <TimelineItem key={record.id} record={record} index={index} />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937', // gray-800
        marginBottom: 16,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    timelineContainer: {
        position: 'relative',
        paddingLeft: 16,
    },
    verticalLine: {
        position: 'absolute',
        left: 27, // Aligned with nodes
        top: 8,
        bottom: 16,
        width: 2,
        backgroundColor: '#E5E7EB', // gray-200
        borderRadius: 1,
    },
    listContainer: {
        gap: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        position: 'relative',
    },
    node: {
        position: 'absolute',
        left: 0,
        marginTop: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    nodeCompleted: {
        backgroundColor: '#D1FAE5', // emerald-100
    },
    nodePending: {
        backgroundColor: '#FEF3C7', // amber-100
    },
    card: {
        marginLeft: 40,
        flex: 1,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardCompleted: {
        backgroundColor: 'white',
        borderColor: '#F3F4F6', // gray-100
    },
    cardPending: {
        backgroundColor: '#FFFBEB', // amber-50
        borderColor: '#FDE68A', // amber-200
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    vaccineName: {
        fontWeight: 'bold',
        fontSize: 14,
        flex: 1,
        marginRight: 8,
    },
    textCompleted: {
        color: '#1F2937', // gray-800
    },
    textPending: {
        color: '#78350F', // amber-900
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeCompleted: {
        backgroundColor: '#F9FAFB', // gray-50
    },
    badgePending: {
        backgroundColor: '#FEF3C7', // amber-100
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '500',
    },
    badgeTextCompleted: {
        color: '#6B7280', // gray-500
    },
    badgeTextPending: {
        color: '#B45309', // amber-700
    },
    cardDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 12,
    },
    textGray: {
        color: '#6B7280', // gray-500
    },
    textAmber: {
        color: '#B45309', // amber-700
    },
});
