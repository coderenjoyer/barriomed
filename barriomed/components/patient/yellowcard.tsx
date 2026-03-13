import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, TextInput, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface FamilyMember {
    id: string;
    name: string;
    relation: string;
    avatar?: string;
    pendingCount: number;
    stats: {
        age: string;
        weight: string;
        height: string;
        lastVisit: string;
        bloodType?: string;
        bmi?: string;
    };
}

interface FamilyMemberCardProps {
    member: FamilyMember;
    isSelected: boolean;
    onClick: () => void;
    index: number;
}

export function FamilyMemberCard({
    member,
    isSelected,
    onClick,
    index,
}: FamilyMemberCardProps) {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const delay = index * 100;

        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
                delay,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
                delay,
            }),
        ]).start();
    }, [index]);

    return (
        <Animated.View
            style={{
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
            }}
        >
            <TouchableOpacity
                onPress={onClick}
                activeOpacity={0.8}
                style={styles.container}
            >
                <View
                    style={[
                        styles.avatarContainer,
                        isSelected ? styles.selectedAvatar : styles.defaultAvatar,
                    ]}
                >
                    {member.avatar ? (
                        <Image
                            source={{ uri: member.avatar }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <View style={styles.placeholderAvatar}>
                            <Feather name="user" size={32} color="#9CA3AF" />
                        </View>
                    )}

                    {/* Pending Badge */}
                    {member.pendingCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {member.pendingCount}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <Text
                        style={[
                            styles.relationText,
                            isSelected ? styles.selectedRelation : styles.defaultRelation,
                        ]}
                    >
                        {member.relation}
                    </Text>
                    <Text style={styles.nameText}>{member.name}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    defaultAvatar: {
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    selectedAvatar: {
        borderColor: '#0D9488', // teal-600
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        transform: [{ scale: 1.05 }],
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    placeholderAvatar: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6', // gray-100
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F59E0B', // amber-500
        borderWidth: 2,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
    },
    infoContainer: {
        alignItems: 'center',
    },
    relationText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    defaultRelation: {
        color: '#1F2937', // gray-800
    },
    selectedRelation: {
        color: '#0F766E', // teal-700
    },
    nameText: {
        fontSize: 12,
        color: '#6B7280', // gray-500
    },
});

export interface YellowCardDetailsProps {
    member: FamilyMember;
    isOwnRecord: boolean;
    onUpdate: (updatedMember: FamilyMember) => void;
}

export function YellowCardDetails({ member, isOwnRecord, onUpdate }: YellowCardDetailsProps) {
    const [isEditing, setIsEditing] = useState(false);

    // Convert '55kg' and '165cm' to raw numbers for the input
    const [weight, setWeight] = useState(member.stats.weight.replace(/[^0-9.]/g, ''));
    const [height, setHeight] = useState(member.stats.height.replace(/[^0-9.]/g, ''));
    const [bloodType, setBloodType] = useState(member.stats.bloodType || '');
    const [showBloodTypeDropdown, setShowBloodTypeDropdown] = useState(false);

    useEffect(() => {
        setWeight(member.stats.weight.replace(/[^0-9.]/g, ''));
        setHeight(member.stats.height.replace(/[^0-9.]/g, ''));
        setBloodType(member.stats.bloodType || '');
        setIsEditing(false);
        setShowBloodTypeDropdown(false);
    }, [member]);

    const numericWeight = parseFloat(weight);
    const numericHeight = parseFloat(height);

    let bmi = '--';
    if (!isNaN(numericWeight) && !isNaN(numericHeight) && numericHeight > 0) {
        // Height is typically cm. We need standard calculation: weight(kg) / (height(m) * height(m))
        const heightMeters = numericHeight / 100;
        bmi = (numericWeight / (heightMeters * heightMeters)).toFixed(1);
    }

    // Default BMI rendering fallback if no edit is taking place
    let fallbackBmi = member.stats.bmi;
    if (!fallbackBmi) {
        const hMatch = member.stats.height.match(/[0-9.]+/);
        const wMatch = member.stats.weight.match(/[0-9.]+/);
        if (hMatch && wMatch) {
            const hNum = parseFloat(hMatch[0]);
            const wNum = parseFloat(wMatch[0]);
            if (hNum > 0) {
                const hMeters = hNum / 100;
                fallbackBmi = (wNum / (hMeters * hMeters)).toFixed(1);
            }
        }
    }

    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    const handleSave = () => {
        // Validation check can be placed here if heavily strict. For numeric, the keyboard constraint mostly helps.
        // Update the member record and persist
        onUpdate({
            ...member,
            stats: {
                ...member.stats,
                weight: weight ? `${weight}kg` : '',
                height: height ? `${height}cm` : '',
                bloodType,
                bmi
            }
        });
        setIsEditing(false);
        setShowBloodTypeDropdown(false);
    };

    return (
        <View style={detailsStyles.container}>
            <View style={detailsStyles.header}>
                <View>
                    <Text style={detailsStyles.nameText}>{member.name}</Text>
                    <Text style={detailsStyles.subText}>{member.relation} • {member.stats.age} yrs old</Text>
                </View>
                {isOwnRecord && !isEditing && (
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={detailsStyles.actionButton}>
                        <Feather name="edit-2" size={16} color="#4B5563" />
                    </TouchableOpacity>
                )}
                {isEditing && (
                    <View style={detailsStyles.headerActions}>
                        <TouchableOpacity onPress={() => {
                            // Cancel edit and reset stats
                            setIsEditing(false);
                            setWeight(member.stats.weight.replace(/[^0-9.]/g, ''));
                            setHeight(member.stats.height.replace(/[^0-9.]/g, ''));
                            setBloodType(member.stats.bloodType || '');
                            setShowBloodTypeDropdown(false);
                        }} style={[detailsStyles.actionButton, { marginRight: 8 }]}>
                            <Feather name="x" size={16} color="#EF4444" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} style={[detailsStyles.actionButton, { backgroundColor: '#D1FAE5' }]}>
                            <Feather name="check" size={16} color="#059669" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {isEditing ? (
                <View style={detailsStyles.editSection}>
                    <View style={detailsStyles.inputRow}>
                        <View style={detailsStyles.inputGroup}>
                            <Text style={detailsStyles.label}>Height (cm)</Text>
                            <TextInput
                                style={detailsStyles.input}
                                value={height}
                                onChangeText={setHeight}
                                keyboardType="numeric"
                                placeholder="165"
                            />
                        </View>
                        <View style={detailsStyles.inputGroup}>
                            <Text style={detailsStyles.label}>Weight (kg)</Text>
                            <TextInput
                                style={detailsStyles.input}
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="numeric"
                                placeholder="55"
                            />
                        </View>
                    </View>

                    <View style={detailsStyles.inputRow}>
                        <View style={[detailsStyles.inputGroup, { zIndex: 10 }]}>
                            <Text style={detailsStyles.label}>Blood Type</Text>
                            <TouchableOpacity
                                style={detailsStyles.dropdownTrigger}
                                onPress={() => setShowBloodTypeDropdown(!showBloodTypeDropdown)}
                            >
                                <Text style={detailsStyles.dropdownTriggerText}>
                                    {bloodType || 'Select'}
                                </Text>
                                <Feather name={showBloodTypeDropdown ? "chevron-up" : "chevron-down"} size={16} color="#6B7280" />
                            </TouchableOpacity>
                            {showBloodTypeDropdown && (
                                <View style={[detailsStyles.dropdownList, { maxHeight: 150 }]}>
                                    <ScrollView
                                        nestedScrollEnabled
                                        showsVerticalScrollIndicator={true}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        {bloodTypes.map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                style={detailsStyles.dropdownItem}
                                                onPress={() => {
                                                    setBloodType(type);
                                                    setShowBloodTypeDropdown(false);
                                                }}
                                            >
                                                <Text style={[
                                                    detailsStyles.dropdownItemText,
                                                    bloodType === type && detailsStyles.dropdownItemTextSelected
                                                ]}>
                                                    {type}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <View style={[detailsStyles.inputGroup, { zIndex: 1 }]}>
                            <Text style={detailsStyles.label}>BMI</Text>
                            <View style={[detailsStyles.input, detailsStyles.disabledInput]}>
                                <Text style={detailsStyles.disabledInputText}>{bmi}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            ) : (
                <View style={detailsStyles.statsGrid}>
                    <View style={detailsStyles.statCol}>
                        <Text style={detailsStyles.statLabel}>Height</Text>
                        <Text style={detailsStyles.statValue}>{member.stats.height || '--'}</Text>
                    </View>
                    <View style={detailsStyles.statDivider} />
                    <View style={detailsStyles.statCol}>
                        <Text style={detailsStyles.statLabel}>Weight</Text>
                        <Text style={detailsStyles.statValue}>{member.stats.weight || '--'}</Text>
                    </View>
                    <View style={detailsStyles.statDivider} />
                    <View style={detailsStyles.statCol}>
                        <Text style={detailsStyles.statLabel}>Blood</Text>
                        <Text style={detailsStyles.statValue}>{member.stats.bloodType || '--'}</Text>
                    </View>
                    <View style={detailsStyles.statDivider} />
                    <View style={detailsStyles.statCol}>
                        <Text style={detailsStyles.statLabel}>BMI</Text>
                        <Text style={detailsStyles.statValue}>{member.stats.bmi || fallbackBmi || '--'}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const detailsStyles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    nameText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    subText: {
        fontSize: 12,
        color: '#6B7280',
    },
    actionButton: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    headerActions: {
        flexDirection: 'row',
    },
    editSection: {
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 16,
    },
    inputGroup: {
        flex: 1,
        position: 'relative',
    },
    label: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        fontWeight: '500',
    },
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        color: '#1F2937',
        backgroundColor: '#FFFFFF',
    },
    disabledInput: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
    },
    disabledInputText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: 'bold',
    },
    dropdownTrigger: {
        height: 40,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    dropdownTriggerText: {
        fontSize: 14,
        color: '#1F2937',
    },
    dropdownList: {

        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',  // 👈 important: clips the ScrollView to the rounded corners
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#374151',
    },
    dropdownItemTextSelected: {
        color: '#0D9488',
        fontWeight: 'bold',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    statCol: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#F3F4F6',
    },
});
