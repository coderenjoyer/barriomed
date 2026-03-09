import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { AddUserModal } from './usermodal'

interface User {
    id: string
    name: string
    email: string
    role: 'admin' | 'staff' | 'viewer'
    lastLogin: string
    active: boolean
    avatar: string
}

const MOCK_USERS: User[] = [
    {
        id: '1',
        name: 'Dr. Maria Santos',
        email: 'maria@health.gov',
        role: 'admin',
        lastLogin: '2 hours ago',
        active: true,
        avatar:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
        id: '2',
        name: 'Juan Dela Cruz',
        email: 'juan@health.gov',
        role: 'staff',
        lastLogin: '1 day ago',
        active: true,
        avatar:
            'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
        id: '3',
        name: 'Ana Reyes',
        email: 'ana@health.gov',
        role: 'viewer',
        lastLogin: '1 week ago',
        active: false,
        avatar:
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
        id: '4',
        name: 'Pedro Garcia',
        email: 'pedro@health.gov',
        role: 'staff',
        lastLogin: '3 hours ago',
        active: true,
        avatar:
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
]

export function UserManagement() {
    const [users, setUsers] = useState<User[]>(MOCK_USERS)
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const handleAddUser = (userData: {
        name: string
        email: string
        role: 'admin' | 'staff' | 'viewer'
    }) => {
        const newUser: User = {
            id: Math.random().toString(36).substr(2, 9),
            ...userData,
            lastLogin: 'Never',
            active: true,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
        }
        setUsers([newUser, ...users])
    }

    const toggleStatus = (id: string) => {
        setUsers(
            users.map((user) =>
                user.id === id
                    ? {
                        ...user,
                        active: !user.active,
                    }
                    : user,
            ),
        )
    }

    const getRoleBadge = (role: User['role']) => {
        switch (role) {
            case 'admin':
                return (
                    <View className="px-2 py-1 rounded-md bg-purple-100 border border-purple-200 self-start">
                        <Text className="text-xs font-bold text-purple-700 uppercase">ADMIN</Text>
                    </View>
                )
            case 'staff':
                return (
                    <View className="px-2 py-1 rounded-md bg-teal-100 border border-teal-200 self-start">
                        <Text className="text-xs font-bold text-teal-700 uppercase">STAFF</Text>
                    </View>
                )
            case 'viewer':
                return (
                    <View className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200 self-start">
                        <Text className="text-xs font-bold text-gray-600 uppercase">VIEWER</Text>
                    </View>
                )
        }
    }

    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    return (
        <View className="space-y-6 flex-1">
            <View className="flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <View>
                    <Text className="text-2xl font-bold text-gray-900">
                        User & Role Management
                    </Text>
                    <Text className="text-gray-500 mt-1">Manage system access and permissions</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setIsAddModalOpen(true)}
                    className="flex-row items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 rounded-xl active:bg-teal-700 shadow-lg shadow-teal-200"
                >
                    <Feather name="user-plus" size={20} color="white" />
                    <Text className="text-white font-semibold">Add New User</Text>
                </TouchableOpacity>
            </View>

            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex-1">
                {/* Toolbar */}
                <View className="p-4 border-b border-gray-100 bg-gray-50 flex-row items-center gap-4">
                    <View className="relative flex-1 max-w-md justify-center">
                        <View className="absolute left-3 z-10">
                            <Feather name="search" size={16} color="#9CA3AF" />
                        </View>
                        <TextInput
                            placeholder="Search users..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="w-full pl-10 pr-4 bg-white border border-gray-200 rounded-xl focus:border-teal-500 text-sm text-gray-900 h-10"
                        />
                    </View>
                </View>

                {/* List View */}
                <ScrollView className="flex-1">
                    {/* Header Row - Hidden on small screens, shown as flex header otherwise */}
                    <View className="bg-gray-50 border-b border-gray-100 flex-row px-4 py-3 hidden md:flex">
                        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-[2] pl-2">User</Text>
                        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">Role</Text>
                        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">Last Login</Text>
                        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">Status</Text>
                        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider w-20 text-right pr-2">Actions</Text>
                    </View>

                    <View className="flex-col">
                        {filteredUsers.map((user, index) => (
                            <View
                                key={user.id}
                                className={`flex-col md:flex-row p-4 items-start md:items-center gap-4 md:gap-0 ${
                                    index !== filteredUsers.length - 1 ? 'border-b border-gray-100' : ''
                                }`}
                            >
                                <View className="flex-row items-center gap-3 flex-[2] w-full md:w-auto md:pl-2">
                                    <Image
                                        source={{ uri: user.avatar }}
                                        className="w-10 h-10 rounded-full border border-gray-200"
                                    />
                                    <View className="flex-col flex-1">
                                        <Text className="font-bold text-gray-900 text-sm">
                                            {user.name}
                                        </Text>
                                        <Text className="text-xs text-gray-500">
                                            {user.email}
                                        </Text>
                                    </View>
                                </View>

                                <View className="w-full md:w-auto md:flex-1 flex-row md:flex-col items-center justify-between md:items-start md:justify-center">
                                    <Text className="text-xs font-bold text-gray-400 md:hidden">Role</Text>
                                    {getRoleBadge(user.role)}
                                </View>
                                
                                <View className="w-full md:w-auto md:flex-1 flex-row md:flex-col items-center justify-between md:items-start md:justify-center">
                                    <Text className="text-xs font-bold text-gray-400 md:hidden">Last Login</Text>
                                    <Text className="text-sm text-gray-500 font-mono">
                                        {user.lastLogin}
                                    </Text>
                                </View>

                                <View className="w-full md:w-auto md:flex-1 flex-row md:flex-col items-center justify-between md:items-start md:justify-center">
                                    <Text className="text-xs font-bold text-gray-400 md:hidden">Status</Text>
                                    <View className="flex-row items-center gap-2">
                                        <View
                                            className={`w-2 h-2 rounded-full ${user.active ? 'bg-green-500' : 'bg-gray-300'}`}
                                        />
                                        <Text
                                            className={`text-sm font-medium ${user.active ? 'text-green-700' : 'text-gray-500'}`}
                                        >
                                            {user.active ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>

                                <View className="w-full md:flex-none md:w-20 items-end justify-between md:justify-center md:pr-2 flex-row md:flex-col">
                                    <Text className="text-xs font-bold text-gray-400 md:hidden">Actions</Text>
                                    <View className="flex-row items-center justify-end gap-2">
                                        <TouchableOpacity
                                            className="p-2 rounded-lg bg-gray-50 active:bg-teal-50"
                                        >
                                            <Feather name="lock" size={16} color="#9CA3AF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => toggleStatus(user.id)}
                                            className={`p-2 rounded-lg ${user.active ? 'bg-gray-50 active:bg-rose-50' : 'bg-gray-50 active:bg-green-50'}`}
                                        >
                                            <Feather name="power" size={16} color={user.active ? "#F87171" : "#10B981"} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
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
