import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { queueService } from '../../lib/queueService';
import { PatientQueueItem, Patient } from './patientqueuecall';
import { ServiceType } from '../patient/patient/selectservice';

export function QueueHistory() {
    const [history, setHistory] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHistory = useCallback(async () => {
        try {
            const data = await queueService.getQueueHistory();
            const mappedHistory: Patient[] = data.map((item: any) => ({
                id: item.id,
                queueNumber: item.queue_number,
                name: item.patient_name,
                service: item.service_type as ServiceType,
                status: 'completed',
                arrivalTime: new Date(item.completed_at || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));

            setHistory(mappedHistory);
        } catch (error) {
            console.error('Error fetching queue history:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();

        const unsubscribe = queueService.subscribeToQueueHistory(() => {
            fetchHistory();
        });

        return () => {
            unsubscribe();
        };
    }, [fetchHistory]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchHistory();
        setRefreshing(false);
    }, [fetchHistory]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#0D9488" />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            contentContainerStyle={{ flexGrow: 1, padding: 24 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0D9488"]} />
            }
        >
            <View className="max-w-7xl mx-auto w-full">
                <View className="bg-white rounded-3xl border border-gray-100 shadow-sm flex-col overflow-hidden min-h-[400px]">
                    <View className="p-6 border-b border-gray-50 flex-row items-center justify-between bg-gray-50">
                        <View className="flex-row items-center gap-2">
                            <Feather name="clock" size={20} color="#0D9488" />
                            <Text className="font-bold text-gray-800 text-lg">
                                Completed Queues
                            </Text>
                        </View>
                        <View className="bg-white px-3 py-1 rounded-full border border-gray-100">
                            <Text className="text-sm text-gray-500 font-medium">
                                {history.length} Records
                            </Text>
                        </View>
                    </View>

                    <View className="p-4">
                        {history.length > 0 ? (
                            history.map((patient) => (
                                <View key={patient.id} className="mb-3">
                                    <PatientQueueItem
                                        patient={patient}
                                        isNext={false}
                                    />
                                </View>
                            ))
                        ) : (
                            <View className="items-center py-12">
                                <Feather name="inbox" size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-4 font-medium">No completed queues found.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
