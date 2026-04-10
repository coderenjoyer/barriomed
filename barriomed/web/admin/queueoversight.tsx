import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { adminService } from '../../lib/adminService'
import { useAuth } from '../../lib/AuthContext'

type QueueStatus = 'Waiting' | 'In Progress' | 'Completed' | 'Skipped'
type TabView = 'active' | 'history'

interface QueueEntry {
    id: string
    ticketNo: string
    patientName: string
    purpose: string
    status: QueueStatus | string
    joinedAt: string
    calledAt?: string
    completedAt?: string
    attendedBy?: string
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    'Waiting': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', border: 'border-blue-200' },
    'In Progress': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', border: 'border-teal-200' },
    'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
    'Skipped': { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400', border: 'border-gray-200' },
}

export function QueueOversight() {
    const { userProfile } = useAuth()
    const [tab, setTab] = useState<TabView>('active')
    const [activeQueue, setActiveQueue] = useState<QueueEntry[]>([])
    const [historyQueue, setHistoryQueue] = useState<QueueEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [overriding, setOverriding] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<{ id: string; success: boolean; msg: string } | null>(null)

    const adminId = userProfile?.id ?? ''

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [active, history] = await Promise.all([
                adminService.fetchActiveQueue(),
                adminService.fetchQueueHistory(),
            ])
            setActiveQueue(active as QueueEntry[])
            setHistoryQueue(history as QueueEntry[])
        } catch (e: any) {
            setError('Failed to load queue data.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
        const unsub = adminService.subscribeToQueueChanges(loadData)
        return unsub
    }, [loadData])

    const handleOverride = async (entry: QueueEntry, newDbStatus: 'WAITING' | 'SERVING' | 'SKIPPED' | 'COMPLETED') => {
        setOverriding(entry.id)
        const result = await adminService.overrideQueueStatus({
            ticketId: entry.id,
            newStatus: newDbStatus,
            adminId,
        })
        if (result.success) {
            setFeedback({ id: entry.id, success: true, msg: 'Status updated' })
            await loadData()
        } else {
            setFeedback({ id: entry.id, success: false, msg: result.error ?? 'Failed' })
        }
        setTimeout(() => setFeedback(null), 2500)
        setOverriding(null)
    }

