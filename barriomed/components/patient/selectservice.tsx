import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export type ServiceType = 'checkup' | 'prenatal' | 'immunization' | 'dental';

interface ServiceSelectorProps {
    selected: ServiceType | null;
    onSelect: (service: ServiceType) => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

const services = [
    {
        id: 'checkup',
        title: 'General Check-up',
        description: 'Consultation for common illnesses',
        icon: 'stethoscope',
        Lib: FontAwesome5,
        color: '#F0FDFA', // bg-teal-50
        iconColor: '#0D9488', // text-teal-600
        borderColor: '#CCFBF1', // border-teal-100
    },
    {
        id: 'prenatal',
        title: 'Prenatal Care',
        description: 'Maternal health & check-ups',
        icon: 'baby-carriage',
        Lib: FontAwesome5,
        color: '#FDF2F8', // bg-pink-50
        iconColor: '#DB2777', // text-pink-600
        borderColor: '#FCE7F3', // border-pink-100
    },
    {
        id: 'immunization',
        title: 'Immunization',
        description: 'Vaccines for babies & adults',
        icon: 'syringe',
        Lib: FontAwesome5,
        color: '#F0FDF4', // bg-green-50
        iconColor: '#16A34A', // text-green-600
        borderColor: '#DCFCE7', // border-green-100
    },
    {
        id: 'dental',
        title: 'Dental Services',
        description: 'Tooth extraction & cleaning',
        icon: 'smile',
        Lib: Feather,
        color: '#EFF6FF', // bg-blue-50
        iconColor: '#2563EB', // text-blue-600
        borderColor: '#DBEAFE', // border-blue-100
    },
] as const;

export function ServiceSelector({
    selected,
    onSelect,
    onConfirm,
    isLoading,
}: ServiceSelectorProps) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Kuha ng Pila</Text>
                <Text style={styles.subtitle}>Select the service you need today</Text>
            </View>

            <View style={styles.grid}>
                {services.map((service) => {
                    const isSelected = selected === service.id;
                    const IconLib = service.Lib;

                    return (
                        <TouchableOpacity
                            key={service.id}
                            onPress={() => onSelect(service.id as ServiceType)}
                            activeOpacity={0.7}
                            style={[
                                styles.card,
                                { borderColor: isSelected ? '#0D9488' : 'transparent' },
                                isSelected && styles.cardSelected
                            ]}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: service.color }
                                ]}
                            >
                                <IconLib name={service.icon as any} size={24} color={service.iconColor} />
                            </View>

                            <View style={styles.textContainer}>
                                <Text style={styles.serviceTitle}>{service.title}</Text>
                                <Text style={styles.serviceDescription}>{service.description}</Text>
                            </View>

                            {isSelected && (
                                <View style={styles.checkContainer}>
                                    <Feather name="check" size={12} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity
                onPress={onConfirm}
                disabled={!selected || isLoading}
                style={[
                    styles.confirmButton,
                    (!selected || isLoading) && styles.confirmButtonDisabled
                ]}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.confirmButtonText}>Get My Number</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    grid: {
        gap: 16,
        marginBottom: 32,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardSelected: {
        borderColor: '#CCFBF1', // Light teal border
        backgroundColor: '#F0FDFA', // Very light teal background tint if desired, usually standard white with border is clearer
        shadowColor: '#0D9488',
        shadowOpacity: 0.1,
        elevation: 4,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    serviceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    serviceDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    checkContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButton: {
        width: '100%',
        backgroundColor: '#0D9488',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        flexDirection: 'row',
        gap: 8,
    },
    confirmButtonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

