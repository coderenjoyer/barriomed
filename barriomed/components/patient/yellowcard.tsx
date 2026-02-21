import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
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
