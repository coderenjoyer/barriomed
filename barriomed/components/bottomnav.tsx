import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavigationProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function BottomNavigation({
    activeTab,
    onTabChange,
}: BottomNavigationProps) {
    const insets = useSafeAreaInsets();

    const tabs = [
        {
            id: 'home',
            icon: 'home',
            Lib: Feather,
            label: 'Home',
        },
        {
            id: 'queue',
            icon: 'calendar',
            Lib: Feather,
            label: 'Queue',
        },
        {
            id: 'chat',
            icon: 'message-circle',
            Lib: Feather,
            label: 'Chat',
        },
        {
            id: 'botika',
            icon: 'pill',
            Lib: MaterialCommunityIcons,
            label: 'Botika',
        },
        {
            id: 'records',
            icon: 'users',
            Lib: Feather,
            label: 'Records',
        },
    ];

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.content}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const IconLib = tab.Lib;

                    return (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => onTabChange(tab.id)}
                            style={styles.tabButton}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                ]}
                            >
                                <IconLib
                                    name={tab.icon as any}
                                    size={22}
                                    color={isActive ? '#0D9488' : '#9CA3AF'}
                                    style={isActive && tab.id === 'home' ? styles.filledIcon : undefined}
                                />
                            </View>

                            <Text
                                style={[
                                    styles.label,
                                    { color: isActive ? '#0D9488' : '#9CA3AF' }
                                ]}
                            >
                                {tab.label}
                            </Text>

                            {isActive && (
                                <View style={styles.activeIndicator} />
                            )}

                            {tab.id === 'chat' && !isActive && (
                                <View style={styles.notificationDot} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.03,
        shadowRadius: 20,
        elevation: 5,
        zIndex: 40,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 64,
        paddingHorizontal: 8,
    },
    tabButton: {
        position: 'relative',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: '100%',
    },
    iconContainer: {
        marginBottom: 4,
    },
    filledIcon: {
        // Feather doesn't fully support fill, normally we'd switch icon sets or use a boolean
        // But preventing color fill issues.
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
    },
    activeIndicator: {
        position: 'absolute',
        top: 0,
        width: 32,
        height: 3,
        backgroundColor: '#0D9488',
        borderBottomLeftRadius: 999,
        borderBottomRightRadius: 999,
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        backgroundColor: '#0D9488',
        borderRadius: 4,
    },
});
