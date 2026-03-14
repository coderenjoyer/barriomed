import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
    Modal,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
    calculateBMI,
    saveMedicalInfo,
    pickProfileImage,
    type PatientMedicalInfo,
    type PatientMedicalFormData,
    type BloodType,
} from '../../lib/patientMedicalService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatientSettingsFormProps {
    mode: 'add' | 'edit';
    userId: string;
    existingRecord?: PatientMedicalInfo | null;
    visible: boolean;
    onClose: () => void;
    onSaved: (record: PatientMedicalInfo) => void;
}

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatientSettingsForm({
    mode,
    userId,
    existingRecord,
    visible,
    onClose,
    onSaved,
}: PatientSettingsFormProps) {
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [bloodType, setBloodType] = useState<BloodType | ''>('');
    const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
    const [existingPictureUrl, setExistingPictureUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill form when editing
    useEffect(() => {
        if (visible) {
            if (mode === 'edit' && existingRecord) {
                setHeight(String(existingRecord.height));
                setWeight(String(existingRecord.weight));
                setBloodType(existingRecord.blood_type);
                setExistingPictureUrl(existingRecord.profile_picture_url);
                setProfilePictureUri(null);
            } else {
                setHeight('');
                setWeight('');
                setBloodType('');
                setExistingPictureUrl(null);
                setProfilePictureUri(null);
            }
            setError('');
        }
    }, [visible, mode, existingRecord]);

    // Real-time BMI calculation
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    const bmiValue = calculateBMI(
        isNaN(heightNum) ? 0 : heightNum,
        isNaN(weightNum) ? 0 : weightNum,
    );

    const getBmiCategory = (bmi: string): { label: string; color: string } => {
        const val = parseFloat(bmi);
        if (isNaN(val)) return { label: '', color: '#6B7280' };
        if (val < 18.5) return { label: 'Underweight', color: '#F59E0B' };
        if (val < 25) return { label: 'Normal', color: '#10B981' };
        if (val < 30) return { label: 'Overweight', color: '#F59E0B' };
        return { label: 'Obese', color: '#EF4444' };
    };

    const bmiCategory = getBmiCategory(bmiValue);

    // Handle image pick
    const handlePickImage = async () => {
        const uri = await pickProfileImage();
        if (uri) {
            setProfilePictureUri(uri);
        }
    };

    // Get the display image URI (local pick takes precedence over existing)
    const displayImageUri = profilePictureUri ?? existingPictureUrl;

    // Validate & save
    const handleSave = async () => {
        setError('');

        if (!height.trim() || isNaN(parseFloat(height)) || parseFloat(height) <= 0) {
            setError('Please enter a valid height (cm).');
            return;
        }
        if (!weight.trim() || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
            setError('Please enter a valid weight (kg).');
            return;
        }
        if (!bloodType) {
            setError('Please select a blood type.');
            return;
        }

        setIsSaving(true);

        const formData: PatientMedicalFormData = {
            height,
            weight,
            blood_type: bloodType,
            profile_picture_uri: profilePictureUri,
        };

        const result = await saveMedicalInfo(userId, formData, existingRecord);

        setIsSaving(false);

        if (result.success && result.data) {
            onSaved(result.data);
            onClose();
        } else {
            setError(result.error || 'Failed to save. Please try again.');
        }
    };

    const isFormValid =
        height.trim().length > 0 &&
        !isNaN(parseFloat(height)) &&
        parseFloat(height) > 0 &&
        weight.trim().length > 0 &&
        !isNaN(parseFloat(weight)) &&
        parseFloat(weight) > 0 &&
        bloodType !== '';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Feather name="x" size={22} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {mode === 'add' ? 'Add Patient Info' : 'Edit Patient Info'}
                    </Text>
                    <View style={{ width: 38 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Profile Picture */}
                    <View style={styles.profileSection}>
                        <TouchableOpacity onPress={handlePickImage} style={styles.profilePicContainer}>
                            {displayImageUri ? (
                                <Image 
                                    source={{ uri: displayImageUri }} 
                                    style={styles.profilePic} 
                                />
                            ) : (
                                <View style={styles.profilePicPlaceholder}>
                                    <Feather name="camera" size={32} color="#9CA3AF" />
                                </View>
                            )}
                            <View style={styles.cameraOverlay}>
                                <Feather name="camera" size={14} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.profilePicLabel}>
                            {displayImageUri ? 'Tap to change photo' : 'Add profile photo'}
                        </Text>
                    </View>

                    {/* Error Banner */}
                    {error ? (
                        <View style={styles.errorBanner}>
                            <Feather name="alert-circle" size={16} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Height & Weight Row */}
                    <View style={styles.rowGroup}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Height</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    value={height}
                                    onChangeText={(t) => { setHeight(t); setError(''); }}
                                    placeholder="165"
                                    placeholderTextColor="#D1D5DB"
                                    keyboardType="numeric"
                                    style={styles.input}
                                />
                                <Text style={styles.unitLabel}>cm</Text>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    value={weight}
                                    onChangeText={(t) => { setWeight(t); setError(''); }}
                                    placeholder="55"
                                    placeholderTextColor="#D1D5DB"
                                    keyboardType="numeric"
                                    style={styles.input}
                                />
                                <Text style={styles.unitLabel}>kg</Text>
                            </View>
                        </View>
                    </View>

                    {/* BMI (read-only) */}
                    <View style={styles.bmiCard}>
                        <View style={styles.bmiHeader}>
                            <Text style={styles.inputLabel}>BMI</Text>
                            {bmiCategory.label ? (
                                <View style={[styles.bmiCategoryBadge, { backgroundColor: bmiCategory.color + '20' }]}>
                                    <Text style={[styles.bmiCategoryText, { color: bmiCategory.color }]}>
                                        {bmiCategory.label}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <View style={styles.bmiValueContainer}>
                            <Text style={[styles.bmiValue, bmiValue !== '--' ? { color: bmiCategory.color } : null]}>
                                {bmiValue}
                            </Text>
                            <Text style={styles.bmiUnit}>kg/m²</Text>
                        </View>
                        <Text style={styles.bmiHint}>Auto-calculated from height and weight</Text>
                    </View>

                    {/* Blood Type Selector */}
                    <View style={styles.inputGroupFull}>
                        <Text style={styles.inputLabel}>Blood Type</Text>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipScrollContent}
                        >
                            {BLOOD_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.chip,
                                        bloodType === type ? styles.chipSelected : null,
                                    ]}
                                    onPress={() => {
                                        setBloodType(type);
                                        setError('');
                                    }}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        bloodType === type ? styles.chipTextSelected : null,
                                    ]}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Unit Notice */}
                    <View style={styles.unitNotice}>
                        <Feather name="info" size={14} color="#9CA3AF" />
                        <Text style={styles.unitNoticeText}>
                            All measurements use the metric system (cm, kg).
                        </Text>
                    </View>
                </ScrollView>

                {/* Save Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!isFormValid || isSaving}
                        style={[
                            styles.saveButton,
                            (!isFormValid || isSaving) ? styles.saveButtonDisabled : null,
                        ]}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Feather name="check" size={18} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>
                                    {mode === 'add' ? 'Save Patient Info' : 'Update Patient Info'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 16 : 48,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 120,
    },

    // Profile Picture
    profileSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    profilePicContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 10,
    },
    profilePic: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    profilePicPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#F9FAFB',
    },
    profilePicLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },

    // Error
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: '#EF4444',
        fontWeight: '500',
    },

    // Inputs
    rowGroup: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    inputGroup: {
        flex: 1,
    },
    inputGroupFull: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingRight: 14,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        height: 48,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
    },
    unitLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
    },

    // BMI
    bmiCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    bmiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    bmiCategoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    bmiCategoryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    bmiValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginBottom: 6,
    },
    bmiValue: {
        fontSize: 36,
        fontWeight: '700',
        color: '#6B7280',
    },
    bmiUnit: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    bmiHint: {
        fontSize: 12,
        color: '#9CA3AF',
    },

    // Blood Type Chips
    chipScrollContent: {
        paddingRight: 24, // Extra space at end for scrolling
        gap: 10,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        minWidth: 64,
        alignItems: 'center',
    },
    chipSelected: {
        backgroundColor: '#F0FDFA',
        borderColor: '#0D9488',
    },
    chipText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    chipTextSelected: {
        color: '#0D9488',
    },

    // Unit Notice
    unitNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    unitNoticeText: {
        fontSize: 12,
        color: '#9CA3AF',
        flex: 1,
    },

    // Footer / Save Button
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingVertical: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#0D9488',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#E5E7EB',
        shadowOpacity: 0,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
