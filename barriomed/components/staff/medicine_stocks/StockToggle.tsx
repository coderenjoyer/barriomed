import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { StockStatus } from '../../../backend/lib/inventoryService';

interface StockToggleProps {
    status: StockStatus;
    onChange: (status: StockStatus) => void;
}

export function StockToggle({ status, onChange }: StockToggleProps) {
    // Cycles: AVAILABLE -> LOW -> OUT_OF_STOCK -> AVAILABLE
    const handlePress = () => {
        if (status === 'AVAILABLE') onChange('LOW');
        else if (status === 'LOW') onChange('OUT_OF_STOCK');
        else onChange('AVAILABLE');
    };

    const getStatusColor = () => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700';
            case 'LOW': return 'bg-amber-100 text-amber-700';
            case 'OUT_OF_STOCK': return 'bg-rose-100 text-rose-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <TouchableOpacity onPress={handlePress} className={`px-2 py-1 flex items-center justify-center rounded-md ${getStatusColor().split(' ')[0]}`}>
            <Text className={`text-xs font-semibold uppercase ${getStatusColor().split(' ')[1]}`}>
                {status === 'OUT_OF_STOCK' ? 'Out' : status === 'LOW' ? 'Low' : 'Available'}
            </Text>
        </TouchableOpacity>
    );
}
