import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { adminService, AdminLog } from '../../lib/adminService'
import { useAuth } from '../../lib/AuthContext'

type LogType = 'all' | 'users' | 'inventory' | 'queue_transactions' | 'notifications'

const LOG_TYPE_TO_LABEL: Record<string, string> = {
    all: 'All Events',
    users: 'User Actions',
    inventory: 'Inventory',
    queue_transactions: 'Queue',
    notifications: 'Notifications',
}

const LOG_TYPE_COLOR: Record<string, string> = {
    users: 'text-teal-400',
    inventory: 'text-amber-400',
    queue_transactions: 'text-blue-400',
    notifications: 'text-purple-400',
    system: 'text-purple-400',
}

export function SystemConfig() {
    const { userProfile } = useAuth()
    const [broadcastTitle, setBroadcastTitle] = useState('')
    const [broadcastMsg, setBroadcastMsg] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [sendResult, setSendResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null)
    const [logs, setLogs] = useState<AdminLog[]>([])
    const [logFilter, setLogFilter] = useState<LogType>('all')
    const [showLogFilter, setShowLogFilter] = useState(false)
    const [logsLoading, setLogsLoading] = useState(true)
    const [activeDays, setActiveDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    const [autoClose, setAutoClose] = useState(true)

    const adminId = userProfile?.id ?? ''

    const loadLogs = useCallback(async () => {
        setLogsLoading(true)
        try {
            const data = await adminService.fetchAdminLogs()
            setLogs(data)
        } catch (e) {
            console.error('Failed to load admin logs', e)
        } finally {
            setLogsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadLogs()
        const unsub = adminService.subscribeToAdminLogs(loadLogs)
        return unsub
    }, [loadLogs])

    const filteredLogs = logFilter === 'all'
        ? logs
        : logs.filter(log => log.resource_type === logFilter)

    const toggleDay = (day: string) => {
        setActiveDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    const handleBroadcast = async () => {
        if (!broadcastTitle.trim() || !broadcastMsg.trim()) return
        setIsSending(true)
        setSendResult(null)

        const result = await adminService.broadcastNotification({
            title: broadcastTitle.trim(),
            message: broadcastMsg.trim(),
            type: 'queue',
            adminId,
        })

        setSendResult(result)
        if (result.success) {
            setBroadcastTitle('')
            setBroadcastMsg('')
        }
        setIsSending(false)
        setTimeout(() => setSendResult(null), 4000)
    }

    const filterOptions: { label: string; value: LogType }[] = [
        { label: 'All Events', value: 'all' },
        { label: 'User Actions', value: 'users' },
        { label: 'Inventory', value: 'inventory' },
        { label: 'Queue', value: 'queue_transactions' },
        { label: 'Notifications', value: 'notifications' },
    ]

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="flex-col lg:flex-row gap-6 mb-8">
                {/* LEFT: Config & Broadcast */}
                <View className="flex-col space-y-6 lg:flex-1">
                    <View className="mb-2">
                        <Text className="text-2xl font-bold text-gray-900">Logs & Notifications</Text>
                        <Text className="text-gray-500">Broadcast messages, operating hours & audit trail</Text>
                    </View>

                    {/* Operating Hours */}
                    <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center">
                                <Feather name="clock" size={16} color="#2563EB" />
                            </View>
                            <Text className="font-bold text-gray-900">Operating Hours</Text>
                        </View>

                        <View className="flex-col gap-4">
                            <View className="flex-row flex-wrap gap-y-3">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
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
                                            <Text className="text-sm font-medium text-gray-600">{day}</Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Open Time</Text>
                                    <TextInput
                                        defaultValue="08:00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-12"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Close Time</Text>
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
                                <Text className="text-sm font-medium text-gray-700">Auto-close queue outside hours</Text>
                            </View>
                        </View>
                    </View>

                    {/* Broadcast Notification */}
                    <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center">
                                <Feather name="radio" size={16} color="#D97706" />
                            </View>
                            <View>
                                <Text className="font-bold text-gray-900">Broadcast Notification</Text>
                                <Text className="text-xs text-gray-400">Sends to all registered users</Text>
                            </View>
                        </View>

                        <View className="flex-col gap-3">
                            <View>
                                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Title</Text>
                                <TextInput
                                    value={broadcastTitle}
                                    onChangeText={setBroadcastTitle}
                                    placeholder="e.g. System Maintenance Notice"
                                    placeholderTextColor="#9CA3AF"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                />
                            </View>
                            <View>
                                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Message</Text>
                                <TextInput
                                    value={broadcastMsg}
                                    onChangeText={setBroadcastMsg}
                                    placeholder="Type a message to send to all users…"
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    textAlignVertical="top"
                                    className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                                    maxLength={280}
                                />
                            </View>
                            <View className="flex-row items-center justify-between">
                                <Text className="text-xs text-gray-400 font-medium">
                                    {broadcastMsg.length}/280 chars
                                </Text>
                                <TouchableOpacity
                                    onPress={handleBroadcast}
                                    disabled={!broadcastTitle.trim() || !broadcastMsg.trim() || isSending}
                                    className={`px-4 py-2 flex-row items-center gap-2 rounded-xl shadow-sm ${
                                        !broadcastTitle.trim() || !broadcastMsg.trim() || isSending
                                            ? 'bg-teal-600 opacity-50'
                                            : 'bg-teal-600'
                                    }`}
                                >
                                    {isSending ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Feather name="send" size={14} color="white" />
                                            <Text className="text-white font-semibold text-sm">Send to All</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Result Banner */}
                            {sendResult && (
                                <View className={`flex-row items-center gap-2 p-3 rounded-xl border ${
                                    sendResult.success
                                        ? 'bg-teal-50 border-teal-200'
                                        : 'bg-rose-50 border-rose-200'
                                }`}>
                                    <Feather
                                        name={sendResult.success ? 'check-circle' : 'alert-circle'}
                                        size={14}
                                        color={sendResult.success ? '#0D9488' : '#E11D48'}
                                    />
                                    <Text className={`text-sm font-medium ${sendResult.success ? 'text-teal-700' : 'text-rose-700'}`}>
                                        {sendResult.success
                                            ? `✓ Sent to ${sendResult.count} users successfully`
                                            : sendResult.error ?? 'Broadcast failed'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* RIGHT: Audit Logs */}
                <View className="flex-col lg:flex-1 h-full min-h-[500px]">
                    <View className="mb-6 mt-6 lg:mt-0 flex-row items-center justify-between">
                        <View>
                            <Text className="text-2xl font-bold text-gray-900">Audit Logs</Text>
                            <Text className="text-gray-500 mt-1">Real-time admin action trail ({logs.length} entries)</Text>
                        </View>
                        <TouchableOpacity onPress={loadLogs} className="p-2 rounded-lg bg-gray-100 border border-gray-200">
                            <Feather name="refresh-cw" size={15} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View className="bg-gray-900 rounded-3xl border border-gray-800 shadow-xl flex-col overflow-hidden flex-1 z-10">
                        {/* Log Header */}
                        <View className="p-4 border-b border-gray-800 bg-gray-900 flex-row items-center justify-between z-20">
                            <View className="flex-row items-center gap-2">
                                <Feather name="terminal" size={14} color="#9CA3AF" />
                                <Text className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                                    admin_audit.log
                                </Text>
                                {logsLoading && <ActivityIndicator size="small" color="#9CA3AF" />}
                            </View>

                            <View className="flex-row items-center gap-2 relative">
                                <Feather name="filter" size={12} color="#6B7280" />
                                <TouchableOpacity
                                    onPress={() => setShowLogFilter(!showLogFilter)}
                                    className="flex-row items-center gap-1 bg-gray-800 py-1 px-2 rounded border border-gray-700 w-32 pr-6"
                                >
                                    <Text className="text-gray-300 text-xs truncate" numberOfLines={1}>
                                        {filterOptions.find(o => o.value === logFilter)?.label}
                                    </Text>
                                    <View className="absolute right-1">
                                        <Feather name="chevron-down" size={12} color="#9CA3AF" />
                                    </View>
                                </TouchableOpacity>

                                {showLogFilter && (
                                    <View className="absolute top-8 right-0 w-36 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden z-30">
                                        {filterOptions.map(opt => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => { setLogFilter(opt.value); setShowLogFilter(false) }}
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
                            {filteredLogs.length === 0 && !logsLoading ? (
                                <Text className="text-gray-500 font-mono text-xs">No log entries found.</Text>
                            ) : (
                                filteredLogs.map(log => (
                                    <View key={log.id} className="flex-row gap-3 py-1 items-start">
                                        <Text className="text-gray-500 font-mono text-xs w-[140px] shrink-0">
                                            {new Date(log.created_at).toLocaleString('en-PH', {
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                        <Text className={`font-bold font-mono text-xs shrink-0 ${LOG_TYPE_COLOR[log.resource_type] ?? 'text-teal-400'}`}>
                                            [{log.admin_name ?? 'Admin'}]
                                        </Text>
                                        <Text className="text-gray-300 font-mono text-xs flex-1 flex-wrap">
                                            {log.action}
                                        </Text>
                                    </View>
                                ))
                            )}
                            <View className="h-4" />
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
