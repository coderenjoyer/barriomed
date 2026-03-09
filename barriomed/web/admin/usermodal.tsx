import React, { useState, useRef, useEffect } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Animated } from 'react-native'
import { Feather } from '@expo/vector-icons'

interface AddUserModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (user: {
        name: string
        email: string
        role: 'admin' | 'staff' | 'viewer'
    }) => void
}

export function AddUserModal({ isOpen, onClose, onAdd }: AddUserModalProps) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'admin' | 'staff' | 'viewer'>('staff')
    const [isLoading, setIsLoading] = useState(false)

    // For custom dropdown
    const [showRoles, setShowRoles] = useState(false)

    const scaleValue = useRef(new Animated.Value(0.95)).current;
    const opacityValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isOpen) {
            Animated.parallel([
                Animated.timing(scaleValue, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityValue, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            scaleValue.setValue(0.95);
            opacityValue.setValue(0);
            setShowRoles(false);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        setIsLoading(true)
        // Simulate API call
        setTimeout(() => {
            onAdd({
                name,
                email,
                role,
            })
            setIsLoading(false)
            onClose()
            setName('')
            setEmail('')
            setRole('staff')
            setShowRoles(false)
        }, 800)
    }

    const roleLabels = {
        staff: 'Staff (Standard Access)',
        admin: 'Admin (Full Access)',
        viewer: 'Viewer (Read Only)'
    }

    if (!isOpen) return null;

    return (
        <Modal
            visible={isOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View 
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
            >
                <TouchableOpacity 
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
                    activeOpacity={1} 
                    onPress={onClose} 
                />

                <Animated.View
                    style={{
                        transform: [{ scale: scaleValue }],
                        opacity: opacityValue,
                        backgroundColor: 'white',
                        borderRadius: 24,
                        padding: 24,
                        width: '100%',
                        maxWidth: 400,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.15,
                        shadowRadius: 20,
                        elevation: 10,
                        zIndex: 10,
                    }}
                >
                    <View className="flex-row items-center justify-between mb-6">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-teal-100 rounded-xl items-center justify-center">
                                <Feather name="user-plus" size={20} color="#0D9488" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-gray-900">Add New User</Text>
                                <Text className="text-sm text-gray-500">Create account for staff member</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="p-2 rounded-full active:bg-gray-100"
                        >
                            <Feather name="x" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-col gap-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Full Name</Text>
                            <View className="relative justify-center">
                                <View className="absolute left-3 z-10">
                                    <Feather name="user" size={16} color="#9CA3AF" />
                                </View>
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    className="w-full pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-teal-500 text-black h-12"
                                    placeholder="e.g. Juan Dela Cruz"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Email Address</Text>
                            <View className="relative justify-center">
                                <View className="absolute left-3 z-10">
                                    <Feather name="mail" size={16} color="#9CA3AF" />
                                </View>
                                <TextInput
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                    className="w-full pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-teal-500 text-black h-12"
                                    placeholder="e.g. juan@health.gov"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View className="z-20">
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Role</Text>
                            <View className="relative">
                                <TouchableOpacity
                                    onPress={() => setShowRoles(!showRoles)}
                                    className="w-full px-3 bg-gray-50 border border-gray-200 rounded-xl h-12 flex-row items-center justify-between"
                                >
                                    <View className="flex-row items-center gap-3">
                                        <Feather name="shield" size={16} color="#9CA3AF" />
                                        <Text className="text-gray-900">{roleLabels[role]}</Text>
                                    </View>
                                    <Feather name={showRoles ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                                </TouchableOpacity>

                                {showRoles && (
                                    <View className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                        {(Object.keys(roleLabels) as Array<keyof typeof roleLabels>).map((k) => (
                                            <TouchableOpacity
                                                key={k}
                                                onPress={() => {
                                                    setRole(k as 'admin' | 'staff' | 'viewer')
                                                    setShowRoles(false)
                                                }}
                                                className={`p-3 border-b border-gray-100 ${role === k ? 'bg-teal-50' : ''}`}
                                            >
                                                <Text className={`${role === k ? 'text-teal-700 font-medium' : 'text-gray-700'}`}>
                                                    {roleLabels[k as keyof typeof roleLabels]}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View className="pt-4 flex-row gap-3 z-10">
                            <TouchableOpacity
                                onPress={onClose}
                                className="flex-1 py-3 items-center justify-center rounded-xl bg-gray-50 active:bg-gray-100"
                            >
                                <Text className="text-gray-600 font-medium">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={isLoading}
                                className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl shadow-lg shadow-teal-200 ${
                                    isLoading ? 'bg-teal-400 opacity-70' : 'bg-teal-600 active:bg-teal-700'
                                }`}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text className="text-white font-semibold">Create User</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    )
}
