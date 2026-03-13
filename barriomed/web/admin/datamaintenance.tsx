import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native'
import { Feather } from '@expo/vector-icons'

export function DataMaintenance() {
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [resetInput, setResetInput] = useState('')
    const [isCleaning, setIsCleaning] = useState(false)
    const [duplicatesFound, setDuplicatesFound] = useState<any[]>([])

    // Animations
    const resetOpacity = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (showResetConfirm) {
            Animated.timing(resetOpacity, {
                toValue: 1,
                duration: 200,
                // Using falsity for native driver to interpolate translateY easily if needed,
                // but true is better for simple opacity and transform.
                useNativeDriver: true,
            }).start();
        } else {
            resetOpacity.setValue(0);
        }
    }, [showResetConfirm]);

    const resultsOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (duplicatesFound.length > 0) {
            Animated.timing(resultsOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            resultsOpacity.setValue(0);
        }
    }, [duplicatesFound]);

    const handleFindDuplicates = () => {
        setIsCleaning(true)
        setTimeout(() => {
            setDuplicatesFound([
                {
                    id: 1,
                    name1: 'Maria Santos',
                    name2: 'Maria A. Santos',
                    match: 85,
                },
                {
                    id: 2,
                    name1: 'Juan Cruz',
                    name2: 'Juan Dela Cruz',
                    match: 78,
                },
            ])
            setIsCleaning(false)
        }, 1500)
    }

    return (
        <View className="space-y-6 flex-1">
            <View className="mb-6">
                <Text className="text-2xl font-bold text-gray-900">Data Maintenance</Text>
                <Text className="text-gray-500 mt-1">Backup, recovery, and cleanup tools</Text>
            </View>

            <View className="flex-col gap-6 md:flex-row md:flex-wrap">
                {/* Database Backup Card */}
                <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex-col w-full md:w-[48%] lg:w-[31%]">
                    <View className="w-12 h-12 bg-blue-100 rounded-2xl items-center justify-center mb-4">
                        <Feather name="database" size={24} color="#2563EB" />
                    </View>
                    <Text className="text-lg font-bold text-gray-900 mb-2">Database Backup</Text>
                    <Text className="text-sm text-gray-500 mb-6 flex-1">
                        Download an encrypted copy of all patient records and system logs.
                    </Text>

                    <View className="gap-3">
                        <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-xl">
                            <Text className="text-xs text-gray-400 font-medium">Last backup:</Text>
                            <Text className="text-xs text-gray-400 font-medium">Today, 08:00 AM</Text>
                        </View>
                        <View className="flex-row gap-2">
                            <TouchableOpacity className="flex-1 py-2.5 bg-white border border-gray-200 rounded-xl flex-row items-center justify-center gap-2">
                                <Feather name="file-text" size={16} color="#374151" />
                                <Text className="text-gray-700 font-medium text-sm">.CSV</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="flex-1 py-2.5 bg-blue-600 rounded-xl flex-row items-center justify-center gap-2 shadow-lg shadow-blue-200">
                                <Feather name="download" size={16} color="white" />
                                <Text className="text-white font-medium text-sm">.SQL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Queue Reset Card */}
                <View className="bg-white rounded-3xl p-6 border border-rose-100 shadow-sm flex-col relative overflow-hidden w-full md:w-[48%] lg:w-[31%]">
                    <View className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 z-0" />

                    <View className="relative z-10 flex-col flex-1">
                        <View className="w-12 h-12 bg-rose-100 rounded-2xl items-center justify-center mb-4">
                            <Feather name="refresh-ccw" size={24} color="#E11D48" />
                        </View>
                        <Text className="text-lg font-bold text-gray-900 mb-2">Emergency Queue Reset</Text>
                        <Text className="text-sm text-gray-500 mb-6 flex-1">
                            Force clear all active queue entries. Use only for system glitches or end-of-day cleanup.
                        </Text>

                        {!showResetConfirm ? (
                            <TouchableOpacity
                                onPress={() => setShowResetConfirm(true)}
                                className="w-full py-3 bg-rose-50 rounded-xl border border-rose-200 flex-row items-center justify-center gap-2"
                            >
                                <Feather name="alert-triangle" size={16} color="#E11D48" />
                                <Text className="text-rose-600 font-bold">Reset Queue</Text>
                            </TouchableOpacity>
                        ) : (
                            <Animated.View
                                style={{
                                    opacity: resetOpacity,
                                    transform: [{
                                        translateY: resetOpacity.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [10, 0]
                                        })
                                    }]
                                }}
                                className="bg-rose-50 p-4 rounded-xl border border-rose-200"
                            >
                                <Text className="text-xs font-bold text-rose-700 mb-2 uppercase">
                                    Type "RESET" to confirm
                                </Text>
                                <View className="flex-row gap-2 mb-2">
                                    <TextInput
                                        value={resetInput}
                                        onChangeText={setResetInput}
                                        className="flex-1 px-3 py-2 bg-white border border-rose-300 rounded-lg text-sm text-black"
                                        placeholder="RESET"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="characters"
                                    />
                                    <TouchableOpacity
                                        disabled={resetInput !== 'RESET'}
                                        className={`px-4 py-2 rounded-lg items-center justify-center ${resetInput === 'RESET' ? 'bg-rose-600' : 'bg-rose-600 opacity-50'}`}
                                    >
                                        <Text className="text-white font-bold text-sm">Confirm</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowResetConfirm(false)
                                        setResetInput('')
                                    }}
                                    className="w-full mt-2 items-center"
                                >
                                    <Text className="text-xs text-rose-500 font-medium">Cancel</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                </View>

                {/* Data Cleanup Card */}
                <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex-col w-full md:w-[48%] lg:w-[31%]">
                    <View className="w-12 h-12 bg-amber-100 rounded-2xl items-center justify-center mb-4">
                        <Feather name="trash-2" size={24} color="#D97706" />
                    </View>
                    <Text className="text-lg font-bold text-gray-900 mb-2">Orphaned Record Cleaner</Text>
                    <Text className="text-sm text-gray-500 mb-6 flex-1">
                        Scan and merge duplicate patient profiles to maintain data integrity.
                    </Text>

                    <TouchableOpacity
                        onPress={handleFindDuplicates}
                        disabled={isCleaning || duplicatesFound.length > 0}
                        className={`w-full py-3 bg-amber-50 rounded-xl border border-amber-200 flex-row items-center justify-center gap-2 ${
                            (isCleaning || duplicatesFound.length > 0) ? 'opacity-50' : ''
                        }`}
                    >
                        {isCleaning ? (
                            <ActivityIndicator color="#D97706" size="small" />
                        ) : (
                            <>
                                <Feather name="trash-2" size={16} color="#B45309" />
                                <Text className="text-amber-700 font-bold">Find Duplicates</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results Area */}
            {duplicatesFound.length > 0 && (
                <Animated.View
                    style={{
                        opacity: resultsOpacity,
                    }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-6"
                >
                    <View className="p-4 border-b border-gray-100 bg-amber-50 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                            <Feather name="alert-triangle" size={16} color="#F59E0B" />
                            <Text className="font-bold text-gray-900">
                                Potential Duplicates Found ({duplicatesFound.length})
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setDuplicatesFound([])}>
                            <Text className="text-sm text-gray-500 font-medium">Dismiss</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-col">
                        {duplicatesFound.map((item, index) => (
                            <View
                                key={item.id}
                                className={`p-4 flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                                    index !== duplicatesFound.length - 1 ? 'border-b border-gray-50' : ''
                                }`}
                            >
                                <View className="flex-row items-center gap-4 flex-wrap">
                                    <View className="flex-col">
                                        <Text className="font-bold text-gray-900">{item.name1}</Text>
                                        <Text className="text-xs text-gray-400">ID: #8821</Text>
                                    </View>
                                    <View className="px-2 py-1 bg-gray-100 rounded">
                                        <Text className="text-xs text-gray-500 font-mono">vs</Text>
                                    </View>
                                    <View className="flex-col">
                                        <Text className="font-bold text-gray-900">{item.name2}</Text>
                                        <Text className="text-xs text-gray-400">ID: #9932</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                                    <View className="bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                        <Text className="text-sm font-bold text-amber-600">{item.match}% Match</Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white">
                                            <Text className="text-xs font-bold text-gray-500">Ignore</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity className="px-3 py-1.5 bg-teal-600 rounded-lg shadow-sm">
                                            <Text className="text-xs font-bold text-white">Merge</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            )}
        </View>
    )
}
