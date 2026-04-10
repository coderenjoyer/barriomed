import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { adminService, AdminLog, InventoryAuditAction } from '../../lib/adminService'
import { useAuth } from '../../lib/AuthContext'

type LogType = 'all' | 'users' | 'inventory' | 'queue_transactions' | 'notifications'

const LOG_TYPE_COLOR: Record<string, string> = {
    users: 'text-teal-400',
    inventory: 'text-amber-400',
    queue_transactions: 'text-blue-400',
    notifications: 'text-purple-400',
    system: 'text-purple-400',
}

const FILTER_TABS: { label: string; value: LogType; color: string }[] = [
    { label: 'All', value: 'all', color: 'text-gray-300' },
    { label: 'Users', value: 'users', color: 'text-teal-400' },
    { label: 'Inventory', value: 'inventory', color: 'text-amber-400' },
    { label: 'Queue', value: 'queue_transactions', color: 'text-blue-400' },
    { label: 'Notifs', value: 'notifications', color: 'text-purple-400' },
]

// ─── Action badge colours (for structured inventory action column) ────────────

const ACTION_BADGE: Record<string, { bg: string; text: string }> = {
    CREATE: { bg: 'bg-emerald-900/50', text: 'text-emerald-400' },
    UPDATE: { bg: 'bg-amber-900/50', text: 'text-amber-400' },
    DELETE: { bg: 'bg-rose-900/50', text: 'text-rose-400' },
    QUEUE_CREATE: { bg: 'bg-emerald-900/50', text: 'text-emerald-400' },
    QUEUE_UPDATE: { bg: 'bg-amber-900/50', text: 'text-amber-400' },
    QUEUE_STATUS_CHANGE: { bg: 'bg-blue-900/50', text: 'text-blue-400' },
    QUEUE_DELETE: { bg: 'bg-rose-900/50', text: 'text-rose-400' },
}

/** Extract the leading action word from the log action string */
function extractAction(action: string): string | null {
    const match = action.match(/^(QUEUE_CREATE|QUEUE_UPDATE|QUEUE_STATUS_CHANGE|QUEUE_DELETE|CREATE|UPDATE|DELETE)/i)
    return match ? match[1].toUpperCase() : null
}

