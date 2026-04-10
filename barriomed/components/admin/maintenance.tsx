import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Switch,
    ActivityIndicator,
    Modal,
    Animated,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { adminService, FeatureName, FeatureToggle } from '../../backend/lib/adminService'
import { useAuth } from '../../backend/lib/AuthContext'

// ─── Feature metadata ─────────────────────────────────────────────────────────

interface FeatureMeta {
    name: FeatureName
    label: string
    description: string
    impact: string
    icon: (color: string) => React.ReactNode
    accentColor: string
    accentBg: string
    accentBorder: string
    accentText: string
}

const FEATURES: FeatureMeta[] = [
    {
        name: 'login',
        label: 'Login',
        description: 'Allows users to sign in to the system.',
        impact: 'Disabling this will lock ALL users out, including patients, doctors and staff. Admins retain access.',
        icon: (color) => <Feather name="log-in" size={20} color={color} />,
        accentColor: '#0D9488',
        accentBg: 'bg-teal-50',
        accentBorder: 'border-teal-200',
        accentText: 'text-teal-700',
    },
    {
        name: 'chat',
        label: 'Chat',
        description: 'Enables real-time messaging between doctors and patients.',
        impact: 'Disabling this blocks all message sending and receiving across the platform.',
        icon: (color) => <Feather name="message-circle" size={20} color={color} />,
        accentColor: '#2563EB',
        accentBg: 'bg-blue-50',
        accentBorder: 'border-blue-200',
        accentText: 'text-blue-700',
    },
    {
        name: 'queue',
        label: 'Queue',
        description: 'Controls the patient queue and ticketing system.',
        impact: 'Disabling this blocks ticket creation, joining, and all queue operations.',
        icon: (color) => <Feather name="list" size={20} color={color} />,
        accentColor: '#7C3AED',
        accentBg: 'bg-violet-50',
        accentBorder: 'border-violet-200',
        accentText: 'text-violet-700',
    },
]

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
    visible: boolean
    feature: FeatureMeta | null
    nextEnabled: boolean
    onConfirm: () => void
    onCancel: () => void
    isLoading: boolean
}

function ConfirmModal({ visible, feature, nextEnabled, onConfirm, onCancel, isLoading }: ConfirmModalProps) {
    const scaleAnim = useRef(new Animated.Value(0.88)).current
    const opacityAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
            ]).start()
        } else {
            scaleAnim.setValue(0.88)
            opacityAnim.setValue(0)
        }
    }, [visible])

    if (!feature) return null

    const actionLabel = nextEnabled ? 'Enable' : 'Disable'
    const dangerMode = !nextEnabled
    const btnColor = dangerMode ? '#EF4444' : feature.accentColor

    return (
        <Modal transparent animationType="none" visible={visible} onRequestClose={onCancel}>
            {/* Backdrop */}
            <Animated.View
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', opacity: opacityAnim }}
            >
                {/* Card */}
                <Animated.View style={{ transform: [{ scale: scaleAnim }], width: 400, maxWidth: '92%' }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 }}>
                        {/* Header stripe */}
                        <View style={{ backgroundColor: dangerMode ? '#FEF2F2' : '#F0FDFA', padding: 20, borderBottomWidth: 1, borderBottomColor: dangerMode ? '#FECACA' : '#CCFBF1', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: dangerMode ? '#FEE2E2' : '#CCFBF1', alignItems: 'center', justifyContent: 'center' }}>
                                {dangerMode
                                    ? <Feather name="alert-triangle" size={20} color="#EF4444" />
                                    : <Feather name="check-circle" size={20} color={feature.accentColor} />
                                }
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '800', fontSize: 15, color: '#111827' }}>
                                    {actionLabel} {feature.label}?
                                </Text>
                                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                                    This change takes effect immediately.
                                </Text>
                            </View>
                        </View>

                        {/* Body */}
                        <View style={{ padding: 20, gap: 12 }}>
                            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
                                You are about to <Text style={{ fontWeight: '700', color: btnColor }}>{actionLabel.toLowerCase()}</Text> the{' '}
                                <Text style={{ fontWeight: '700' }}>{feature.label}</Text> feature system-wide.
                            </Text>

                            {dangerMode && (
                                <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                                    <Feather name="alert-circle" size={14} color="#DC2626" style={{ marginTop: 1 }} />
                                    <Text style={{ fontSize: 12, color: '#991B1B', lineHeight: 18, flex: 1 }}>
                                        {feature.impact}
                                    </Text>
                                </View>
                            )}

                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                                This action will be logged with your user ID and a timestamp.
                            </Text>
                        </View>

                        {/* Actions */}
                        <View style={{ padding: 16, paddingTop: 0, flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                onPress={onCancel}
                                disabled={isLoading}
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center' }}
                            >
                                <Text style={{ fontWeight: '700', color: '#374151', fontSize: 14 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onConfirm}
                                disabled={isLoading}
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: btnColor, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: isLoading ? 0.7 : 1 }}
                            >
                                {isLoading
                                    ? <ActivityIndicator size="small" color="white" />
                                    : <>
                                        <Feather name={dangerMode ? 'power' : 'check'} size={14} color="white" />
                                        <Text style={{ fontWeight: '800', color: 'white', fontSize: 14 }}>{actionLabel}</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    )
}

