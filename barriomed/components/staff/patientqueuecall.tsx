import React, { useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { ServiceType } from '../patient/selectservice'

export interface Patient {
    id: string
    queueNumber: number
    name: string
    service: ServiceType
    status: 'serving' | 'arrived' | 'pending' | 'completed' | 'missed'
    arrivalTime: string
}

interface PatientQueueItemProps {
    patient: Patient
    isNext?: boolean
}

export function PatientQueueItem({ patient, isNext }: PatientQueueItemProps) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const getServiceStyles = (type: ServiceType) => {
        switch (type) {
            case 'checkup':
                return { view: 'bg-teal-100 border-teal-200', text: 'text-teal-700' }
            case 'prenatal':
                return { view: 'bg-pink-100 border-pink-200', text: 'text-pink-700' }
            case 'immunization':
                return { view: 'bg-green-100 border-green-200', text: 'text-green-700' }
            case 'dental':
                return { view: 'bg-blue-100 border-blue-200', text: 'text-blue-700' }
            default:
                return { view: 'bg-gray-100 border-gray-200', text: 'text-gray-700' }
        }
    }

    const getServiceLabel = (type: ServiceType) => {
        switch (type) {
            case 'checkup':
                return 'Check-up'
            case 'prenatal':
                return 'Prenatal'
            case 'immunization':
                return 'Immunization'
            case 'dental':
                return 'Dental'
            default:
                return 'Unknown'
        }
    }

    const getStatusBadge = (status: Patient['status']) => {
        switch (status) {
            case 'serving':
                return (
                    <View className="flex-row items-center gap-1 bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
                        <Text className="text-xs font-bold text-teal-600">Now Serving</Text>
                    </View>
                )
            case 'arrived':
                return (
                    <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        <Feather name="check-circle" size={12} color="#059669" />
                        <Text className="text-xs font-medium text-emerald-600">Arrived</Text>
                    </View>
                )
            case 'pending':
                return (
                    <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                        <Feather name="clock" size={12} color="#D97706" />
                        <Text className="text-xs font-medium text-amber-600">Pending</Text>
                    </View>
                )
            case 'missed':
                return (
                    <View className="flex-row items-center gap-1 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
                        <Text className="text-xs font-medium text-rose-600">Missed</Text>
                    </View>
                )
            default:
                return null
        }
    }

    return (
        <Animated.View
            style={{ opacity, transform: [{ translateY }] }}
            className={`p-4 rounded-2xl border ${isNext ? 'bg-teal-50/50 border-teal-200 shadow-md' : 'bg-white border-gray-100 shadow-sm'}`}
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-4">
                    <View
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${isNext ? 'bg-teal-600 shadow-lg shadow-teal-200' : 'bg-gray-100'}`}
                    >
                        <Text className={`text-xl font-bold ${isNext ? 'text-white' : 'text-gray-600'}`}>
                            #{patient.queueNumber}
                        </Text>
                    </View>

                    <View>
                        <Text className="font-bold text-gray-900 leading-tight">
                            {patient.name}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                            <View
                                className={`px-2 py-0.5 rounded-full border ${getServiceStyles(patient.service).view}`}
                            >
                                <Text className={`text-[10px] font-bold uppercase tracking-wider ${getServiceStyles(patient.service).text}`}>
                                    {getServiceLabel(patient.service)}
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <Feather name="clock" size={12} color="#9CA3AF" />
                                <Text className="text-xs text-gray-400">
                                    {patient.arrivalTime}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="flex-col items-end gap-2">
                    {getStatusBadge(patient.status)}
                </View>
            </View>
        </Animated.View>
    )
}
