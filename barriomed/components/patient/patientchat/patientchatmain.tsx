import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatList, ChatPreview } from './chatlist';
import { ChatWindow } from './chatwindow';
import { Message } from './messagewindow';

const MOCK_CHATS: ChatPreview[] = [
    {
        id: '1',
        name: 'Dr. Sarah Smith',
        lastMessage: 'Your test results are ready.',
        time: '10:30 AM',
        unreadCount: 2,
        status: 'online',
    },
    {
        id: '2',
        name: 'Barrio Med Support',
        lastMessage: 'Thank you for contacting us.',
        time: 'Yesterday',
        unreadCount: 0,
        status: 'offline',
    }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
    '1': [
        { id: 'm1', senderId: '1', text: 'Hello, how are you feeling today?', timestamp: '10:00 AM', status: 'read', isOwn: false },
        { id: 'm2', senderId: 'user', text: 'Much better, thanks! Are my test results ready?', timestamp: '10:15 AM', status: 'read', isOwn: true },
        { id: 'm3', senderId: '1', text: 'Yes! Your test results are ready.', timestamp: '10:30 AM', status: 'delivered', isOwn: false },
    ],
    '2': [
        { id: 'm1', senderId: '2', text: 'Thank you for contacting us.', timestamp: 'Yesterday', status: 'read', isOwn: false },
    ]
};

export function PatientChatMain() {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messagesState, setMessagesState] = useState(MOCK_MESSAGES);
    const [chats, setChats] = useState(MOCK_CHATS);

    const handleSendMessage = (text: string) => {
        if (!selectedChatId) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            senderId: 'user',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
            isOwn: true,
        };

        setMessagesState(prev => ({
            ...prev,
            [selectedChatId]: [...(prev[selectedChatId] || []), newMessage]
        }));
        
        // Update last message in chat list
        setChats(prev => prev.map(c => 
            c.id === selectedChatId 
                ? { ...c, lastMessage: text, time: newMessage.timestamp } 
                : c
        ));
    };

    const handleBack = () => {
        setSelectedChatId(null);
    };

    const handleSelectChat = (id: string) => {
        setSelectedChatId(id);
        // Clear unread count
        setChats(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    };

    const selectedChat = chats.find(c => c.id === selectedChatId);

    // BottomNavigation height is roughly 64 + bottom inset
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, 16) + 64;

    return (
        <View style={[styles.container, { paddingBottom: bottomPadding }]}>
            {selectedChatId && selectedChat ? (
                <ChatWindow
                    recipientName={selectedChat.name}
                    recipientAvatar={selectedChat.avatar}
                    recipientStatus={selectedChat.status}
                    messages={messagesState[selectedChatId] || []}
                    onSendMessage={handleSendMessage}
                    onBack={handleBack}
                />
            ) : (
                <ChatList
                    chats={chats}
                    selectedChatId={selectedChatId}
                    onSelectChat={handleSelectChat}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
