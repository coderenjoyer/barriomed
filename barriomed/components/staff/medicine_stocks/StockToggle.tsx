import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export type StockStatus = 'in_stock' | 'low' | 'out_of_stock';

interface StockToggleProps {
    status: StockStatus;
    onChange: (status: StockStatus) => void;
}

export function StockToggle({ status, onChange }: StockToggleProps) {
    // Simply cycles through for now
    const handlePress = () => {
        if (status === 'in_stock') onChange('low');
        else if (status === 'low') onChange('out_of_stock');
        else onChange('in_stock');
    };

    const getStatusColor = () => {
        switch (status) {
            case 'in_stock': return 'bg-emerald-100 text-emerald-700';
            case 'low': return 'bg-amber-100 text-amber-700';
            case 'out_of_stock': return 'bg-rose-100 text-rose-700';
        }
    };

    return (
        <TouchableOpacity onPress={handlePress} className={`px-2 py-1 rounded-md ${getStatusColor().split(' ')[0]}`}>
            <Text className={`text-xs font-semibold ${getStatusColor().split(' ')[1]}`}>
                {status === 'out_of_stock' ? 'Out' : status === 'low' ? 'Low' : 'Available'}
            </Text>
        </TouchableOpacity>
    );
}
