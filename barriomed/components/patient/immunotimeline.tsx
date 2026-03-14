import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';

interface Immunization {
    id: string;
    vaccine: string;
    date: string;
    location: string;
    completed: boolean;
}

interface ImmunizationTimelineProps {
    records?: Immunization[];
}

export function ImmunizationTimeline({ records = [] }: ImmunizationTimelineProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Immunization History</Text>

            {records.length === 0 ? (
                <View style={styles.emptyState}>
                    <FontAwesome5 name="syringe" size={32} color="#D1D5DB" />
                    <Text style={styles.emptyStateTitle}>No Records Yet</Text>
                    <Text style={styles.emptyStateText}>Immunization records will appear here once available.</Text>
                </View>
            ) : (
                <View style={styles.timelineContainer}>
                    {/* Vertical Line */}
                    <View style={styles.verticalLine} />

                    <View style={styles.listContainer}>
                        {records.map((record) => (
                            <View key={record.id} style={styles.timelineItem}>
                                {/* Timeline Node */}
                                <View style={styles.nodeContainer}>
                                    <View style={styles.node}>
                                        {record.completed && (
                                            <Feather name="check" size={12} color="#0D9488" />
                                        )}
                                    </View>
                                </View>

                                {/* Content Card */}
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.vaccineName}>{record.vaccine}</Text>
                                        <View style={styles.dateBadge}>
                                            <Text style={styles.dateText}>{record.date}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardDetails}>
                                        <View style={styles.detailRow}>
                                            <FontAwesome5 name="syringe" size={12} color="#0D9488" style={styles.icon} />
                                            <Text style={styles.detailLabel}>Vaccine</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Feather name="map-pin" size={12} color="#0D9488" style={styles.icon} />
                                            <Text style={styles.detailText}>{record.location}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9CA3AF',
        marginTop: 12,
        marginBottom: 4,
    },
    emptyStateText: {
        fontSize: 13,
        color: '#D1D5DB',
        textAlign: 'center',
    },
    timelineContainer: {
        position: 'relative',
        paddingLeft: 16,
    },
    verticalLine: {
        position: 'absolute',
        left: 27,
        top: 8,
        bottom: 16,
        width: 2,
        backgroundColor: '#E5E7EB', // gray-200
        borderRadius: 999,
    },
    listContainer: {
        gap: 24, // space-y-6
    },
    timelineItem: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    nodeContainer: {
        position: 'absolute',
        left: 0,
        top: 6, // mt-1.5
        zIndex: 10,
    },
    node: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#CCFBF1', // teal-100
        borderWidth: 2,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    card: {
        marginLeft: 40, // ml-10
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6', // gray-100
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    vaccineName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937', // charcoal-800
        flex: 1,
        marginRight: 8,
    },
    dateBadge: {
        backgroundColor: '#F9FAFB', // gray-50
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9CA3AF', // charcoal-400
    },
    cardDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        flexWrap: 'wrap',
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 6,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6B7280', // charcoal-500
        marginRight: 4,
    },
    detailText: {
        fontSize: 12,
        color: '#6B7280', // charcoal-500
    },
});
