import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage, chatService, Conversation } from '../../../lib/chatService';

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
    const time = (() => {
        try {
            return new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    })();

    return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
            <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
                    {msg.content}
                </Text>
                <View style={styles.bubbleMeta}>
                    <Text style={[styles.bubbleTime, isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>
                        {time}
                    </Text>
                    {isOwn && (
                        msg.is_read
                            ? <Ionicons name="checkmark-done" size={13} color="#CCFBF1" />
                            : <Ionicons name="checkmark" size={13} color="#CCFBF1" />
                    )}
                </View>
            </View>
        </View>
    );
}

// ─── Doctor Chat Window (per conversation) ───────────────────────────────────

interface DoctorChatWindowProps {
    conversation: Conversation;
    doctorId: string;
    patientName: string;
    onBack: () => void;
}

export function DoctorChatWindow({ conversation, doctorId, patientName, onBack }: DoctorChatWindowProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<ScrollView>(null);

    const scroll = () => scrollRef.current?.scrollToEnd({ animated: true });

    // Tracks optimistic IDs that are in-flight so the realtime subscription
    // can ignore the same INSERT event (avoiding the duplicate key warning).
    const pendingOptimisticIds = useRef<Set<string>>(new Set());

    // Load initial messages
    useEffect(() => {
        let mounted = true;
        setIsLoading(true);
        chatService.getMessages(conversation.id).then((msgs) => {
            if (mounted) {
                setMessages(msgs);
                setIsLoading(false);
                setTimeout(scroll, 50);
            }
        });

        // Mark received messages as read
        chatService.markMessagesRead(conversation.id, doctorId);

        // Subscribe to new messages
        const unsub = chatService.subscribeToMessages(conversation.id, (msg) => {
            if (!mounted) return;

            setMessages((prev) => {
                // 1. Skip if this real message is already visible (exact ID match)
                if (prev.find((m) => m.id === msg.id)) return prev;

                // 2. If this INSERT is for a message we sent optimistically,
                //    replace the optimistic placeholder with the confirmed row.
                const optimisticIdx = prev.findIndex(
                    (m) => m.id.startsWith('opt-') && m.sender_id === msg.sender_id && m.content === msg.content
                );
                if (optimisticIdx !== -1) {
                    const next = [...prev];
                    next[optimisticIdx] = msg;
                    return next;
                }

                // 3. Otherwise it's a message from the other party — append it.
                return [...prev, msg];
            });

            if (msg.receiver_id === doctorId) {
                chatService.markMessagesRead(conversation.id, doctorId);
            }
            setTimeout(scroll, 50);
        });

        return () => {
            mounted = false;
            unsub();
        };
    }, [conversation.id, doctorId]);

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || isSending) return;
        setInputText('');
        setIsSending(true);

        const optimisticId = `opt-${Date.now()}`;

        // Optimistic message
        const optimistic: ChatMessage = {
            id: optimisticId,
            conversation_id: conversation.id,
            sender_id: doctorId,
            receiver_id: conversation.patient_id,
            content: text,
            timestamp: new Date().toISOString(),
            is_read: false,
        };
        setMessages((prev) => [...prev, optimistic]);
        setTimeout(scroll, 50);

        const result = await chatService.sendMessage({
            conversationId: conversation.id,
            senderId: doctorId,
            receiverId: conversation.patient_id,
            content: text,
        });

        setIsSending(false);
        if (result.success && result.data) {
            // Replace the optimistic entry with the confirmed row from DB.
            // The realtime subscription will also fire for this INSERT; the
            // subscribeToMessages handler above will find the optimistic entry
            // by content match and replace it — whichever arrives first wins,
            // and the other will find the real ID already present and no-op.
            setMessages((prev) =>
                prev.map((m) => (m.id === optimisticId ? result.data! : m)),
            );
        } else {
            // Remove the failed optimistic message
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        }
    };


    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Feather name="arrow-left" size={20} color="#4B5563" />
                </TouchableOpacity>
                <View style={styles.headerAvatar}>
                    <Text style={styles.headerAvatarText}>{patientName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{patientName}</Text>
                    <Text style={styles.headerSub}>Patient</Text>
                </View>
            </View>

            {/* Messages */}
            {isLoading ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator color="#0D9488" />
                </View>
            ) : (
                <ScrollView
                    ref={scrollRef}
                    style={styles.messageScroll}
                    contentContainerStyle={styles.messageContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={scroll}
                >
                    {messages.length === 0 && (
                        <View style={styles.emptyChat}>
                            <Feather name="message-circle" size={36} color="#D1D5DB" />
                            <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
                        </View>
                    )}
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === doctorId} />
                    ))}
                </ScrollView>
            )}

            {/* Input */}
            <View style={styles.inputBar}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message…"
                        placeholderTextColor="#9CA3AF"
                        style={styles.input}
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                        multiline
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!inputText.trim() || isSending}
                        style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
                        activeOpacity={0.8}
                    >
                        {isSending
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Feather name="send" size={16} color="#fff" />
                        }
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#F9FAFB' },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    backBtn: {
        padding: 6,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    headerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0D9488',
    },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
    headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
    // Messages
    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    messageScroll: { flex: 1 },
    messageContent: { padding: 16, gap: 6, flexGrow: 1 },
    emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyChatText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
    // Bubbles
    bubbleRow: { flexDirection: 'row', marginBottom: 4 },
    bubbleRowOwn: { justifyContent: 'flex-end' },
    bubbleRowOther: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    bubbleOwn: { backgroundColor: '#0D9488', borderBottomRightRadius: 4 },
    bubbleOther: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    bubbleTextOwn: { color: '#FFFFFF' },
    bubbleTextOther: { color: '#111827' },
    bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 2 },
    bubbleTime: { fontSize: 10 },
    bubbleTimeOwn: { color: '#CCFBF1' },
    bubbleTimeOther: { color: '#9CA3AF' },
    // Input
    inputBar: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
        maxHeight: 100,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
});
