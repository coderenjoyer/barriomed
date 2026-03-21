import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueueCommander } from './quequecaller';
import { QueueHistory } from './queuehistory';
import { InventoryMaster } from './medicine_stocks/inventory';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';

const Stack = createNativeStackNavigator();

export function StaffNavigator({ onLogout }: { onLogout: () => void }) {
    const { userProfile, session } = useAuth();

    const firstName = userProfile?.first_name ?? session?.user?.user_metadata?.first_name ?? '';
    const lastName  = userProfile?.last_name  ?? session?.user?.user_metadata?.last_name  ?? '';
    const staffName = [firstName, lastName].filter(Boolean).join(' ') || 'Health Staff';

    return (
        <Stack.Navigator
            initialRouteName="Queue"
            screenOptions={{
                headerStyle: { backgroundColor: '#0F766E' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
                headerRight: () => (
                    <TouchableOpacity onPress={onLogout} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="log-out" size={20} color="white" />
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Logout</Text>
                    </TouchableOpacity>
                ),
            }}
        >
            <Stack.Screen
                name="Queue"
                component={QueueCommander}
                options={{
                    headerTitle: () => (
                        <View>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Queue Management</Text>
                            <Text style={{ color: '#99F6E4', fontSize: 12 }}>{staffName}</Text>
                        </View>
                    ),
                }}
            />
            <Stack.Screen
                name="Inventory"
                component={InventoryMaster}
                options={{ title: 'Medicine Stocks' }}
            />
            <Stack.Screen
                name="QueueHistory"
                component={QueueHistory}
                options={{ title: 'Queue History' }}
            />
        </Stack.Navigator>
    );
}
