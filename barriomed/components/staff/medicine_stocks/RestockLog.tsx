import React from 'react';
import { View, Text } from 'react-native';

export function RestockLog() {
    return (
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-4">Restock Log</Text>
            <View className="py-8 items-center justify-center">
                <Text className="text-gray-400 text-sm">No recent restocks.</Text>
            </View>
        </View>
    );
}