    const waitingCount = activeQueue.filter(e => e.status === 'Waiting').length
    const inProgressCount = activeQueue.filter(e => e.status === 'In Progress').length
    const completedCount = historyQueue.length
    const skippedCount = activeQueue.filter(e => e.status === 'Skipped').length

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center py-24">
                <ActivityIndicator size="large" color="#0D9488" />
                <Text className="text-gray-400 mt-3 text-sm">Loading queue data…</Text>
            </View>
        )
    }

    const displayQueue = tab === 'active' ? activeQueue : historyQueue

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
                <View>
                    <Text className="text-2xl font-bold text-gray-900">Queue System Oversight</Text>
                    <Text className="text-gray-500 mt-1">Monitor and override active queue states</Text>
                </View>
                <TouchableOpacity onPress={loadData} className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <Feather name="refresh-cw" size={16} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {/* Error */}
            {error && (
                <View className="flex-row items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4">
                    <Feather name="alert-circle" size={16} color="#E11D48" />
                    <Text className="text-rose-700 text-sm font-medium flex-1">{error}</Text>
                    <TouchableOpacity onPress={loadData}>
                        <Text className="text-rose-600 text-sm font-bold">Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Summary Cards */}
            <View className="flex-row gap-4 mb-6 flex-wrap">
                {[
                    { label: 'Currently Waiting', value: waitingCount, color: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: 'clock' as const },
                    { label: 'In Progress', value: inProgressCount, color: 'bg-teal-50 border-teal-100', text: 'text-teal-700', icon: 'activity' as const },
                    { label: 'Served', value: completedCount, color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: 'check-circle' as const },
                    { label: 'Skipped', value: skippedCount, color: 'bg-gray-100 border-gray-200', text: 'text-gray-600', icon: 'skip-forward' as const },
                ].map(card => (
                    <View key={card.label} className={`flex-1 min-w-[140px] rounded-2xl p-4 border ${card.color} flex-row items-center gap-3`}>
                        <Feather name={card.icon} size={20} />
                        <View>
                            <Text className={`text-2xl font-bold ${card.text}`}>{card.value}</Text>
                            <Text className="text-xs text-gray-500 font-medium">{card.label}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Tabs + Table */}
            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Tab Toggle */}
                <View className="flex-row border-b border-gray-100 bg-gray-50 p-2 gap-2">
                    {[{ id: 'active', label: 'Active Queue', icon: 'activity' as const }, { id: 'history', label: 'Queue History', icon: 'archive' as const }].map(t => (
                        <TouchableOpacity
                            key={t.id}
                            onPress={() => setTab(t.id as TabView)}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${tab === t.id ? 'bg-white shadow-sm border border-gray-100' : ''}`}
                        >
                            <Feather name={t.icon} size={14} color={tab === t.id ? '#0D9488' : '#9CA3AF'} />
                            <Text className={`text-sm font-semibold ${tab === t.id ? 'text-teal-700' : 'text-gray-500'}`}>{t.label}</Text>
                            {t.id === 'active' && activeQueue.length > 0 && (
                                <View className="bg-teal-500 rounded-full w-5 h-5 items-center justify-center">
                                    <Text className="text-white text-[10px] font-bold">{activeQueue.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Table Header */}
                <View className="bg-gray-50 border-b border-gray-100 flex-row px-4 py-3">
                    <Text className="text-xs font-bold text-gray-500 uppercase flex-[0.5]">Ticket</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase flex-[2]">Patient</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase flex-[1.5]">Service</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase flex-1">Joined</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase flex-1">Status</Text>
                    {tab === 'active' && <Text className="text-xs font-bold text-gray-500 uppercase w-32 text-right">Override</Text>}
                    {tab === 'history' && <Text className="text-xs font-bold text-gray-500 uppercase w-28 text-right">Completed</Text>}
                </View>

                {/* Rows */}
                <View>
                    {displayQueue.length === 0 ? (
                        <View className="py-12 items-center">
                            <Feather name="list" size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-2">
                                {tab === 'active' ? 'No active queue entries' : 'No completed queue records'}
                            </Text>
                        </View>
                    ) : (
                        displayQueue.map((entry, idx) => {
                            const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG['Waiting']
                            const isOverriding = overriding === entry.id
                            const fb = feedback?.id === entry.id ? feedback : null
                            return (
                                <View
                                    key={entry.id}
                                    className={`flex-row items-center px-4 py-3 gap-2 ${idx !== displayQueue.length - 1 ? 'border-b border-gray-50' : ''}`}
                                >
                                    <Text className="font-mono font-bold text-teal-700 text-sm flex-[0.5]">{entry.ticketNo}</Text>
                                    <View className="flex-[2]">
                                        <Text className="font-semibold text-gray-900 text-sm">{entry.patientName}</Text>
                                        {entry.attendedBy && <Text className="text-xs text-gray-400">by {entry.attendedBy}</Text>}
                                    </View>
                                    <Text className="text-sm text-gray-500 flex-[1.5]">{entry.purpose}</Text>
                                    <Text className="text-xs text-gray-400 flex-1">{entry.joinedAt}</Text>

                                    {/* Status */}
                                    <View className="flex-1">
                                        {fb ? (
                                            <Text className={`text-xs font-bold ${fb.success ? 'text-teal-600' : 'text-rose-500'}`}>{fb.msg}</Text>
                                        ) : (
                                            <View className={`flex-row items-center gap-1.5 px-2 py-1 rounded-lg border self-start ${cfg.bg} ${cfg.border}`}>
                                                <View className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                <Text className={`text-xs font-bold ${cfg.text}`}>{entry.status}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Override Actions (active tab only) */}
                                    {tab === 'active' && (
                                        <View className="w-32 flex-row gap-1 justify-end items-center">
                                            {isOverriding ? (
                                                <ActivityIndicator size="small" color="#0D9488" />
                                            ) : (
                                                <>
                                                    {entry.status !== 'In Progress' && (
                                                        <TouchableOpacity
                                                            onPress={() => handleOverride(entry, 'SERVING')}
                                                            className="px-2 py-1 rounded-lg bg-teal-50 border border-teal-200"
                                                        >
                                                            <Text className="text-xs font-bold text-teal-700">Serve</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    {entry.status !== 'Completed' && entry.status !== 'Skipped' && (
                                                        <TouchableOpacity
                                                            onPress={() => handleOverride(entry, 'SKIPPED')}
                                                            className="px-2 py-1 rounded-lg bg-gray-100 border border-gray-200"
                                                        >
                                                            <Text className="text-xs font-bold text-gray-600">Skip</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    {entry.status === 'In Progress' && (
                                                        <TouchableOpacity
                                                            onPress={() => handleOverride(entry, 'COMPLETED')}
                                                            className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200"
                                                        >
                                                            <Text className="text-xs font-bold text-emerald-700">Done</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    )}

                                    {/* Completed time (history tab) */}
                                    {tab === 'history' && (
                                        <Text className="text-xs text-gray-400 w-28 text-right">
                                            {(entry as any).completedAt ?? '—'}
                                        </Text>
                                    )}
                                </View>
                            )
                        })
                    )}
                </View>
            </View>
        </ScrollView>
    )
}
