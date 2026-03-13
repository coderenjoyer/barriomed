import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, LayoutAnimation, UIManager, Platform } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import { PatientQueueItem, Patient } from './patientqueuecall'

const MOCK_PATIENTS: Patient[] = [
    {
        id: '1',
        queueNumber: 38,
        name: 'Pedro Garcia',
        service: 'checkup',
        status: 'serving',
        arrivalTime: '08:30 AM',
    },
    {
        id: '2',
        queueNumber: 39,
        name: 'Maria Santos',
        service: 'prenatal',
        status: 'arrived',
        arrivalTime: '08:45 AM',
    },
    {
        id: '3',
        queueNumber: 40,
        name: 'Juan Dela Cruz',
        service: 'dental',
        status: 'pending',
        arrivalTime: '09:00 AM',
    },
    {
        id: '4',
        queueNumber: 41,
        name: 'Ana Reyes',
        service: 'checkup',
        status: 'arrived',
        arrivalTime: '09:15 AM',
    },
    {
        id: '5',
        queueNumber: 42,
        name: 'Rosa Mendoza',
        service: 'immunization',
        status: 'pending',
        arrivalTime: '09:20 AM',
    },
]

export function QueueCommander() {
    const navigation = useNavigation()
    const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS)
    const [missedPatients, setMissedPatients] = useState<Patient[]>([])
    const [showMissed, setShowMissed] = useState(false)
    const currentPatient = patients.find((p) => p.status === 'serving')
    const nextPatient = patients.find((p) => p.status !== 'serving')

    const handleCallNext = () => {
        if (!nextPatient) return
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPatients((prev) => {
            const newPatients = [...prev]
            if (currentPatient) {
                const idx = newPatients.findIndex((p) => p.id === currentPatient.id)
                if (idx !== -1) newPatients.splice(idx, 1)
            }
            const nextIdx = newPatients.findIndex((p) => p.id === nextPatient.id)
            if (nextIdx !== -1) {
                newPatients[nextIdx] = {
                    ...newPatients[nextIdx],
                    status: 'serving',
                }
            }
            return newPatients
        })
    }

    const handleNoShow = () => {
        if (!currentPatient) return
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMissedPatients((prev) => [
            {
                ...currentPatient,
                status: 'missed',
            },
            ...prev,
        ])
        handleCallNext()
    }

    const handleCompleted = () => {
        handleCallNext()
    }

    const toggleMissed = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowMissed(!showMissed);
    }

    return (
        <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ flexGrow: 1 }}>
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
                                    {patients.length - (currentPatient ? 1 : 0)} Waiting
                                </Text>
                            </View>
                        </View>

                        <ScrollView className="flex-1 p-4" nestedScrollEnabled={true}>
                            {patients
                                .filter((p) => p.status !== 'serving')
                                .map((patient, index) => (
                                    <View key={patient.id} className="mb-3">
                                        <PatientQueueItem
                                            patient={patient}
                                            isNext={index === 0}
                                        />
                                    </View>
                                ))}
                            {patients.filter((p) => p.status !== 'serving').length === 0 && (
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
                            className="w-full py-5 bg-teal-600 rounded-2xl shadow-lg flex-row items-center justify-center gap-3"
                        >
                            <Feather name="mic" size={24} color="white" />
                            <Text className="text-white font-bold text-lg">CALL NEXT</Text>
                        </TouchableOpacity>

                        <View className="flex-row gap-4">
                            <TouchableOpacity
                                onPress={handleNoShow}
                                className="flex-1 py-4 bg-amber-50 border border-amber-200 rounded-2xl flex-col items-center justify-center gap-2"
                            >
                                <Feather name="user-x" size={20} color="#D97706" />
                                <Text className="text-amber-700 font-bold text-sm">NO SHOW</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCompleted}
                                className="flex-1 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex-col items-center justify-center gap-2"
                            >
                                <Feather name="check-square" size={20} color="#059669" />
                                <Text className="text-emerald-700 font-bold text-sm">COMPLETED</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="h-px bg-gray-100 my-2" />

                        <TouchableOpacity
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
                                            <TouchableOpacity>
                                                <Text className="text-xs font-bold text-teal-600">Recall</Text>
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
        </ScrollView>
    )
}

