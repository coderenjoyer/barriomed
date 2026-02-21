import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueueCommander } from './quequecaller';
import { InventoryMaster } from './medicine_stocks/inventory';
import { Feather } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();

export function StaffNavigator({ onLogout }: { onLogout: () => void }) {
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
                options={{ title: 'BarrioMed Staff - Queue' }}
            />
            <Stack.Screen
                name="Inventory"
                component={InventoryMaster}
                options={{ title: 'Medicine Stocks' }}
            />
            {/* Other staff screens can be added here, securely restricting access from other roles. */}
        </Stack.Navigator>
    );
}
