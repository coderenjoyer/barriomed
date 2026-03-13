import React from 'react'
import { View, Text, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native'
import { Feather } from '@expo/vector-icons'

export interface ChatPreview {
    id: string
    name: string
    avatar?: string
    lastMessage: string
    time: string
    unreadCount: number
    status: 'online' | 'offline'
}

interface ChatListProps {
    chats: ChatPreview[]
    selectedChatId: string | null
    onSelectChat: (id: string) => void
}

export function ChatList({
    chats,
    selectedChatId,
    onSelectChat,
}: ChatListProps) {
    return (
        <View className="flex-1 bg-white border-r border-gray-100">
            {/* Header */}
            <View className="p-4 border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-2xl font-bold text-gray-900">Messages</Text>
                    <TouchableOpacity className="p-2 bg-teal-50 rounded-full">
                        <Feather name="edit" size={20} color="#0D9488" />
                    </TouchableOpacity>
                </View>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3">
                    <Feather name="search" size={16} color="#9CA3AF" />
                    <TextInput
                        placeholder="Search messages..."
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 ml-2 text-sm text-gray-900"
                        style={{ outline: 'none' } as any}
                    />
                </View>
            </View>

            {/* List */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {chats.map((chat) => (
                    <TouchableOpacity
                        key={chat.id}
                        onPress={() => onSelectChat(chat.id)}
                        className={`w-full p-4 flex-row items-center gap-3 border-b border-gray-50 ${selectedChatId === chat.id ? 'bg-teal-50/50' : ''}`}
                        activeOpacity={0.7}
                    >
                        <View className="relative flex-shrink-0">
                            <View className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-100 items-center justify-center">
                                {chat.avatar ? (
                                    <Image
                                        source={{ uri: chat.avatar }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View className="w-full h-full bg-teal-100 items-center justify-center">
                                        <Text className="text-teal-600 font-bold text-lg">
                                            {chat.name.charAt(0)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {chat.status === 'online' && (
                                <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                            )}
                        </View>

                        <View className="flex-1 text-left min-w-0">
                            <View className="flex-row justify-between items-baseline mb-1">
                                <Text
                                    numberOfLines={1}
                                    className={`font-bold flex-1 mr-2 ${chat.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}
                                >
                                    {chat.name}
                                </Text>
                                <Text
                                    className={`text-xs ${chat.unreadCount > 0 ? 'text-teal-600 font-bold' : 'text-gray-400'}`}
                                >
                                    {chat.time}
                                </Text>
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text
                                    numberOfLines={1}
                                    className={`text-sm flex-1 pr-2 ${chat.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                                >
                                    {chat.lastMessage}
                                </Text>
                                {chat.unreadCount > 0 && (
                                    <View className="w-5 h-5 bg-teal-600 items-center justify-center rounded-full flex-shrink-0">
                                        <Text className="text-white text-[10px] font-bold">
                                            {chat.unreadCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    )
}
