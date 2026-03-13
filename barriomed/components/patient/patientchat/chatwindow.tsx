import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, TextInput, Image, ScrollView, Platform, KeyboardAvoidingView } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Message, MessageBubble } from './messagewindow'

interface ChatWindowProps {
    recipientName: string
    recipientAvatar?: string
    recipientStatus?: 'online' | 'offline'
    messages: Message[]
    onSendMessage: (text: string) => void
    onBack?: () => void
}

export function ChatWindow({
    recipientName,
    recipientAvatar,
    recipientStatus = 'offline',
    messages,
    onSendMessage,
    onBack,
}: ChatWindowProps) {
    const [inputText, setInputText] = useState('')
    const scrollViewRef = useRef<ScrollView>(null)

    const scrollToBottom = () => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
    }

    useEffect(() => {
        setTimeout(scrollToBottom, 50)
    }, [messages])

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText)
            setInputText('')
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-gray-50/50"
        >
            {/* Header */}
            <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between shadow-sm z-10">
                <View className="flex-row items-center gap-3">
                    {onBack && (
                        <TouchableOpacity
                            onPress={onBack}
                            className="p-2 -ml-2 rounded-full md:hidden"
                        >
                            <Feather name="arrow-left" size={20} color="#4B5563" />
                        </TouchableOpacity>
                    )}
                    <View className="relative">
                        <View className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 items-center justify-center">
                            {recipientAvatar ? (
                                <Image
                                    source={{ uri: recipientAvatar }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="w-full h-full bg-teal-100 items-center justify-center">
                                    <Text className="text-teal-600 font-bold text-lg">
                                        {recipientName.charAt(0)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        {recipientStatus === 'online' && (
                            <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                    </View>
                    <View className="justify-center">
                        <Text className="font-bold text-gray-900 leading-tight">
                            {recipientName}
                        </Text>
                        <Text className="text-xs text-green-600 font-medium mt-0.5">
                            {recipientStatus === 'online' ? 'Active now' : 'Offline'}
                        </Text>
                    </View>
                </View>

                <View className="flex-row items-center gap-1">
                    <TouchableOpacity className="p-2 rounded-full">
                        <Feather name="phone" size={20} color="#0D9488" />
                    </TouchableOpacity>
                    <TouchableOpacity className="p-2 rounded-full">
                        <Feather name="video" size={20} color="#0D9488" />
                    </TouchableOpacity>
                    <TouchableOpacity className="p-2 rounded-full">
                        <Feather name="more-vertical" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Messages Area */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 bg-gray-50"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={scrollToBottom}
            >
                <View className="p-4 space-y-2">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                </View>
            </ScrollView>

            {/* Input Area */}
            <View className="bg-white p-3 border-t border-gray-100">
                <View className="flex-row items-center gap-2 bg-gray-50 rounded-3xl px-4 py-2 border border-gray-200">
                    <TouchableOpacity className="p-1">
                        <Feather name="paperclip" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TextInput
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 text-sm text-gray-900 ml-1 py-1"
                        style={{ outline: 'none' } as any}
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                        className={`p-2 rounded-full shadow-sm bg-teal-600 ${!inputText.trim() ? 'opacity-50' : ''}`}
                    >
                        <Feather name="send" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    )
}
