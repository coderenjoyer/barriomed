import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, LayoutAnimation, UIManager, Platform, ActivityIndicator, Modal, TextInput, Alert, RefreshControl } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import { PatientQueueItem, Patient } from './patientqueuecall'
import { queueService, QueueStatus } from '../../lib/queueService'
import { supabase } from '../../lib/supabase'
import { ServiceType } from '../patient/selectservice'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function QueueCommander() {
    const navigation = useNavigation()
    const [patients, setPatients] = useState<Patient[]>([])
    const [missedPatients, setMissedPatients] = useState<Patient[]>([])
    const [showMissed, setShowMissed] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [selectedService, setSelectedService] = useState<ServiceType | 'all'>('all')
    
    // Walk-in Modal State
    const [walkInModalVisible, setWalkInModalVisible] = useState(false)
    const [walkInName, setWalkInName] = useState('')
    const [walkInService, setWalkInService] = useState<ServiceType>('checkup')

    const currentPatient = patients.find((p) => p.status === 'serving')
    const waitingPatients = patients.filter((p) => p.status === 'pending' || p.status === 'arrived')

    const fetchQueue = useCallback(async () => {
        try {
            const data = await queueService.getQueueList(selectedService === 'all' ? undefined : selectedService);
            
            const mappedPatients: Patient[] = data.map((item: any) => ({
                id: item.id,
                queueNumber: item.queue_number,
                name: item.patient_name || (item.users ? `${item.users.first_name} ${item.users.last_name}` : 'Unknown'),
                service: item.service_type as ServiceType,
                status: mapDbStatusToUi(item.status),
                arrivalTime: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setPatients(mappedPatients.filter(p => p.status !== 'missed'));
            setMissedPatients(mappedPatients.filter(p => p.status === 'missed'));
        } catch (error) {
            console.error('Error fetching queue:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedService]);

    const mapDbStatusToUi = (status: string): Patient['status'] => {
        switch (status) {
            case 'Serving': return 'serving';
            case 'Waiting': return 'pending';
            case 'No Show': return 'missed';
            case 'Completed': return 'completed';
            default: return 'pending';
        }
    };

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchQueue();
        
        // Listen to active realtime changes
        const unsubscribeQueue = queueService.subscribeToStaffQueue(() => {
            fetchQueue();
        });

        // Listen for session stabilizations after logins to prevent RLS hiding active rows
        const { data: authListener } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            if (session) {
                fetchQueue();
            }
        });

        return () => {
            unsubscribeQueue();
            authListener.subscription.unsubscribe();
        }
    }, [fetchQueue]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchQueue();
        setRefreshing(false);
    }, [fetchQueue]);

    const handleCallNext = async () => {
        if (waitingPatients.length === 0) {
            Alert.alert('Empty Queue', 'No patients in waiting list.');
            return;
        }
        
        // If there's a currently serving patient, we should probably mark them as complete first
        // or let the staff decide. The requirement says CALL NEXT increments currently_serving.
        
        setIsActionLoading(true);
        try {
            // we determine the service type to call next
            // if 'all' is selected, we take the one from the first waiting patient
            const serviceToCall = selectedService === 'all' ? waitingPatients[0].service : selectedService;
            await queueService.callNext(serviceToCall);
            // fetchQueue() will be called by subscription
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to call next patient');
        } finally {
            setIsActionLoading(false);
        }
    }

    const handleNoShow = async () => {
        if (!currentPatient) return
        setIsActionLoading(true);
        try {
            await queueService.markNoShow(currentPatient.id);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to mark as no show');
        } finally {
            setIsActionLoading(false);
        }
    }

    const handleCompleted = async () => {
        if (!currentPatient) return
        setIsActionLoading(true);
        try {
            await queueService.completePatient(currentPatient.id);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to mark as completed');
        } finally {
            setIsActionLoading(false);
        }
    }

    const handleReinsert = async (id: string) => {
        setIsActionLoading(true);
        try {
            await queueService.reinsertPatient(id);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reinsert patient');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddWalkIn = async () => {
        if (!walkInName.trim()) {
            Alert.alert('Validation Error', 'Please enter patient name');
            return;
        }
        setIsActionLoading(true);
        try {
            await queueService.registerWalkIn(walkInName, walkInService);
            setWalkInModalVisible(false);
            setWalkInName('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to register walk-in');
        } finally {
            setIsActionLoading(false);
        }
    };

    const toggleMissed = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowMissed(!showMissed);
    }

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#0D9488" />
            </View>
        );
    }

    return (
        <ScrollView 
            className="flex-1 bg-gray-50" 
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0D9488"]} />
            }
        >
            <View className="flex-1 flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* LEFT PANEL - QUEUE LIST */}
                <View className="flex-1 flex-col gap-6">
                    {/* Now Serving Display */}
                    <View className="bg-teal-600 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                        <View className="absolute -top-5 -right-5 p-8 opacity-10">
                            <Feather name="mic" size={160} color="white" />
                        </View>

                        <View className="relative z-10">
                            <Text className="text-teal-100 font-medium uppercase tracking-widest mb-2">
                                Now Serving
                            </Text>
                            <View className="flex-row items-end gap-4">
                                <Text className="text-7xl font-bold tracking-tight text-white m-0 p-0 leading-none">
                                    #{currentPatient?.queueNumber || '--'}
                                </Text>
                                {currentPatient && (
                                    <View className="flex-col pb-2">
                                        <Text className="text-2xl font-bold text-white mb-1">
                                            {currentPatient.name}
                                        </Text>
                                        <Text className="text-teal-100 opacity-80 font-medium">
                                            {currentPatient.service.toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Waiting List */}
                    <View className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex-col overflow-hidden min-h-[400px]">
                        <View className="p-6 border-b border-gray-50 flex-row items-center justify-between bg-gray-50">
                            <View className="flex-row items-center gap-2">
                                <Feather name="users" size={20} color="#0D9488" />
                                <Text className="font-bold text-gray-800 text-lg">
                                    Up Next
                                </Text>
                            </View>
                            <View className="bg-white px-3 py-1 rounded-full border border-gray-100">
                                <Text className="text-sm text-gray-500 font-medium">
                                    {waitingPatients.length} Waiting
                                </Text>
                            </View>
                        </View>

                        <ScrollView className="flex-1 p-4" nestedScrollEnabled={true}>
                            {waitingPatients.map((patient, index) => (
                                    <View key={patient.id} className="mb-3">
                                        <PatientQueueItem
                                            patient={patient}
                                            isNext={index === 0}
                                        />
                                    </View>
                                ))}
                            {waitingPatients.length === 0 && (
                                <View className="items-center py-12">
                                    <Text className="text-gray-400">Queue is empty</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>

                {/* RIGHT PANEL - ACTIONS */}
                <View className="w-full flex-col gap-6 lg:w-[400px]">
                    <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-col gap-4">
                        <Text className="font-bold text-gray-900 mb-2 text-lg">Queue Controls</Text>

                        <TouchableOpacity
                            onPress={handleCallNext}
                            disabled={isActionLoading}
                            className={`w-full py-5 rounded-2xl shadow-lg flex-row items-center justify-center gap-3 ${isActionLoading ? 'bg-teal-400' : 'bg-teal-600'}`}
                        >
                            {isActionLoading ? <ActivityIndicator color="white" /> : <Feather name="mic" size={24} color="white" />}
                            <Text className="text-white font-bold text-lg">CALL NEXT</Text>
                        </TouchableOpacity>

                        <View className="flex-row gap-4">
                            <TouchableOpacity
                                onPress={handleNoShow}
                                disabled={!currentPatient || isActionLoading}
                                className={`flex-1 py-4 border rounded-2xl flex-col items-center justify-center gap-2 ${!currentPatient ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200'}`}
                            >
                                <Feather name="user-x" size={20} color={!currentPatient ? '#9CA3AF' : '#D97706'} />
                                <Text className={`font-bold text-sm ${!currentPatient ? 'text-gray-400' : 'text-amber-700'}`}>NO SHOW</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCompleted}
                                disabled={!currentPatient || isActionLoading}
                                className={`flex-1 py-4 border rounded-2xl flex-col items-center justify-center gap-2 ${!currentPatient ? 'bg-gray-50 border-gray-200' : 'bg-emerald-50 border-emerald-200'}`}
                            >
                                <Feather name="check-square" size={20} color={!currentPatient ? '#9CA3AF' : '#059669'} />
                                <Text className={`font-bold text-sm ${!currentPatient ? 'text-gray-400' : 'text-emerald-700'}`}>COMPLETED</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="h-px bg-gray-100 my-2" />

                        <TouchableOpacity
                            onPress={() => setWalkInModalVisible(true)}
                            className="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl flex-row items-center justify-center gap-2"
                        >
                            <Feather name="user-plus" size={16} color="#374151" />
                            <Text className="text-gray-700 font-semibold text-sm">Insert Walk-In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('Inventory' as never)}
                            className="w-full py-3 bg-indigo-50 border border-indigo-200 rounded-xl flex-row items-center justify-center gap-2"
                        >
                            <Feather name="package" size={16} color="#4F46E5" />
                            <Text className="text-indigo-700 font-semibold text-sm">Manage Inventory</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Missed List Section */}
                    <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
                        <TouchableOpacity
                            onPress={toggleMissed}
                            className="w-full p-4 flex-row items-center justify-between bg-white"
                        >
                            <View className="flex-row items-center gap-2">
                                <Feather name="rotate-ccw" size={16} color="#374151" />
                                <Text className="font-bold text-gray-700 text-base">Missed List</Text>
                                {missedPatients.length > 0 && (
                                    <View className="bg-rose-100 px-2 py-0.5 rounded-full">
                                        <Text className="text-rose-600 text-xs font-bold">
                                            {missedPatients.length}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text className="text-xs text-gray-400 font-medium">
                                {showMissed ? 'Hide' : 'Show'}
                            </Text>
                        </TouchableOpacity>

                        {showMissed && (
                            <View className="p-4 pt-0">
                                {missedPatients.length > 0 ? (
                                    missedPatients.map((p) => (
                                        <View
                                            key={p.id}
                                            className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 mt-2"
                                        >
                                            <View className="flex-row items-center gap-3">
                                                <Text className="font-bold text-gray-500">
                                                    #{p.queueNumber}
                                                </Text>
                                                <Text className="text-sm font-medium text-gray-700">
                                                    {p.name}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => handleReinsert(p.id)}>
                                                <Text className="text-xs font-bold text-teal-600">Re-insert</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                ) : (
                                    <View className="items-center py-4 mt-2">
                                        <Text className="text-gray-400 text-sm">
                                            No missed patients
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Walk-in Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={walkInModalVisible}
                onRequestClose={() => setWalkInModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Add Walk-In Patient</Text>
                            <TouchableOpacity onPress={() => setWalkInModalVisible(false)}>
                                <Feather name="x" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-sm font-medium text-gray-700 mb-2">Patient Name</Text>
                        <TextInput
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholder="Full Name"
                            value={walkInName}
                            onChangeText={setWalkInName}
                        />

                        <Text className="text-sm font-medium text-gray-700 mb-2">Service Type</Text>
                        <View className="flex-row flex-wrap gap-2 mb-8">
                            {['checkup', 'prenatal', 'immunization', 'dental'].map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => setWalkInService(s as ServiceType)}
                                    className={`px-4 py-2 rounded-full border ${walkInService === s ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs font-bold capitalize ${walkInService === s ? 'text-white' : 'text-gray-600'}`}>
                                        {s}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={handleAddWalkIn}
                            disabled={isActionLoading}
                            className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 ${isActionLoading ? 'bg-teal-400' : 'bg-teal-600'}`}
                        >
                            {isActionLoading && <ActivityIndicator color="white" />}
                            <Text className="text-white font-bold text-lg">REGISTER PATIENT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    )
}


