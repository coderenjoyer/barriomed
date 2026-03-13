import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { Feather } from '@expo/vector-icons'

interface AuditLog {
    id: string
    timestamp: string
    user: string
    action: string
    type: 'system' | 'user' | 'inventory'
}

const MOCK_LOGS: AuditLog[] = [
    {
        id: '1',
        timestamp: '2024-01-15 14:32:01',
        user: 'Admin_01',
        action: 'deleted patient record #5542',
        type: 'user',
    },
    {
        id: '2',
        timestamp: '2024-01-15 14:28:45',
        user: 'Staff_02',
        action: "changed 'Losartan' status to 'Out of Stock'",
        type: 'inventory',
    },
    {
        id: '3',
        timestamp: '2024-01-15 13:15:22',
        user: 'Admin_01',
        action: "created new user 'ana@health.gov'",
        type: 'user',
    },
    {
        id: '4',
        timestamp: '2024-01-15 12:00:00',
        user: 'SYSTEM',
        action: 'Queue automatically closed (end of operating hours)',
        type: 'system',
    },
    {
        id: '5',
        timestamp: '2024-01-15 11:45:12',
        user: 'Staff_01',
        action: 'completed patient #38',
        type: 'user',
    },
    {
        id: '6',
        timestamp: '2024-01-15 08:00:00',
        user: 'SYSTEM',
        action: 'Queue automatically opened',
        type: 'system',
    },
]

