import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QueueCommander } from './quequecaller';
import { QueueHistory } from './queuehistory';
import { InventoryMaster } from './medicine_stocks/inventory';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../backend/lib/AuthContext';

const Stack = createNativeStackNavigator();

// ---------------------------------------------------------------------------
// Compact custom header — avoids the large default native stack header height
// ---------------------------------------------------------------------------
function StaffHeader({
    title,
    subtitle,
    onLogout,
}: {
    title: string;
    subtitle?: string;
    onLogout: () => void;
}) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{
                backgroundColor: '#0D9488',
                paddingTop: insets.top,
                height: insets.top + 56, // compact: 56px content area
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                justifyContent: 'space-between',
            }}
        >
            {/* Title block */}
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, lineHeight: 20 }}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text style={{ color: '#99F6E4', fontSize: 12, lineHeight: 16 }}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>

            {/* Logout button */}
            <TouchableOpacity
                onPress={onLogout}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                }}
            >
                <Feather name="log-out" size={16} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

// ---------------------------------------------------------------------------

export function StaffNavigator({ onLogout }: { onLogout: () => void }) {
    const { userProfile, session } = useAuth();

    const firstName = userProfile?.first_name ?? session?.user?.user_metadata?.first_name ?? '';
    const lastName = userProfile?.last_name ?? session?.user?.user_metadata?.last_name ?? '';
    const staffName = [firstName, lastName].filter(Boolean).join(' ') || 'Health Staff';

    return (
        <Stack.Navigator
            initialRouteName="Queue"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen
                name="Queue"
                component={QueueCommander}
                options={{
                    header: () => (
                        <StaffHeader
                            title={staffName}
                            subtitle="Queue Manager"
                            onLogout={onLogout}
                        />
                    ),
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="Inventory"
                component={InventoryMaster}
                options={{
                    header: () => (
                        <StaffHeader title="Medicine Stocks" onLogout={onLogout} />
                    ),
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="QueueHistory"
                component={QueueHistory}
                options={{
                    header: () => (
                        <StaffHeader title="Queue History" onLogout={onLogout} />
                    ),
                    headerShown: true,
                }}
            />
        </Stack.Navigator>
    );
}
