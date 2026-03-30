import React, { useState, useRef, useEffect } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Animated, ScrollView } from 'react-native'
// Note: ScrollView kept for the inner form scroll
import { Feather } from '@expo/vector-icons'
import { SystemRole } from './usermanagement'

interface AddUserModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (user: {
        firstName: string
        lastName: string
        email: string
        role: SystemRole
        password: string
    }) => Promise<{ success: boolean; error?: string }>
}

const ROLES: { value: SystemRole; label: string; description: string; color: string; textColor: string; borderColor: string }[] = [
    { value: 'doctor',       label: 'Doctor',       description: 'Patient consultations & e-prescriptions',   color: '#ECFDF5', textColor: '#065F46', borderColor: '#6EE7B7' },
    { value: 'health_staff', label: 'Health Staff', description: 'Queue management & inventory oversight',     color: '#F0FDFA', textColor: '#0D9488', borderColor: '#99F6E4' },
]

export function AddUserModal({ isOpen, onClose, onAdd }: AddUserModalProps) {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState<SystemRole>('doctor')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const scaleValue = useRef(new Animated.Value(0.95)).current
    const opacityValue = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (isOpen) {
            Animated.parallel([
                Animated.timing(scaleValue, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.timing(opacityValue, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start()
        } else {
            scaleValue.setValue(0.95)
            opacityValue.setValue(0)
        }
    }, [isOpen])

    const resetForm = () => {
        setFirstName(''); setLastName(''); setEmail('')
        setPassword(''); setRole('health_staff'); setError(''); setSuccess(false)
    }

    const handleClose = () => { resetForm(); onClose() }

    const handleSubmit = async () => {
        if (!firstName.trim()) { setError('First name is required.'); return }
        if (!lastName.trim()) { setError('Last name is required.'); return }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

        setIsLoading(true)
        setError('')

        const result = await onAdd({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), role, password })

        if (result.success) {
            setSuccess(true)
            setTimeout(() => { handleClose() }, 1200)
        } else {
            setError(result.error ?? 'Failed to create user. Please try again.')
        }
        setIsLoading(false)
    }

    if (!isOpen) return null

    return (
        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={handleClose} />
                <Animated.View
                    style={{
                        transform: [{ scale: scaleValue }],
                        opacity: opacityValue,
                        backgroundColor: 'white',
                        borderRadius: 24,
                        padding: 24,
                        width: '100%',
                        maxWidth: 480,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.2,
                        shadowRadius: 24,
                        elevation: 12,
                        zIndex: 10,
                    }}
                >
                    {/* Modal Header */}
                    <View className="flex-row items-center justify-between mb-5">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-teal-100 rounded-xl items-center justify-center">
                                <Feather name="user-plus" size={18} color="#0D9488" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-gray-900">Add New User</Text>
                                <Text className="text-sm text-gray-500">Creates a real Supabase account</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleClose} className="p-2 rounded-full">
                            <Feather name="x" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    {/* Warning Notice */}
                    <View className="flex-row items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                        <Feather name="shield" size={14} color="#D97706" />
                        <Text className="text-xs text-amber-700 flex-1">
                            This action creates a real database account. All admin actions are logged and traceable.
                        </Text>
                    </View>

                    {/* Success */}
                    {success && (
                        <View className="flex-row items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl p-3 mb-4">
                            <Feather name="check-circle" size={16} color="#0D9488" />
                            <Text className="text-sm font-bold text-teal-700">User created successfully!</Text>
                        </View>
                    )}

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="gap-4">
                            {/* Name Row */}
                            <View className="flex-row gap-3">
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-1.5">First Name</Text>
                                    <TextInput
                                        value={firstName}
                                        onChangeText={t => { setFirstName(t); setError('') }}
                                        className="w-full px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                        placeholder="Juan"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="words"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-1.5">Last Name</Text>
                                    <TextInput
                                        value={lastName}
                                        onChangeText={t => { setLastName(t); setError('') }}
                                        className="w-full px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                        placeholder="Dela Cruz"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View>
                                <Text className="text-sm font-semibold text-gray-700 mb-1.5">Email Address</Text>
                                <View className="relative justify-center">
                                    <View className="absolute left-3 z-10"><Feather name="mail" size={15} color="#9CA3AF" /></View>
                                    <TextInput
                                        value={email}
                                        onChangeText={t => { setEmail(t); setError('') }}
                                        className="w-full pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                        placeholder="juan@health.gov"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                            </View>

                            {/* Password */}
                            <View>
                                <Text className="text-sm font-semibold text-gray-700 mb-1.5">Initial Password / PIN</Text>
                                <View className="relative justify-center">
                                    <View className="absolute left-3 z-10"><Feather name="lock" size={15} color="#9CA3AF" /></View>
                                    <TextInput
                                        value={password}
                                        onChangeText={t => { setPassword(t); setError('') }}
                                        className="w-full pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 h-11"
                                        placeholder="Min. 6 characters"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry
                                    />
                                </View>
                                <Text className="text-xs text-gray-400 mt-1">User can change this after first login.</Text>
                            </View>

                            {/* Role Selection */}
                            <View>
                                <Text className="text-sm font-semibold text-gray-700 mb-1.5">Assign Role</Text>
                                <View className="flex-row gap-3">
                                    {ROLES.map(r => {
                                        const isSelected = role === r.value
                                        return (
                                            <TouchableOpacity
                                                key={r.value}
                                                onPress={() => setRole(r.value)}
                                                style={{
                                                    flex: 1,
                                                    borderRadius: 14,
                                                    borderWidth: 2,
                                                    borderColor: isSelected ? r.borderColor : '#E5E7EB',
                                                    backgroundColor: isSelected ? r.color : '#F9FAFB',
                                                    padding: 14,
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                    {isSelected && (
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.textColor }} />
                                                    )}
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: r.textColor }}>{r.label}</Text>
                                                </View>
                                                <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 16 }}>{r.description}</Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </View>

                            {/* Error */}
                            {error ? (
                                <View className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex-row items-center gap-2">
                                    <Feather name="alert-circle" size={14} color="#E11D48" />
                                    <Text className="text-sm text-rose-700 font-medium flex-1">{error}</Text>
                                </View>
                            ) : null}

                            {/* Actions */}
                            <View className="flex-row gap-3 pt-2">
                                <TouchableOpacity
                                    onPress={handleClose}
                                    className="flex-1 py-3 items-center justify-center rounded-xl bg-gray-50 border border-gray-200"
                                >
                                    <Text className="text-gray-600 font-semibold">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={isLoading || success}
                                    className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl shadow-lg shadow-teal-200 ${
                                        isLoading || success ? 'bg-teal-400' : 'bg-teal-600'
                                    }`}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <Feather name="user-plus" size={16} color="white" />
                                            <Text className="text-white font-bold">Create User</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    )
}
