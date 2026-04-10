import React, { useState } from 'react';
import {
    View,
    Text,
    Switch,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DoctorAvailability, WorkingHours, chatService, isWithinWorkingHours } from '../../../backend/lib/chatService';

interface Props {
    doctorId: string;
    availability: DoctorAvailability | null;
    onAvailabilityChange: (updated: DoctorAvailability) => void;
}

export function AvailabilityToggle({ doctorId, availability, onAvailabilityChange }: Props) {
    const [isSaving, setIsSaving] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [startTime, setStartTime] = useState(availability?.working_hours_start ?? '08:00');
    const [endTime, setEndTime] = useState(availability?.working_hours_end ?? '17:00');
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    const isOn = availability?.is_available ?? false;
    const withinHours = availability ? isWithinWorkingHours(availability) : false;
    const effectiveStatus = isOn && withinHours ? 'available' : 'unavailable';

    const handleToggle = async (value: boolean) => {
        setIsSaving(true);
        const result = await chatService.setDoctorAvailability(doctorId, value);
        setIsSaving(false);
        if (result.success && result.data) {
            onAvailabilityChange(result.data);
        } else {
            Alert.alert('Error', result.error ?? 'Failed to update availability.');
        }
    };

    const handleSaveSchedule = async () => {
        // Simple validation
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            Alert.alert('Invalid Time', 'Enter times in HH:MM format (e.g. 08:00, 17:00).');
            return;
        }
        setIsSavingSchedule(true);
        const wh: WorkingHours = { startTime, endTime, timezone: 'Asia/Manila' };
        const result = await chatService.updateWorkingHours(doctorId, wh);
        setIsSavingSchedule(false);
        if (result.success && result.data) {
            onAvailabilityChange(result.data);
            setShowSchedule(false);
        } else {
            Alert.alert('Error', result.error ?? 'Failed to update schedule.');
        }
    };

    const statusColor = effectiveStatus === 'available' ? '#10B981' : '#9CA3AF';
    const statusBg   = effectiveStatus === 'available' ? '#F0FDF4' : '#F9FAFB';
    const statusBorder = effectiveStatus === 'available' ? '#BBF7D0' : '#E5E7EB';

    return (
        <>
            <View style={[styles.card, { backgroundColor: statusBg, borderColor: statusBorder }]}>
                {/* Status row */}
                <View style={styles.statusRow}>
                    <View style={styles.statusLeft}>
                        <View style={[styles.dot, { backgroundColor: statusColor }]} />
                        <View>
                            <Text style={styles.statusLabel}>Chat Availability</Text>
                            <Text style={[styles.statusValue, { color: statusColor }]}>
                                {effectiveStatus === 'available'
                                    ? 'Available – Patients can message you'
                                    : isOn && !withinHours
                                        ? 'Outside working hours'
                                        : 'Unavailable – Chat disabled'}
                            </Text>
                        </View>
                    </View>

                    {isSaving ? (
                        <ActivityIndicator size="small" color="#0D9488" />
                    ) : (
                        <Switch
                            value={isOn}
                            onValueChange={handleToggle}
                            trackColor={{ false: '#D1D5DB', true: '#0D9488' }}
                            thumbColor="#FFFFFF"
                        />
                    )}
                </View>

                {/* Working hours mini row */}
                {availability?.working_hours_start && availability?.working_hours_end && (
                    <View style={styles.hoursRow}>
                        <Feather name="clock" size={12} color="#6B7280" />
                        <Text style={styles.hoursText}>
                            Working hours: {availability.working_hours_start} – {availability.working_hours_end}
                        </Text>
                    </View>
                )}

                {/* Edit schedule button */}
                <TouchableOpacity
                    style={styles.scheduleBtn}
                    onPress={() => {
                        setStartTime(availability?.working_hours_start ?? '08:00');
                        setEndTime(availability?.working_hours_end ?? '17:00');
                        setShowSchedule(true);
                    }}
                    activeOpacity={0.7}
                >
                    <Feather name="calendar" size={13} color="#0D9488" />
                    <Text style={styles.scheduleBtnText}>Edit Working Hours</Text>
                </TouchableOpacity>
            </View>

            {/* Working Hours Modal */}
            <Modal visible={showSchedule} transparent animationType="slide" onRequestClose={() => setShowSchedule(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Working Hours</Text>
                            <TouchableOpacity onPress={() => setShowSchedule(false)}>
                                <Feather name="x" size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Chat will automatically enable/disable based on these hours.
                        </Text>

                        <View style={styles.timeRow}>
                            <View style={styles.timeField}>
                                <Text style={styles.timeLabel}>Start Time</Text>
                                <TextInput
                                    value={startTime}
                                    onChangeText={setStartTime}
                                    placeholder="08:00"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.timeInput}
                                    keyboardType="numbers-and-punctuation"
                                    maxLength={5}
                                />
                            </View>
                            <View style={styles.timeSeparator}>
                                <Feather name="arrow-right" size={18} color="#9CA3AF" />
                            </View>
                            <View style={styles.timeField}>
                                <Text style={styles.timeLabel}>End Time</Text>
                                <TextInput
                                    value={endTime}
                                    onChangeText={setEndTime}
                                    placeholder="17:00"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.timeInput}
                                    keyboardType="numbers-and-punctuation"
                                    maxLength={5}
                                />
                            </View>
                        </View>

                        <Text style={styles.timezoneNote}>Timezone: Asia/Manila (PHT)</Text>

                        <TouchableOpacity
                            style={[styles.saveBtn, isSavingSchedule && styles.saveBtnDisabled]}
                            onPress={handleSaveSchedule}
                            disabled={isSavingSchedule}
                            activeOpacity={0.8}
                        >
                            {isSavingSchedule
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Feather name="check" size={16} color="#fff" />
                            }
                            <Text style={styles.saveBtnText}>{isSavingSchedule ? 'Saving…' : 'Save Schedule'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    statusValue: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 1,
    },
    hoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    hoursText: {
        fontSize: 12,
        color: '#6B7280',
    },
    scheduleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        alignSelf: 'flex-start',
        backgroundColor: '#F0FDFA',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    scheduleBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0D9488',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 20,
        lineHeight: 18,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    timeField: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    timeInput: {
        height: 48,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        backgroundColor: '#F9FAFB',
    },
    timeSeparator: {
        marginTop: 20,
    },
    timezoneNote: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 20,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0D9488',
        borderRadius: 14,
        paddingVertical: 14,
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
