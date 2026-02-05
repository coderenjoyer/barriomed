import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServiceSelector, ServiceType } from '../components/selectservice';
import { QueueTicket } from '../components/queueticket';

export function QueuePage() {
    const [step, setStep] = useState<'selection' | 'ticket'>('selection');
    const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Mock data for the ticket
    const [ticketData, setTicketData] = useState({
        queueNumber: 45,
        nowServing: 38,
        peopleAhead: 7,
        estWaitTime: '30-40 mins',
    });

    const handleServiceConfirm = () => {
        if (!selectedService) return;
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setStep('ticket');
        }, 1500);
    };

    const handleCancelQueue = () => {
        setStep('selection');
        setSelectedService(null);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Decorative Background Elements (Simulated with absolute views) */}
                <View style={[styles.blurCircle, styles.blurCircleTop]} />
                <View style={[styles.blurCircle, styles.blurCircleBottom]} />

                <View style={styles.contentContainer}>
                    {step === 'selection' ? (
                        <ServiceSelector
                            selected={selectedService}
                            onSelect={setSelectedService}
                            onConfirm={handleServiceConfirm}
                            isLoading={isLoading}
                        />
                    ) : (
                        <QueueTicket
                            serviceType={selectedService!}
                            queueNumber={ticketData.queueNumber}
                            nowServing={ticketData.nowServing}
                            peopleAhead={ticketData.peopleAhead}
                            estWaitTime={ticketData.estWaitTime}
                            onCancel={handleCancelQueue}
                        />
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 100, // Space for bottom nav
    },
    contentContainer: {
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
        position: 'relative',
        zIndex: 10,
    },
    blurCircle: {
        position: 'absolute',
        borderRadius: 9999,
        opacity: 0.4,
    },
    blurCircleTop: {
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        backgroundColor: '#CCFBF1', // teal-100
    },
    blurCircleBottom: {
        bottom: -50,
        left: -50,
        width: 250,
        height: 250,
        backgroundColor: '#EFF6FF', // blue-50
    },
});