export function SystemConfig() {
    const [centerName, setCenterName] = useState(
        'Barangay Guadalupe Health Center',
    )
    const [broadcastMsg, setBroadcastMsg] = useState('')
    const [logs, setLogs] = useState<AuditLog[]>(MOCK_LOGS)
    const [logFilter, setLogFilter] = useState<
        'all' | 'system' | 'user' | 'inventory'
    >('all')
    const [showLogFilter, setShowLogFilter] = useState(false)
    const [activeDays, setActiveDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    const [autoClose, setAutoClose] = useState(true)

    const filteredLogs =
        logFilter === 'all' ? logs : logs.filter((log) => log.type === logFilter)

    const toggleDay = (day: string) => {
        setActiveDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    const filterOptions = [
        { label: 'All Events', value: 'all' },
        { label: 'System', value: 'system' },
        { label: 'User Actions', value: 'user' },
        { label: 'Inventory', value: 'inventory' },
    ]

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="flex-col lg:flex-row gap-6 mb-8">
                {/* LEFT COLUMN - SETTINGS */}
                <View className="flex-col space-y-6 lg:flex-1">
                    <View className="mb-2">
                        <Text className="text-2xl font-bold text-gray-900">
                            System Configuration
                        </Text>
                        <Text className="text-gray-500">
                            Global settings and broadcast controls
                        </Text>
                    </View>

                    {/* Center Details */}
                    <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-teal-100 items-center justify-center">
                                <Feather name="save" size={16} color="#0D9488" />
                            </View>
                            <Text className="font-bold text-gray-900">Health Center Details</Text>
                        </View>
                        <View className="flex-col">
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">
                                Center Name
                            </Text>
                            <View className="flex-row gap-2">
                                <TextInput
                                    value={centerName}
                                    onChangeText={setCenterName}
                                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-teal-500 font-medium text-gray-900 h-12"
                                />
                                <TouchableOpacity className="px-4 bg-teal-600 rounded-xl items-center justify-center shadow-sm active:bg-teal-700">
                                    <Text className="text-white font-semibold">Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Operating Hours */}
                    <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-6">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center">
                                <Feather name="clock" size={16} color="#2563EB" />
                            </View>
                            <Text className="font-bold text-gray-900">Operating Hours</Text>
                        </View>
                        
                        <View className="flex-col gap-4">
                            <View className="flex-row flex-wrap gap-y-3">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                                    (day) => {
                                        const isActive = activeDays.includes(day)
                                        return (
                                            <TouchableOpacity
                                                key={day}
                                                onPress={() => toggleDay(day)}
                                                className="flex-row items-center gap-2 mr-4"
                                            >
                                                <View className={`w-5 h-5 rounded items-center justify-center border ${isActive ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-300'}`}>
                                                    {isActive && <Feather name="check" size={12} color="white" />}
                                                </View>
                                                <Text className="text-sm font-medium text-gray-600">
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    }
                                )}
                            </View>
                            
                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Open Time
                                    </Text>
                                    <TextInput
                                        defaultValue="08:00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-12"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Close Time
                                    </Text>
                                    <TextInput
                                        defaultValue="17:00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-12"
                                    />
                                </View>
                            </View>

                            <View className="flex-row items-center gap-3 pt-4 border-t border-gray-50 mt-2">
                                <Switch
                                    value={autoClose}
                                    onValueChange={setAutoClose}
                                    trackColor={{ false: '#D1D5DB', true: '#0D9488' }}
                                    thumbColor={'#ffffff'}
                                    ios_backgroundColor="#D1D5DB"
                                />
                                <Text className="text-sm font-medium text-gray-700">
                                    Auto-close queue outside hours
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Broadcast Message */}
                    <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-6">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center">
                                <Feather name="radio" size={16} color="#D97706" />
                            </View>
                            <Text className="font-bold text-gray-900">Broadcast Message</Text>
                        </View>
                        
                        <View className="flex-col gap-4">
                            <TextInput
                                value={broadcastMsg}
                                onChangeText={setBroadcastMsg}
                                placeholder="Type a message to send to all users (e.g. 'System maintenance at 5PM')"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                textAlignVertical="top"
                                className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                            />
                            <View className="flex-row items-center justify-between">
                                <Text className="text-xs text-gray-400 font-medium">
                                    {broadcastMsg.length}/140 chars
                                </Text>
                                <TouchableOpacity
                                    disabled={!broadcastMsg}
                                    className={`px-4 py-2 flex-row items-center gap-2 rounded-xl shadow-sm ${!broadcastMsg ? 'bg-teal-600 opacity-50' : 'bg-teal-600 active:bg-teal-700'}`}
                                >
                                    <Feather name="message-square" size={14} color="white" />
                                    <Text className="text-white font-semibold text-sm">Send to All</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* RIGHT COLUMN - AUDIT LOGS */}
                <View className="flex-col lg:flex-1 h-full min-h-[500px]">
                    <View className="mb-6 mt-6 lg:mt-0">
                        <Text className="text-2xl font-bold text-gray-900">Audit Logs</Text>
                        <Text className="text-gray-500 mt-1">Security and activity tracking</Text>
                    </View>

                    <View className="bg-gray-900 rounded-3xl border border-gray-800 shadow-xl flex-col overflow-hidden flex-1 z-10">
                        {/* Log Header */}
                        <View className="p-4 border-b border-gray-800 bg-gray-900 flex-row items-center justify-between z-20">
                            <View className="flex-row items-center gap-2">
                                <Feather name="terminal" size={14} color="#9CA3AF" />
                                <Text className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                                    system_audit.log
                                </Text>
                            </View>
                            
                            <View className="flex-row items-center gap-2 relative">
                                <Feather name="filter" size={12} color="#6B7280" />
                                <TouchableOpacity 
                                    onPress={() => setShowLogFilter(!showLogFilter)}
                                    className="flex-row items-center gap-1 bg-gray-800 py-1 px-2 rounded border border-gray-700 w-28 pr-6"
                                >
                                    <Text className="text-gray-300 text-xs truncate" numberOfLines={1}>
                                        {filterOptions.find(o => o.value === logFilter)?.label}
                                    </Text>
                                    <View className="absolute right-1">
                                        <Feather name="chevron-down" size={12} color="#9CA3AF" />
                                    </View>
                                </TouchableOpacity>

                                {showLogFilter && (
                                    <View className="absolute top-8 right-0 w-32 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden z-30">
                                        {filterOptions.map((opt) => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => {
                                                    setLogFilter(opt.value as any)
                                                    setShowLogFilter(false)
                                                }}
                                                className={`py-2 px-3 ${logFilter === opt.value ? 'bg-gray-700' : ''}`}
                                            >
                                                <Text className="text-xs text-gray-300">{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Log Content */}
                        <ScrollView className="flex-1 p-4 bg-gray-900 z-10">
                            {filteredLogs.map((log) => (
                                <View
                                    key={log.id}
                                    className="flex-row gap-3 py-1 items-start"
                                >
                                    <Text className="text-gray-500 font-mono text-xs w-[140px] shrink-0">
                                        {log.timestamp}
                                    </Text>
                                    <Text
                                        className={`font-bold font-mono text-xs shrink-0 ${log.type === 'system' ? 'text-purple-400' : log.type === 'inventory' ? 'text-amber-400' : 'text-teal-400'}`}
                                    >
                                        [{log.user}]
                                    </Text>
                                    <Text className="text-gray-300 font-mono text-xs flex-1 flex-wrap">
                                        {log.action}
                                    </Text>
                                </View>
                            ))}
                            <View className="h-4" /> {/* Spacer */}
                            <View className="flex-row items-center gap-2">
                                <View className="w-2 h-4 bg-teal-500 opacity-80" />
                                <Text className="text-teal-500 font-mono text-xs">_</Text>
                            </View>
                            <View className="h-8" />
                        </ScrollView>
                    </View>
                </View>
            </View>
        </ScrollView>
    )
}
