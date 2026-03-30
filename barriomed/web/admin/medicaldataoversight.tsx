import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native'
import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { adminService } from '../../lib/adminService'

type RecordTab = 'records' | 'prescriptions'

interface MedicalRecord {
    id: string
    patientName: string
    patientId: string
    doctorName: string
    date: string
    diagnosis: string
    title: string
    description: string
    notes: string
}

interface Prescription {
    id: string
    patientName: string
    patientId: string
    doctorName: string
    date: string
    medicines: string[]
    status: 'Active' | 'Completed' | 'Cancelled'
}

const PRESC_STATUS: Record<Prescription['status'], { bg: string; text: string; border: string }> = {
    Active:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'   },
    Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    Cancelled: { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200'   },
}

export function MedicalDataOversight() {
    const [tab, setTab] = useState<RecordTab>('records')
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [records, setRecords] = useState<MedicalRecord[]>([])
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [recs, presc] = await Promise.all([
                adminService.fetchAllMedicalRecords(),
                adminService.fetchAllPrescriptions(),
            ])
            setRecords(recs as MedicalRecord[])
            setPrescriptions(presc as Prescription[])
        } catch (e: any) {
            setError('Failed to load medical data. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filteredRecords = records.filter(r =>
        r.patientName.toLowerCase().includes(search.toLowerCase()) ||
        r.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
        r.doctorName.toLowerCase().includes(search.toLowerCase()) ||
        r.title.toLowerCase().includes(search.toLowerCase())
    )

    const filteredPrescriptions = prescriptions.filter(p =>
        p.patientName.toLowerCase().includes(search.toLowerCase()) ||
        p.doctorName.toLowerCase().includes(search.toLowerCase())
    )

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center py-24">
                <ActivityIndicator size="large" color="#0D9488" />
                <Text className="text-gray-400 mt-3 text-sm">Loading medical data…</Text>
            </View>
        )
    }

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
                <View>
                    <Text className="text-2xl font-bold text-gray-900">Medical Data Oversight</Text>
                    <Text className="text-gray-500 mt-1">Read-only access to all patient records and prescriptions</Text>
                </View>
                <TouchableOpacity onPress={loadData} className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <Feather name="refresh-cw" size={16} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {/* DB Error */}
            {error && (
                <View className="flex-row items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4">
                    <Feather name="alert-circle" size={16} color="#E11D48" />
                    <Text className="text-rose-700 text-sm font-medium flex-1">{error}</Text>
                    <TouchableOpacity onPress={loadData}>
                        <Text className="text-rose-600 text-sm font-bold">Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Admin Notice */}
            <View className="flex-row items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                <Feather name="alert-triangle" size={16} color="#D97706" />
                <View className="flex-1">
                    <Text className="text-sm font-bold text-amber-800">Administrative Read Access</Text>
                    <Text className="text-xs text-amber-700 mt-1">
                        You have read-only access to all medical records ({records.length} records, {prescriptions.length} prescriptions).
                        Direct edits are restricted to authorized doctors. Admin corrections require justification in the audit log.
                    </Text>
                </View>
            </View>

            {/* Stats Row */}
            <View className="flex-row gap-4 mb-6 flex-wrap">
                {[
                    { label: 'Medical Records', value: records.length, color: 'bg-teal-50 border-teal-100', text: 'text-teal-700', icon: 'notes-medical' as const },
                    { label: 'Prescriptions',   value: prescriptions.length, color: 'bg-purple-50 border-purple-100', text: 'text-purple-700', icon: 'prescription-bottle-alt' as const },
                ].map(card => (
                    <View key={card.label} className={`flex-1 min-w-[160px] rounded-2xl p-4 border ${card.color} flex-row items-center gap-3`}>
                        <FontAwesome5 name={card.icon} size={18} color={card.text.replace('text-', '').replace('-700', '')} />
                        <View>
                            <Text className={`text-2xl font-bold ${card.text}`}>{card.value}</Text>
                            <Text className="text-xs text-gray-500 font-medium">{card.label}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Search + Tabs + Table */}
            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <View className="p-4 border-b border-gray-100 bg-gray-50 flex-row items-center gap-4 flex-wrap">
                    <View className="relative flex-1 min-w-[200px] justify-center">
                        <View className="absolute left-3 z-10"><Feather name="search" size={16} color="#9CA3AF" /></View>
                        <TextInput
                            placeholder="Search patient, doctor, diagnosis…"
                            placeholderTextColor="#9CA3AF"
                            value={search}
                            onChangeText={setSearch}
                            className="w-full pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 h-10"
                        />
                    </View>
                    <View className="flex-row gap-2">
                        {[{ id: 'records', label: '🩺 Medical Records' }, { id: 'prescriptions', label: '💊 Prescriptions' }].map(t => (
                            <TouchableOpacity
                                key={t.id}
                                onPress={() => { setTab(t.id as RecordTab); setExpandedId(null) }}
                                className={`px-3 py-2 rounded-xl border text-sm ${tab === t.id ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={`text-sm font-semibold ${tab === t.id ? 'text-white' : 'text-gray-600'}`}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Medical Records */}
                {tab === 'records' && (
                    <View>
                        {filteredRecords.map((record, idx) => (
                            <View key={record.id} className={`${idx !== filteredRecords.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                <TouchableOpacity
                                    onPress={() => setExpandedId(expandedId === record.id ? null : record.id)}
                                    className="flex-row items-center px-4 py-4 gap-3"
                                >
                                    <View className="w-10 h-10 rounded-full bg-teal-100 items-center justify-center">
                                        <FontAwesome5 name="notes-medical" size={14} color="#0D9488" />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row items-center gap-2 flex-wrap">
                                            <Text className="font-bold text-gray-900">{record.patientName}</Text>
                                            <Text className="text-xs text-gray-400 font-mono">{record.patientId.slice(0, 8)}…</Text>
                                        </View>
                                        <Text className="text-sm text-gray-600">{record.title || record.diagnosis}</Text>
                                        <Text className="text-xs text-gray-400">{record.date} · {record.doctorName}</Text>
                                    </View>
                                    <Feather name={expandedId === record.id ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                                {expandedId === record.id && (
                                    <View className="mx-4 mb-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Diagnosis</Text>
                                        <Text className="text-sm text-gray-800 font-semibold mb-3">{record.diagnosis}</Text>
                                        {record.description ? (
                                            <>
                                                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</Text>
                                                <Text className="text-sm text-gray-700 leading-relaxed">{record.description}</Text>
                                            </>
                                        ) : null}
                                        <View className="mt-3 pt-3 border-t border-gray-100">
                                            <Text className="text-xs text-gray-400">Record ID: {record.id}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))}
                        {filteredRecords.length === 0 && (
                            <View className="py-12 items-center">
                                <Feather name="file-text" size={32} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-2">No matching records found</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Prescriptions */}
                {tab === 'prescriptions' && (
                    <View>
                        {filteredPrescriptions.map((px, idx) => {
                            const cfg = PRESC_STATUS[px.status]
                            return (
                                <View key={px.id} className={`px-4 py-4 gap-3 ${idx !== filteredPrescriptions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                    <View className="flex-row items-start justify-between">
                                        <View className="flex-row items-center gap-3 flex-1">
                                            <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center">
                                                <FontAwesome5 name="prescription-bottle-alt" size={14} color="#9333EA" />
                                            </View>
                                            <View className="flex-1">
                                                <View className="flex-row items-center gap-2">
                                                    <Text className="font-bold text-gray-900">{px.patientName}</Text>
                                                    <Text className="text-xs text-gray-400 font-mono">{px.patientId.slice(0, 8)}…</Text>
                                                </View>
                                                <Text className="text-xs text-gray-400">{px.date} · {px.doctorName}</Text>
                                            </View>
                                        </View>
                                        <View className={`px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                                            <Text className={`text-xs font-bold ${cfg.text}`}>{px.status}</Text>
                                        </View>
                                    </View>
                                    <View style={{ marginLeft: 52 }} className="gap-1">
                                        {px.medicines.map((med, i) => (
                                            <View key={i} className="flex-row items-center gap-2">
                                                <View className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                <Text className="text-sm text-gray-700">{med}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )
                        })}
                        {filteredPrescriptions.length === 0 && (
                            <View className="py-12 items-center">
                                <Feather name="file-text" size={32} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-2">No matching prescriptions found</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </ScrollView>
    )
}