export function SystemConfig() {
    const { userProfile } = useAuth()

    // ── Broadcast state ──────────────────────────────────────────────────────
    const [broadcastTitle, setBroadcastTitle] = useState('')
    const [broadcastMsg, setBroadcastMsg] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [sendResult, setSendResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null)

    // ── Audit log state ──────────────────────────────────────────────────────
    const [logs, setLogs] = useState<AdminLog[]>([])
    const [logFilter, setLogFilter] = useState<LogType>('all')
    const [logsLoading, setLogsLoading] = useState(true)

    // Advanced filters
    const [invActionFilter, setInvActionFilter] = useState<string>('all')
    const [invFromDate, setInvFromDate] = useState('')
    const [invToDate, setInvToDate] = useState('')
    const [invItemFilter, setInvItemFilter] = useState('')
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

    // ── Operating hours state ────────────────────────────────────────────────
    const [activeDays, setActiveDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    const [autoClose, setAutoClose] = useState(true)

    const adminId = userProfile?.id ?? ''

    // ── Data Loading ──────────────────────────────────────────────────────────

    const loadLogs = useCallback(async () => {
        setLogsLoading(true)
        try {
            if (logFilter === 'inventory') {
                const data = await adminService.fetchInventoryAuditLogs({
                    action: invActionFilter !== 'all' ? invActionFilter : undefined,
                    fromDate: invFromDate ? new Date(invFromDate).toISOString() : undefined,
                    toDate: invToDate ? new Date(invToDate + 'T23:59:59').toISOString() : undefined,
                })
                setLogs(data)
            } else if (logFilter === 'queue_transactions') {
                const data = await adminService.fetchQueueAuditLogs({
                    action: invActionFilter !== 'all' ? invActionFilter : undefined,
                    fromDate: invFromDate ? new Date(invFromDate).toISOString() : undefined,
                    toDate: invToDate ? new Date(invToDate + 'T23:59:59').toISOString() : undefined,
                })
                setLogs(data)
            } else {
                const data = await adminService.fetchAdminLogs()
                setLogs(data)
            }
        } catch (e) {
            console.error('Failed to load admin logs', e)
        } finally {
            setLogsLoading(false)
        }
    }, [logFilter, invActionFilter, invFromDate, invToDate])

    useEffect(() => {
        loadLogs()
        const unsub = adminService.subscribeToAdminLogs(loadLogs)
        return unsub
    }, [loadLogs])

    // ── Derived filtered list (for non-inventory tabs) ────────────────────────

    const filteredLogs = logs.filter(log => {
        if (logFilter !== 'all' && logFilter !== 'inventory' && logFilter !== 'queue_transactions') {
            if (log.resource_type !== logFilter) return false
        }
        if (logFilter === 'inventory' && invItemFilter.trim() !== '') {
            const query = invItemFilter.toLowerCase()
            const itemName = String(log.metadata?.item_name || '').toLowerCase()
            const itemId = String(log.resource_id || '').toLowerCase()
            if (!itemName.includes(query) && !itemId.includes(query)) {
                return false
            }
        }
        return true
    })

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Centered max-width container */}
            <View style={{ maxWidth: 1200, width: '100%', alignSelf: 'center' }}>

                {/* Page Header */}
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-gray-900">Logs & Notifications</Text>
                    <Text className="text-gray-500 mt-1">Broadcast messages, operating hours & audit trail</Text>
                </View>

                <View className="flex-col lg:flex-row gap-6 mb-8">
                    {/* ── LEFT: Config & Broadcast ── */}
                    <View className="flex-col space-y-5 lg:flex-1">

                        {/* Operating Hours */}
                        <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                            <View className="flex-row items-center gap-2 mb-5">
                                <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center">
                                    <Feather name="clock" size={16} color="#2563EB" />
                                </View>
                                <View>
                                    <Text className="font-bold text-gray-900">Operating Hours</Text>
                                    <Text className="text-xs text-gray-400">Set clinic open/close schedule</Text>
                                </View>
                            </View>

                            <View className="flex-col gap-4">
                                {/* Day toggles */}
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

                                {/* Time inputs */}
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

                                {/* Auto-close toggle */}
                                <View className="flex-row items-center gap-3 pt-4 border-t border-gray-100 mt-2">
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
                        <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                            <View className="flex-row items-center gap-2 mb-5">
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
                                        className={`px-4 py-2 flex-row items-center gap-2 rounded-xl shadow-sm ${!broadcastTitle.trim() || !broadcastMsg.trim() || isSending
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
                                    <View className={`flex-row items-center gap-2 p-3 rounded-xl border ${sendResult.success
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

                    {/* ── RIGHT: Audit Logs ── */}
                    <View className="flex-col lg:flex-1" style={{ minHeight: 520 }}>
                        {/* Section header */}
                        <View className="mb-4 lg:mt-0 flex-row items-center justify-between">
                            <View>
                                <Text className="text-2xl font-bold text-gray-900">Audit Logs</Text>
                                <Text className="text-gray-500 mt-1">Real-time admin action trail · {filteredLogs.length} entries</Text>
                            </View>
                            <TouchableOpacity
                                onPress={loadLogs}
                                className="p-2 rounded-lg bg-gray-100 border border-gray-200"
                            >
                                <Feather name="refresh-cw" size={15} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Terminal card */}
                        <View
                            className="bg-gray-900 rounded-3xl border border-gray-800 shadow-xl flex-col overflow-hidden flex-1"
                        >
                            {/* Terminal toolbar */}
                            <View className="px-4 pt-4 pb-3 border-b border-gray-800 bg-gray-950/80">
                                {/* Top row: file label + loading */}
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center gap-2">
                                        {/* macOS-style traffic lights */}
                                        <View className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-80" />
                                        <View className="w-2.5 h-2.5 rounded-full bg-yellow-400 opacity-80" />
                                        <View className="w-2.5 h-2.5 rounded-full bg-green-400 opacity-80" />
                                        <View className="w-px h-3 bg-gray-700 mx-1" />
                                        <Feather name="terminal" size={12} color="#6B7280" />
                                        <Text className="text-xs text-gray-500 font-mono">admin_audit.log</Text>
                                        {logsLoading && <ActivityIndicator size="small" color="#6B7280" />}
                                    </View>
                                    <Text className="text-xs text-gray-600 font-mono">{filteredLogs.length} lines</Text>
                                </View>

                                {/* Resource filter pill tabs */}
                                <View className="flex-row gap-1.5 flex-wrap mb-2">
                                    {FILTER_TABS.map(tab => {
                                        const isActive = logFilter === tab.value
                                        return (
                                            <TouchableOpacity
                                                key={tab.value}
                                                onPress={() => {
                                                    setLogFilter(tab.value)
                                                    setInvActionFilter('all')
                                                    setInvFromDate('')
                                                    setInvToDate('')
                                                    setInvItemFilter('')
                                                    setExpandedLogId(null)
                                                }}
                                                className={`px-2.5 py-1 rounded-md border ${isActive
                                                        ? 'bg-gray-700 border-gray-600'
                                                        : 'bg-gray-800 border-gray-700'
                                                    }`}
                                            >
                                                <Text className={`text-xs font-mono font-semibold ${isActive ? tab.color : 'text-gray-500'}`}>
                                                    {tab.label}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>

                                {/* ── Advanced filters ── */}
                                {(logFilter === 'inventory' || logFilter === 'queue_transactions') && (
                                    <View className="mt-2 flex-col gap-2">
                                        {/* Action filter */}
                                        <View className="flex-row gap-1.5 flex-wrap">
                                            {(logFilter === 'inventory'
                                                ? ['all', 'CREATE', 'UPDATE', 'DELETE']
                                                : ['all', 'QUEUE_CREATE', 'QUEUE_UPDATE', 'QUEUE_STATUS_CHANGE', 'QUEUE_DELETE']
                                            ).map(a => {
                                                const isActive = invActionFilter === a
                                                const badge = a !== 'all' ? ACTION_BADGE[a] : null
                                                return (
                                                    <TouchableOpacity
                                                        key={a}
                                                        onPress={() => setInvActionFilter(a)}
                                                        className={`px-2 py-0.5 rounded-md border ${isActive ? 'bg-gray-700 border-gray-600' : 'bg-gray-800 border-gray-700'
                                                            }`}
                                                    >
                                                        <Text className={`text-[10px] font-mono font-bold ${isActive
                                                                ? (badge ? badge.text : 'text-gray-300')
                                                                : 'text-gray-600'
                                                            }`}>
                                                            {a === 'all' ? 'ALL ACTIONS' : a}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )
                                            })}
                                        </View>

                                        {/* Date range filters */}
                                        <View className="flex-row gap-2 items-center flex-wrap">
                                            <Feather name="calendar" size={11} color="#6B7280" />
                                            <TextInput
                                                value={invFromDate}
                                                onChangeText={setInvFromDate}
                                                placeholder="From YYYY-MM-DD"
                                                placeholderTextColor="#4B5563"
                                                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-gray-300 font-mono"
                                                style={{ fontSize: 11 }}
                                            />
                                            <Text className="text-gray-600 font-mono text-xs">→</Text>
                                            <TextInput
                                                value={invToDate}
                                                onChangeText={setInvToDate}
                                                placeholder="To YYYY-MM-DD"
                                                placeholderTextColor="#4B5563"
                                                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-gray-300 font-mono"
                                                style={{ fontSize: 11 }}
                                            />
                                            <TouchableOpacity
                                                onPress={loadLogs}
                                                className="px-2 py-1 bg-amber-700/40 border border-amber-700/60 rounded-md"
                                            >
                                                <Text className="text-amber-400 font-mono font-bold" style={{ fontSize: 10 }}>APPLY</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Item filter */}
                                        {logFilter === 'inventory' && (
                                            <View className="flex-row gap-2 items-center mt-1">
                                                <Feather name="search" size={11} color="#6B7280" />
                                                <TextInput
                                                    value={invItemFilter}
                                                    onChangeText={setInvItemFilter}
                                                    placeholder="Filter by item name or ID"
                                                    placeholderTextColor="#4B5563"
                                                    className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-gray-300 font-mono"
                                                    style={{ fontSize: 11 }}
                                                />
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Log entries */}
                            <ScrollView className="flex-1 p-4 bg-gray-900">
                                {filteredLogs.length === 0 && !logsLoading ? (
                                    <View className="flex-col items-center justify-center py-16 gap-3">
                                        <Feather name="file-text" size={28} color="#374151" />
                                        <Text className="text-gray-600 font-mono text-xs">No log entries found.</Text>
                                    </View>
                                ) : (
                                    filteredLogs.map(log => {
                                        const actionWord = extractAction(log.action)
                                        const badge = actionWord ? ACTION_BADGE[actionWord] : null
                                        const isExpanded = expandedLogId === log.id
                                        const hasDetail = !!(log.old_value || log.new_value)

                                        return (
                                            <View key={log.id} className="border-b border-gray-800/60">
                                                {/* Main row */}
                                                <TouchableOpacity
                                                    onPress={() => hasDetail ? setExpandedLogId(isExpanded ? null : log.id) : undefined}
                                                    activeOpacity={hasDetail ? 0.7 : 1}
                                                    className="flex-row gap-3 py-1.5 items-start"
                                                >
                                                    {/* Timestamp */}
                                                    <Text className="text-gray-600 font-mono text-xs w-[130px] shrink-0">
                                                        {new Date(log.created_at).toLocaleString('en-PH', {
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </Text>

                                                    {/* Action badge (CREATE/UPDATE/DELETE) */}
                                                    {badge && actionWord ? (
                                                        <View className={`px-1.5 py-0.5 rounded shrink-0 ${badge.bg}`}>
                                                            <Text className={`font-bold font-mono text-[9px] ${badge.text}`}>{actionWord}</Text>
                                                        </View>
                                                    ) : null}

                                                    {/* Admin name */}
                                                    <Text className={`font-bold font-mono text-xs shrink-0 ${LOG_TYPE_COLOR[log.resource_type] ?? 'text-teal-400'}`}>
                                                        [{log.admin_name ?? 'Admin'}]
                                                    </Text>

                                                    {/* Action text */}
                                                    <Text className="text-gray-300 font-mono text-xs flex-1 flex-wrap">
                                                        {log.action}
                                                    </Text>

                                                    {/* Role badge */}
                                                    {log.performed_by_role && (
                                                        <Text className="text-gray-600 font-mono text-[9px] shrink-0">
                                                            {log.performed_by_role}
                                                        </Text>
                                                    )}

                                                    {/* Expand indicator */}
                                                    {hasDetail && (
                                                        <Feather
                                                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                            size={11}
                                                            color="#4B5563"
                                                        />
                                                    )}
                                                </TouchableOpacity>

                                                {/* Expanded detail: old / new values */}
                                                {isExpanded && (
                                                    <View className="ml-[130px] mb-2 flex-col gap-1.5">
                                                        {log.old_value && (
                                                            <View className="bg-rose-950/40 border border-rose-900/40 rounded-lg p-2">
                                                                <Text className="text-rose-400 font-mono text-[9px] font-bold mb-1">◀ OLD VALUE</Text>
                                                                <Text className="text-rose-300 font-mono text-[9px]">
                                                                    {JSON.stringify(log.old_value, null, 2)}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {log.new_value && (
                                                            <View className="bg-emerald-950/40 border border-emerald-900/40 rounded-lg p-2">
                                                                <Text className="text-emerald-400 font-mono text-[9px] font-bold mb-1">▶ NEW VALUE</Text>
                                                                <Text className="text-emerald-300 font-mono text-[9px]">
                                                                    {JSON.stringify(log.new_value, null, 2)}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        )
                                    })
                                )}
                                {/* Blinking cursor line */}
                                <View className="h-5" />
                                <View className="flex-row items-center gap-2">
                                    <View className="w-2 h-4 bg-teal-500 opacity-70" />
                                </View>
                                <View className="h-6" />
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    )
}
