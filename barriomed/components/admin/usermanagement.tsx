import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { AddUserModal } from './usermodal'
import { adminService, AdminUser, AdminRole, logAdminAction } from '../../backend/lib/adminService'
import { useAuth } from '../../backend/lib/AuthContext'

// These match the DbRole enum in AuthContext / Supabase
export type SystemRole = 'patient' | 'doctor' | 'health_staff' | 'system_admin'

const ROLE_CONFIG: Record<SystemRole, { label: string; bg: string; text: string; border: string }> = {
    patient:      { label: 'Patient',      bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
    doctor:       { label: 'Doctor',       bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200' },
    health_staff: { label: 'Health Staff', bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200'   },
    system_admin: { label: 'System Admin', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
}

export function UserManagement() {
    const { userProfile } = useAuth()
    const [users, setUsers] = useState<AdminUser[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filterRole, setFilterRole] = useState<SystemRole | 'all'>('all')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionFeedback, setActionFeedback] = useState<{ id: string; type: 'success' | 'error'; msg: string } | null>(null)

    const adminId = userProfile?.id ?? ''
    const adminName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'System Admin'

    // ── Load Users ────────────────────────────────────────────────────────────

    const loadUsers = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await adminService.fetchAllUsers()
            setUsers(data)
        } catch (e: any) {
            setError('Failed to load users. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadUsers()
    }, [loadUsers])

    // ── Add User ──────────────────────────────────────────────────────────────

    const handleAddUser = async (userData: { firstName: string; lastName: string; email: string; role: SystemRole; password: string }) => {
        const result = await adminService.createUser({
            ...userData,
            adminId,
        })
        if (result.success) {
            await loadUsers()
            return { success: true }
        }
        return { success: false, error: result.error }
    }

    // ── Toggle Active Status ───────────────────────────────────────────────────

    const toggleStatus = async (user: AdminUser) => {
        // Don't allow deactivating yourself
        if (user.id === adminId) return
        setLoadingId(user.id)
        setActionFeedback(null)

        const newActive = !user.is_active
        const result = await adminService.setUserActiveStatus({
            userId: user.id,
            active: newActive,
            adminId,
        })

        if (result.success) {
            setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, is_active: newActive } : u
            ))
            setActionFeedback({ id: user.id, type: 'success', msg: newActive ? 'Reactivated' : 'Deactivated' })
        } else {
            setActionFeedback({ id: user.id, type: 'error', msg: result.error ?? 'Action failed' })
        }
        setTimeout(() => setActionFeedback(null), 2500)
        setLoadingId(null)
    }

    // ── Role Change ───────────────────────────────────────────────────────────

    const handleRoleChange = async (user: AdminUser, newRole: SystemRole) => {
        if (user.id === adminId) return // guard
        setLoadingId(user.id)
        const result = await adminService.updateUserRole({ userId: user.id, newRole, adminId })
        if (result.success) {
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
            setActionFeedback({ id: user.id, type: 'success', msg: `Role → ${ROLE_CONFIG[newRole].label}` })
        } else {
            setActionFeedback({ id: user.id, type: 'error', msg: result.error ?? 'Role update failed' })
        }
        setTimeout(() => setActionFeedback(null), 2500)
        setLoadingId(null)
    }

    // ── Filter / Search ───────────────────────────────────────────────────────

    const filteredUsers = users.filter(user => {
        const matchSearch =
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchRole = filterRole === 'all' || user.role === filterRole
        return matchSearch && matchRole
    })

    const roleStats = Object.keys(ROLE_CONFIG) as SystemRole[]

    const getRoleBadge = (role: SystemRole) => {
        const cfg = ROLE_CONFIG[role]
        return (
            <View className={`px-2 py-1 rounded-lg border self-start ${cfg.bg} ${cfg.border}`}>
                <Text className={`text-xs font-bold ${cfg.text}`}>{cfg.label.toUpperCase()}</Text>
            </View>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center py-24">
                <ActivityIndicator size="large" color="#0D9488" />
                <Text className="text-gray-400 mt-3 text-sm">Loading users from database…</Text>
            </View>
        )
    }

    return (
        <View className="space-y-6 flex-1">
            {/* Header */}
            <View className="flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <View>
                    <Text className="text-2xl font-bold text-gray-900">User & Role Management</Text>
                    <Text className="text-gray-500 mt-1">
                        Manage system accounts and permissions
                        {' '}
                        <Text className="text-teal-600 font-semibold">· {users.length} total users</Text>
                    </Text>
                </View>
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={loadUsers}
                        className="flex-row items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200"
                    >
                        <Feather name="refresh-cw" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setIsAddModalOpen(true)}
                        className="flex-row items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 rounded-xl shadow-lg shadow-teal-200"
                    >
                        <Feather name="user-plus" size={18} color="white" />
                        <Text className="text-white font-semibold">Add New User</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* DB Error Banner */}
            {error && (
                <View className="flex-row items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-2">
                    <Feather name="alert-circle" size={16} color="#E11D48" />
                    <Text className="text-rose-700 text-sm font-medium flex-1">{error}</Text>
                    <TouchableOpacity onPress={loadUsers}>
                        <Text className="text-rose-600 text-sm font-bold">Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Role Summary Cards */}
            <View className="flex-row flex-wrap gap-3 mb-4">
                {roleStats.map(role => {
                    const count = users.filter(u => u.role === role).length
                    const cfg = ROLE_CONFIG[role]
                    return (
                        <TouchableOpacity
                            key={role}
                            onPress={() => setFilterRole(filterRole === role ? 'all' : role)}
                            className={`flex-1 min-w-[120px] rounded-2xl p-3 border ${cfg.bg} ${cfg.border} ${filterRole === role ? 'opacity-100 shadow-sm' : 'opacity-80'}`}
                        >
                            <Text className={`text-xl font-bold ${cfg.text}`}>{count}</Text>
                            <Text className={`text-xs font-medium mt-0.5 ${cfg.text}`}>{cfg.label}</Text>
                        </TouchableOpacity>
                    )
                })}
            </View>

            {/* Table Card */}
            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex-1">
                {/* Toolbar */}
                <View className="p-4 border-b border-gray-100 bg-gray-50 flex-row items-center gap-4 flex-wrap">
                    <View className="relative flex-1 min-w-[200px] justify-center">
                        <View className="absolute left-3 z-10">
                            <Feather name="search" size={16} color="#9CA3AF" />
                        </View>
                        <TextInput
                            placeholder="Search users…"
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="w-full pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 h-10"
                        />
                    </View>
                    {filterRole !== 'all' && (
                        <TouchableOpacity
                            onPress={() => setFilterRole('all')}
                            className="flex-row items-center gap-1 px-3 py-2 rounded-xl bg-teal-50 border border-teal-200"
                        >
                            <Text className="text-xs font-bold text-teal-700">
                                Filtering: {ROLE_CONFIG[filterRole].label}
                            </Text>
                            <Feather name="x" size={12} color="#0D9488" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Table Header */}
                <View className="bg-gray-50 border-b border-gray-100 flex-row px-4 py-3">
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-[2] pl-2">User</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">Role</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">Joined</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">Status</Text>
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider w-28 text-right pr-2">Actions</Text>
                </View>

                {/* Rows */}
                <ScrollView className="flex-1">
                    <View className="flex-col">
                        {filteredUsers.map((user, index) => {
                            const isActive = user.is_active !== false
                            const feedback = actionFeedback?.id === user.id ? actionFeedback : null
                            return (
                                <View
                                    key={user.id}
                                    className={`flex-row p-4 items-center gap-0 ${
                                        index !== filteredUsers.length - 1 ? 'border-b border-gray-50' : ''
                                    } ${feedback ? (feedback.type === 'success' ? 'bg-teal-50/30' : 'bg-rose-50/30') : ''}`}
                                >
                                    {/* Avatar + Info */}
                                    <View className="flex-row items-center gap-3 flex-[2] pl-2">
                                        <View className={`w-9 h-9 rounded-full items-center justify-center ${ROLE_CONFIG[user.role].bg} border ${ROLE_CONFIG[user.role].border}`}>
                                            <Text className={`text-xs font-bold ${ROLE_CONFIG[user.role].text}`}>{user.initials}</Text>
                                        </View>
                                        <View className="flex-col flex-1">
                                            <Text className="font-bold text-gray-900 text-sm">{user.displayName}</Text>
                                            <Text className="text-xs text-gray-500">{user.email}</Text>
                                        </View>
                                    </View>

                                    {/* Role Badge */}
                                    <View className="flex-1">
                                        {getRoleBadge(user.role)}
                                    </View>

                                    {/* Joined Date */}
                                    <View className="flex-1">
                                        <Text className="text-xs text-gray-500 font-mono">
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                                        </Text>
                                    </View>

                                    {/* Status */}
                                    <View className="flex-1">
                                        {feedback ? (
                                            <Text className={`text-xs font-bold ${feedback.type === 'success' ? 'text-teal-600' : 'text-rose-600'}`}>
                                                {feedback.msg}
                                            </Text>
                                        ) : (
                                            <View className="flex-row items-center gap-2">
                                                <View className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <Text className={`text-sm font-medium ${isActive ? 'text-green-700' : 'text-gray-400'}`}>
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Actions */}
                                    <View className="w-28 flex-row items-center justify-end gap-1.5 pr-2">
                                        {loadingId === user.id ? (
                                            <ActivityIndicator size="small" color="#0D9488" />
                                        ) : (
                                            <>
                                                {/* Don't allow acting on yourself */}
                                                {user.id !== adminId && user.role !== 'system_admin' && (
                                                    <TouchableOpacity
                                                        onPress={() => toggleStatus(user)}
                                                        className={`p-2 rounded-lg border ${isActive ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}
                                                    >
                                                        <Feather name="power" size={13} color={isActive ? '#F87171' : '#10B981'} />
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        )}
                                    </View>
                                </View>
                            )
                        })}
                        {filteredUsers.length === 0 && !isLoading && (
                            <View className="py-12 items-center">
                                <Feather name="users" size={32} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-2">No users match your search</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>

            {isAddModalOpen && (
                <AddUserModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={handleAddUser}
                />
            )}
        </View>
    )
}