// ─── Toggle Card ──────────────────────────────────────────────────────────────

interface ToggleCardProps {
    meta: FeatureMeta
    toggle: FeatureToggle | undefined
    onToggle: (meta: FeatureMeta, nextEnabled: boolean) => void
    isSaving: boolean
}

function ToggleCard({ meta, toggle, onToggle, isSaving }: ToggleCardProps) {
    const isEnabled = toggle?.is_enabled ?? true
    const updatedAt = toggle?.updated_at
        ? new Date(toggle.updated_at).toLocaleString('en-PH', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
        : '—'

    return (
        <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: isEnabled ? '#E5E7EB' : '#FECACA',
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
            overflow: 'hidden',
        }}>
            {/* Top accent bar */}
            <View style={{ height: 3, backgroundColor: isEnabled ? meta.accentColor : '#FCA5A5' }} />

            <View style={{ padding: 20 }}>
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{
                        width: 44, height: 44, borderRadius: 14,
                        backgroundColor: isEnabled ? meta.accentColor + '18' : '#FEE2E2',
                        alignItems: 'center', justifyContent: 'center', marginRight: 12,
                    }}>
                        {meta.icon(isEnabled ? meta.accentColor : '#EF4444')}
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', fontSize: 16, color: '#111827' }}>{meta.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <View style={{
                                width: 6, height: 6, borderRadius: 3,
                                backgroundColor: isEnabled ? '#10B981' : '#EF4444',
                            }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: isEnabled ? '#059669' : '#DC2626' }}>
                                {isEnabled ? 'ENABLED' : 'DISABLED'}
                            </Text>
                        </View>
                    </View>

                    {/* Switch */}
                    <Switch
                        value={isEnabled}
                        onValueChange={(val) => onToggle(meta, val)}
                        disabled={isSaving}
                        trackColor={{ false: '#FCA5A5', true: meta.accentColor + 'AA' }}
                        thumbColor={isEnabled ? meta.accentColor : '#EF4444'}
                        ios_backgroundColor="#D1D5DB"
                        style={{ opacity: isSaving ? 0.5 : 1 }}
                    />
                </View>

                {/* Description */}
                <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 12 }}>
                    {meta.description}
                </Text>

                {/* Impact warning (when disabled) */}
                {!isEnabled && (
                    <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 10, flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginBottom: 12 }}>
                        <Feather name="alert-circle" size={12} color="#DC2626" style={{ marginTop: 1 }} />
                        <Text style={{ fontSize: 11, color: '#991B1B', lineHeight: 16, flex: 1 }}>
                            {meta.impact}
                        </Text>
                    </View>
                )}

                {/* Footer: last changed */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <Feather name="clock" size={11} color="#9CA3AF" />
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Last updated: {updatedAt}</Text>
                </View>
            </View>
        </View>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DataMaintenance() {
    const { userProfile } = useAuth()
    const adminId = userProfile?.id ?? ''

    // ── State ──────────────────────────────────────────────────────────────────
    const [toggles, setToggles] = useState<Record<FeatureName, FeatureToggle> | null>(null)
    const [loading, setLoading] = useState(true)
    const [savingFeature, setSavingFeature] = useState<FeatureName | null>(null)
    const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null)

    // Confirmation modal
    const [pendingToggle, setPendingToggle] = useState<{ meta: FeatureMeta; nextEnabled: boolean } | null>(null)
    const [isConfirming, setIsConfirming] = useState(false)

    // Toast fade animation
    const toastOpacity = useRef(new Animated.Value(0)).current
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Data loading ───────────────────────────────────────────────────────────

    const loadToggles = useCallback(async () => {
        try {
            const data = await adminService.fetchFeatureToggles()
            setToggles(data)
        } catch (e) {
            console.error('[DataMaintenance] loadToggles error:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadToggles()
        const unsub = adminService.subscribeToFeatureToggles(loadToggles)
        return unsub
    }, [loadToggles])

    // ── Toast helper ───────────────────────────────────────────────────────────

    const showToast = (message: string, success: boolean) => {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast({ message, success })
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(2800),
            Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => {
            setToast(null)
            toastTimer.current = null
        })
    }

    // ── Toggle request: show confirmation ─────────────────────────────────────

    const handleToggleRequest = (meta: FeatureMeta, nextEnabled: boolean) => {
        setPendingToggle({ meta, nextEnabled })
    }

    // ── Confirmed toggle: persist to DB ───────────────────────────────────────

    const handleConfirm = async () => {
        if (!pendingToggle || !adminId) return

        setSavingFeature(pendingToggle.meta.name)
        setIsConfirming(true)

        const result = await adminService.setFeatureToggle({
            feature: pendingToggle.meta.name,
            enabled: pendingToggle.nextEnabled,
            adminId,
        })

        setIsConfirming(false)
        setSavingFeature(null)
        setPendingToggle(null)

        if (result.success) {
            // Optimistically update local state while realtime catches up
            setToggles(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    [pendingToggle.meta.name]: {
                        ...prev[pendingToggle.meta.name],
                        is_enabled: pendingToggle.nextEnabled,
                        updated_at: new Date().toISOString(),
                        updated_by: adminId,
                    },
                }
            })
            const verb = pendingToggle.nextEnabled ? 'enabled' : 'disabled'
            showToast(`✓ ${pendingToggle.meta.label} feature ${verb} successfully.`, true)
        } else {
            showToast(`✗ Failed to update toggle: ${result.error ?? 'Unknown error'}`, false)
        }
    }

    const handleCancel = () => {
        if (!isConfirming) setPendingToggle(null)
    }

    // ── Overall system status ──────────────────────────────────────────────────

    const allEnabled = toggles
        ? FEATURES.every(f => toggles[f.name]?.is_enabled !== false)
        : true
    const disabledCount = toggles
        ? FEATURES.filter(f => toggles[f.name]?.is_enabled === false).length
        : 0

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center' }}>

                {/* ── Page Header ── */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>Maintenance</Text>
                    <Text style={{ color: '#6B7280', marginTop: 4, fontSize: 14 }}>
                        Control system feature availability. Changes take effect immediately for all users.
                    </Text>
                </View>

                {/* ── System Status Banner ── */}
                <View style={{
                    backgroundColor: allEnabled ? '#F0FDFA' : '#FEF2F2',
                    borderWidth: 1.5,
                    borderColor: allEnabled ? '#99F6E4' : '#FECACA',
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 28,
                }}>
                    <View style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: allEnabled ? '#CCFBF1' : '#FEE2E2',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <MaterialCommunityIcons
                            name={allEnabled ? 'shield-check-outline' : 'shield-alert-outline'}
                            size={22}
                            color={allEnabled ? '#0F766E' : '#DC2626'}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', fontSize: 14, color: allEnabled ? '#0F766E' : '#991B1B' }}>
                            {allEnabled ? 'All Systems Operational' : `${disabledCount} Feature${disabledCount > 1 ? 's' : ''} Disabled`}
                        </Text>
                        <Text style={{ fontSize: 12, color: allEnabled ? '#0D9488' : '#DC2626', marginTop: 1 }}>
                            {allEnabled
                                ? 'Login, Chat, and Queue are fully active.'
                                : 'Some users may be blocked from accessing certain features.'
                            }
                        </Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color={allEnabled ? '#0D9488' : '#DC2626'} />}
                </View>

                {/* ── Feature Toggle Cards ── */}
                {loading ? (
                    <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}>
                        <ActivityIndicator size="large" color="#0D9488" />
                        <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Loading feature states…</Text>
                    </View>
                ) : (
                    <View style={{ gap: 16 }}>
                        {FEATURES.map(meta => (
                            <ToggleCard
                                key={meta.name}
                                meta={meta}
                                toggle={toggles?.[meta.name]}
                                onToggle={handleToggleRequest}
                                isSaving={savingFeature === meta.name}
                            />
                        ))}
                    </View>
                )}

                {/* ── Info Footer ── */}
                <View style={{
                    marginTop: 32,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'flex-start',
                }}>
                    <Feather name="info" size={14} color="#6B7280" style={{ marginTop: 1 }} />
                    <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }}>Notes</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 17 }}>
                            • All toggle changes are atomic — no partial updates occur.{'\n'}
                            • Every change is logged with your user ID, the action (enable/disable), feature name, and a timestamp.{'\n'}
                            • Toggle states persist in the database and are propagated in real-time to all connected clients.{'\n'}
                            • Default state for all features is <Text style={{ fontWeight: '700' }}>Enabled</Text>.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </View>

            {/* ── Confirmation Modal ── */}
            <ConfirmModal
                visible={pendingToggle !== null}
                feature={pendingToggle?.meta ?? null}
                nextEnabled={pendingToggle?.nextEnabled ?? true}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                isLoading={isConfirming}
            />

            {/* ── Toast Notification ── */}
            {toast && (
                <Animated.View
                    style={{
                        position: 'absolute',
                        bottom: 28,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                        opacity: toastOpacity,
                        pointerEvents: 'none',
                    }}
                >
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 14,
                        backgroundColor: toast.success ? '#0F766E' : '#DC2626',
                        shadowColor: '#000',
                        shadowOpacity: 0.15,
                        shadowRadius: 16,
                        elevation: 8,
                        maxWidth: 420,
                    }}>
                        <Feather
                            name={toast.success ? 'check-circle' : 'x-circle'}
                            size={16}
                            color="white"
                        />
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
                            {toast.message}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </ScrollView>
    )
}
