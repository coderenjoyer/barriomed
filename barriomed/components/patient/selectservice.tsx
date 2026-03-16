import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';

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
        color: '#F0FDFA',
        iconColor: '#0D9488',
    },
    {
        id: 'prenatal',
        title: 'Prenatal Care',
        description: 'Maternal health & check-ups',
        icon: 'baby-carriage',
        Lib: FontAwesome5,
        color: '#FDF2F8',
        iconColor: '#DB2777',
    },
    {
        id: 'immunization',
        title: 'Immunization',
        description: 'Vaccines for babies & adults',
        icon: 'syringe',
        Lib: FontAwesome5,
        color: '#F0FDF4',
        iconColor: '#16A34A',
    },
    {
        id: 'dental',
        title: 'Dental Services',
        description: 'Tooth extraction & cleaning',
        icon: 'smile',
        Lib: Feather,
        color: '#EFF6FF',
        iconColor: '#2563EB',
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
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Kuha ng Pila</Text>
                <Text style={styles.subtitle}>Select the service you need today</Text>
            </View>

            {/* Service Cards */}
            <View style={styles.grid}>
                {services.map((service) => {
                    const isSelected = selected === service.id;
                    const IconLib = service.Lib;

                    return (
                        <TouchableOpacity
                            key={service.id}
                            onPress={() => onSelect(service.id as ServiceType)}
                            activeOpacity={0.75}
                            style={[
                                styles.card,
                                isSelected && styles.cardSelected,
                            ]}
                        >
                            {/* Icon */}
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: service.color },
                                ]}
                            >
                                <IconLib
                                    name={service.icon as any}
                                    size={22}
                                    color={service.iconColor}
                                />
                            </View>

                            {/* Text */}
                            <View style={styles.textContainer}>
                                <Text style={styles.serviceTitle}>{service.title}</Text>
                                <Text style={styles.serviceDescription}>
                                    {service.description}
                                </Text>
                            </View>

                            {/* Selected check */}
                            {isSelected && (
                                <View style={styles.checkContainer}>
                                    <Feather name="check" size={11} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
                onPress={onConfirm}
                disabled={!selected || isLoading}
                activeOpacity={0.85}
                style={[
                    styles.confirmButton,
                    (!selected || isLoading) && styles.confirmButtonDisabled,
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
        paddingHorizontal: 20,   // ← fixes edge-to-edge cards
        paddingTop: 8,
        paddingBottom: 32,
    },

    /* ── Header ── */
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        color: '#9CA3AF',
    },

    /* ── Grid ── */
    grid: {
        gap: 12,
        marginBottom: 28,
    },

    /* ── Card ── */
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardSelected: {
        borderColor: '#0D9488',
        backgroundColor: '#F0FDFA',
        shadowColor: '#0D9488',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
    },

    /* ── Icon ── */
    iconContainer: {
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },

    /* ── Text ── */
    textContainer: {
        flex: 1,
    },
    serviceTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    serviceDescription: {
        fontSize: 12,
        color: '#9CA3AF',
        lineHeight: 17,
    },

    /* ── Check badge ── */
    checkContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },

    /* ── Confirm button ── */
    confirmButton: {
        width: '100%',
        backgroundColor: '#0D9488',
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmButtonDisabled: {
        backgroundColor: '#E5E7EB',
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});