import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FloatingActionButtonProps {
    onPress?: () => void;
}

export function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
    const insets = useSafeAreaInsets();

    // Simple pulse animation
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    bottom: Math.max(insets.bottom, 16) + 64 + 16, // Bottom nav height + padding
                    transform: [{ scale: scaleAnim }]
                }
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                style={styles.button}
            >
                {/* Ripple Effect Background (Static for now) */}
                <View style={styles.rippleRing} />

                <FontAwesome5 name="ticket-alt" size={24} color="white" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 24,
        zIndex: 50,
    },
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0D9488', // Teal-600
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow for iOS
        shadowColor: '#0D9488',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        // Elevation for Android
        elevation: 8,
    },
    rippleRing: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    }
});
