import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, LayoutAnimation, UIManager, Platform, ActivityIndicator, Modal, TextInput, Alert, RefreshControl } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import { PatientQueueItem, Patient } from './patientqueuecall'
import { queueService, QueueStatus } from '../../backend/lib/queueService'
import { supabase } from '../../backend/lib/supabase'
import { useAuth } from '../../backend/lib/AuthContext'
import { ServiceType } from '../patient/patient/selectservice'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function QueueCommander() {
    const navigation = useNavigation()
    const { userProfile, session } = useAuth()

    // Auth mappings
    const myStaffId = userProfile?.id ?? session?.user?.id ?? 'unknown'
    const myFirstName = userProfile?.first_name ?? session?.user?.user_metadata?.first_name ?? ''
    const myLastName = userProfile?.last_name ?? session?.user?.user_metadata?.last_name ?? ''
    const myStaffName = [myFirstName, myLastName].filter(Boolean).join(' ') || 'Health Staff'

    // Realtime Presence States
    const [activeController, setActiveController] = useState<{ id: string, name: string } | null>(null)
    const [presenceChannel, setPresenceChannel] = useState<any>(null)

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
    const nextPatient = waitingPatients.length > 0 ? waitingPatients[0] : null

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

        // Listen to active realtime queue changes
        const unsubscribeQueue = queueService.subscribeToStaffQueue(() => {
            fetchQueue();
        });

        // -------------------------------------------------------------
        // Setup Realtime Presence for Controller Lock
        // -------------------------------------------------------------
        const channel = supabase.channel('queue_controller_presence', {
            config: {
                presence: { key: myStaffId }
            }
        });

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            let allUsers: any[] = [];
            for (const id in state) {
                allUsers = [...allUsers, ...state[id]];
            }

            const controllers = allUsers.filter(u => u.requestedLockAt !== null);
            if (controllers.length > 0) {
                controllers.sort((a, b) => a.requestedLockAt - b.requestedLockAt);
                setActiveController({ id: controllers[0].id, name: controllers[0].name });
            } else {
                setActiveController(null);
            }
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    id: myStaffId,
                    name: myStaffName,
                    requestedLockAt: null
                });
            }
        });

        setPresenceChannel(channel);
        // -------------------------------------------------------------

        // Listen for session stabilizations after logins to prevent RLS hiding active rows
        const { data: authListener } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            if (session) {
                fetchQueue();
            }
        });

        return () => {
            unsubscribeQueue();
            authListener.subscription.unsubscribe();
            channel.unsubscribe();
        }
    }, [fetchQueue, myStaffId, myStaffName]);

    const isController = activeController?.id === myStaffId;

    const requestControl = async () => {
        if (presenceChannel) {
            await presenceChannel.track({
                id: myStaffId,
                name: myStaffName,
                requestedLockAt: Date.now()
            });
        }
    };

    const releaseControl = async () => {
        if (presenceChannel) {
            await presenceChannel.track({
                id: myStaffId,
                name: myStaffName,
                requestedLockAt: null
            });
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchQueue();
        setRefreshing(false);
    }, [fetchQueue]);

    const handleCallNext = async () => {
        console.log('[QueueCommander] handleCallNext pressed. waitingPatients:', waitingPatients.length, 'currentPatient:', currentPatient?.queueNumber);

        if (waitingPatients.length === 0) {
            Alert.alert('Empty Queue', 'No patients in waiting list.');
            return;
        }

        // If there's a patient currently being served, confirm before replacing them
        if (currentPatient) {
            Alert.alert(
                'Patient Still Being Served',
                `#${currentPatient.queueNumber} (${currentPatient.name}) is still being served. Would you like to mark them as complete and call the next patient?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Complete & Call Next', style: 'default', onPress: () => doCallNext() },
                ]
            );
            return;
        }

        await doCallNext();
    }

    const doCallNext = async () => {
        setIsActionLoading(true);
        try {
            const serviceToCall = selectedService === 'all' ? waitingPatients[0]?.service : selectedService;
            console.log('[QueueCommander] doCallNext calling with serviceType:', serviceToCall);
            const result = await queueService.callNext(serviceToCall);
            console.log('[QueueCommander] callNext result:', JSON.stringify(result));

            if (!result || (Array.isArray(result) && result.length === 0)) {
                Alert.alert('No Match', 'No waiting patient found in the database for this service type. Try refreshing.');
            }

            // Force refresh in case realtime subscription misses the update
            await fetchQueue();
        } catch (error: any) {
            console.error('[QueueCommander] callNext error:', error);
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

    const handleCompleteAndCallNext = async () => {
        if (!currentPatient) return;
        if (waitingPatients.length === 0) {
            // No one next — just complete the current patient
            await handleCompleted();
            return;
        }
        setIsActionLoading(true);
        try {
            const serviceToCall = selectedService === 'all' ? waitingPatients[0].service : selectedService;
            // call_next RPC auto-completes the current patient and promotes the next one
            await queueService.callNext(serviceToCall);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to complete and call next');
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

    const getServiceLabel = (type: ServiceType) => {
        switch (type) {
            case 'checkup': return 'Check-up';
            case 'prenatal': return 'Prenatal';
            case 'immunization': return 'Immunization';
            case 'dental': return 'Dental';
            default: return type;
        }
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
                    <View className={`rounded-3xl p-8 shadow-xl relative overflow-hidden ${currentPatient ? 'bg-teal-600' : 'bg-gray-400'}`}>
                        <View className="absolute -top-5 -right-5 p-8 opacity-10">
                            <Feather name={currentPatient ? "mic" : "pause-circle"} size={160} color="white" />
                        </View>

                        <View className="relative z-10">
                            <Text className={`font-medium uppercase tracking-widest mb-2 ${currentPatient ? 'text-teal-100' : 'text-gray-200'}`}>
                                {currentPatient ? 'Now Serving' : 'No Patient Being Served'}
                            </Text>

                            {currentPatient ? (
                                <>
                                    <View className="flex-row items-end gap-4 mb-4">
                                        <Text className="text-7xl font-bold tracking-tight text-white m-0 p-0 leading-none">
                                            #{currentPatient.queueNumber}
                                        </Text>
                                        <View className="flex-col pb-2">
                                            <Text className="text-2xl font-bold text-white mb-1">
                                                {currentPatient.name}
                                            </Text>
                                            <Text className={`font-medium ${currentPatient ? 'text-teal-100 opacity-80' : 'text-gray-300'}`}>
                                                {getServiceLabel(currentPatient.service)} • Arrived {currentPatient.arrivalTime}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Inline Actions for Current Patient */}
                                    <View className="flex-row gap-3 mt-2">
                                        <TouchableOpacity
                                            onPress={handleCompleted}
                                            disabled={isActionLoading || !isController}
                                            className={`flex-1 py-3 rounded-2xl flex-row items-center justify-center gap-2 border ${(!isController) ? 'bg-white/10 border-white/10 opacity-50' : 'bg-white/20 border-white/30'}`}
                                        >
                                            {isActionLoading ? (
                                                <ActivityIndicator color="white" size="small" />
                                            ) : (
                                                <Feather name="check-circle" size={18} color="white" />
                                            )}
                                            <Text className="text-white font-bold text-sm">MARK COMPLETE</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={handleNoShow}
                                            disabled={isActionLoading || !isController}
                                            className={`py-3 px-5 rounded-2xl flex-row items-center justify-center gap-2 border ${(!isController) ? 'bg-white/5 border-white/5 opacity-50' : 'bg-white/10 border-white/20'}`}
                                        >
                                            <Feather name="user-x" size={18} color="white" />
                                            <Text className="text-white font-bold text-sm">NO SHOW</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <View className="flex-row items-end gap-4">
                                    <Text className="text-7xl font-bold tracking-tight text-white m-0 p-0 leading-none opacity-40">
                                        #--
                                    </Text>
                                    <View className="flex-col pb-2">
                                        <Text className="text-lg text-white opacity-60">
                                            Press "Call Next" to serve the next patient
                                        </Text>
                                    </View>
                                </View>
                            )}
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
                        <View className="flex-col gap-2 mb-2">
                            <View className="flex-row items-center justify-between">
                                <Text className="font-bold text-gray-900 text-lg">Queue Controls</Text>
                                <View className={`px-2 py-1 rounded-full border ${isController ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${isController ? 'text-emerald-700' : 'text-amber-700'}`}>
                                        {isController ? 'Controller Mode' : 'View Only'}
                                    </Text>
                                </View>
                            </View>

                            {!isController ? (
                                <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex-col gap-3 mt-1">
                                    <Text className="text-gray-600 text-xs font-medium text-center">
                                        {activeController ? `${activeController.name} is currently managing the queue.` : 'No one is managing the queue right now.'}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={requestControl}
                                        className="w-full py-2.5 bg-teal-600 rounded-xl flex-row justify-center items-center gap-2"
                                    >
                                        <Feather name="lock" size={14} color="white" />
                                        <Text className="text-white font-bold text-sm">Take Control</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex-row justify-between items-center mt-1 mb-2">
                                    <Text className="text-emerald-800 text-xs font-semibold">You hold the queue lock</Text>
                                    <TouchableOpacity onPress={releaseControl} className="bg-white px-2 py-1 rounded-lg border border-emerald-200">
                                        <Text className="text-emerald-700 text-[10px] font-bold uppercase">Release</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Call Next Button - Primary action */}
                        <TouchableOpacity
                            onPress={handleCallNext}
                            disabled={isActionLoading || !isController}
                            className={`w-full py-5 rounded-2xl shadow-lg flex-row items-center justify-center gap-3 ${(!isController) ? 'bg-gray-300 opacity-80' : (isActionLoading ? 'bg-teal-400' : 'bg-teal-600')}`}
                        >
                            {isActionLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Feather name="mic" size={24} color={!isController ? "#6B7280" : "white"} />
                            )}
                            <Text className={`font-bold text-lg ${!isController ? 'text-gray-600' : 'text-white'}`}>CALL NEXT</Text>
                        </TouchableOpacity>

                        {/* Preview of who is next */}
                        {nextPatient && (
                            <View className="bg-gray-50 rounded-xl p-3 flex-row items-center gap-3 border border-gray-100">
                                <View className="w-8 h-8 rounded-lg bg-teal-100 items-center justify-center">
                                    <Text className="text-teal-700 font-bold text-sm">#{nextPatient.queueNumber}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-800">{nextPatient.name}</Text>
                                    <Text className="text-xs text-gray-500">{getServiceLabel(nextPatient.service)}</Text>
                                </View>
                                <View className="bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
                                    <Text className="text-[10px] font-bold text-teal-600 uppercase">Next Up</Text>
                                </View>
                            </View>
                        )}

                        {/* Complete & Call Next shortcut (only available when someone is being served AND there's a next patient) */}
                        {currentPatient && nextPatient && (
                            <TouchableOpacity
                                onPress={handleCompleteAndCallNext}
                                disabled={isActionLoading || !isController}
                                className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-2 border-2 ${!isController ? 'border-gray-200 bg-gray-50 opacity-60' :
                                    (isActionLoading ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-300 bg-emerald-50')
                                    }`}
                            >
                                {isActionLoading ? (
                                    <ActivityIndicator color={!isController ? "#9CA3AF" : "#059669"} size="small" />
                                ) : (
                                    <>
                                        <Feather name="check-circle" size={18} color={!isController ? "#9CA3AF" : "#059669"} />
                                        <Feather name="arrow-right" size={14} color={!isController ? "#9CA3AF" : "#059669"} />
                                        <Feather name="mic" size={18} color={!isController ? "#9CA3AF" : "#059669"} />
                                    </>
                                )}
                                <Text className={`font-bold text-sm ${!isController ? 'text-gray-400' : 'text-emerald-700'}`}>COMPLETE & CALL NEXT</Text>
                            </TouchableOpacity>
                        )}

                        <View className="h-px bg-gray-100 my-2" />

                        <TouchableOpacity
                            onPress={() => setWalkInModalVisible(true)}
                            disabled={!isController}
                            className={`w-full py-3 rounded-xl flex-row items-center justify-center gap-2 border ${!isController ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-gray-50 border-gray-200'}`}
                        >
                            <Feather name="user-plus" size={16} color={!isController ? "#9CA3AF" : "#374151"} />
                            <Text className={`font-semibold text-sm ${!isController ? 'text-gray-400' : 'text-gray-700'}`}>Insert Walk-In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('Inventory' as never)}
                            className="w-full py-3 bg-indigo-50 border border-indigo-200 rounded-xl flex-row items-center justify-center gap-2"
                        >
                            <Feather name="package" size={16} color="#4F46E5" />
                            <Text className="text-indigo-700 font-semibold text-sm">Manage Inventory</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('QueueHistory' as never)}
                            className="w-full py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex-row items-center justify-center gap-2"
                        >
                            <Feather name="clock" size={16} color="#059669" />
                            <Text className="text-emerald-700 font-semibold text-sm">Queue History</Text>
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
                                            <TouchableOpacity
                                                onPress={() => handleReinsert(p.id)}
                                                disabled={!isController}
                                            >
                                                <Text className={`text-xs font-bold ${!isController ? 'text-gray-400' : 'text-teal-600'}`}>Re-insert</Text>
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
                            disabled={isActionLoading || !isController}
                            className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 ${!isController ? 'bg-gray-300' : (isActionLoading ? 'bg-teal-400' : 'bg-teal-600')}`}
                        >
                            {isActionLoading && <ActivityIndicator color="white" />}
                            <Text className={`font-bold text-lg ${!isController ? 'text-gray-500' : 'text-white'}`}>REGISTER PATIENT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    )
}
