import React, { useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface Message {
    id: string
    senderId: string
    text: string
    timestamp: string
    status: 'sent' | 'delivered' | 'read'
    isOwn: boolean
}

interface MessageBubbleProps {
    message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(10)).current;
    const scale = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View
            style={{ opacity, transform: [{ translateY }, { scale }] }}
            className={`flex-row w-full mb-4 ${message.isOwn ? 'justify-end' : 'justify-start'}`}
        >
            <View
                className={`max-w-[75%] px-4 py-3 rounded-2xl relative ${message.isOwn ? 'bg-teal-600 rounded-tr-none' : 'bg-white border border-gray-100 rounded-tl-none shadow-sm'}`}
            >
                <Text className={`text-sm leading-5 ${message.isOwn ? 'text-white' : 'text-gray-800'}`}>
                    {message.text}
                </Text>
                <View className="flex-row items-center justify-end mt-1">
                    <Text className={`text-[10px] mr-1 ${message.isOwn ? 'text-teal-100' : 'text-gray-400'}`}>
                        {message.timestamp}
                    </Text>
                    {message.isOwn && (
                        message.status === 'read' ? (
                            <Ionicons name="checkmark-done" size={14} color="#CCFBF1" />
                        ) : (
                            <Ionicons name="checkmark" size={14} color="#CCFBF1" />
                        )
                    )}
                </View>
            </View>
        </Animated.View>
    )
}
