import React, { useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Modal,
    Pressable,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useNotifications } from '../../../lib/NotificationContext';
import { AppNotification, NotificationType } from '../../../lib/notificationService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

interface TypeConfig {
    icon: string;
    iconLib: 'feather' | 'fa5';
    color: string;
    bgColor: string;
    label: string;
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
    chat: {
        icon: 'message-circle',
        iconLib: 'feather',
        color: '#0D9488',
        bgColor: '#F0FDFA',
        label: 'Chat',
    },
    prescription: {
        icon: 'file-prescription',
        iconLib: 'fa5',
        color: '#8B5CF6',
        bgColor: '#F5F3FF',
        label: 'Prescription',
    },
    queue: {
        icon: 'calendar',
        iconLib: 'feather',
        color: '#F59E0B',
        bgColor: '#FFFBEB',
        label: 'Queue',
    },
    record: {
        icon: 'file-text',
        iconLib: 'feather',
        color: '#3B82F6',
        bgColor: '#EFF6FF',
        label: 'Records',
    },
};

// ─── Notification Item ────────────────────────────────────────────────────────

interface NotificationItemProps {
    item: AppNotification;
    onPress: (item: AppNotification) => void;
    onDelete: (id: string) => void;
}

function NotificationItem({ item, onPress, onDelete }: NotificationItemProps) {
    const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.chat;

    return (
        <TouchableOpacity
            style={[styles.item, !item.is_read && styles.itemUnread]}
            onPress={() => onPress(item)}
            activeOpacity={0.75}
        >
            {/* Left: icon badge */}
            <View style={[styles.iconWrap, { backgroundColor: cfg.bgColor }]}>
                {cfg.iconLib === 'feather' ? (
                    <Feather name={cfg.icon as any} size={18} color={cfg.color} />
                ) : (
                    <FontAwesome5 name={cfg.icon as any} size={16} color={cfg.color} />
                )}
            </View>

            {/* Center: text */}
            <View style={styles.itemBody}>
                <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {!item.is_read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.itemMessage} numberOfLines={2}>
                    {item.message}
                </Text>
                <View style={styles.itemMeta}>
                    <View style={[styles.typePill, { backgroundColor: cfg.bgColor }]}>
                        <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.itemTime}>{formatDateTime(item.created_at)}</Text>
                </View>
            </View>

            {/* Right: delete */}
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDelete(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Feather name="x" size={14} color="#D1D5DB" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface NotificationsPanelProps {
    visible: boolean;
    onClose: () => void;
    onNavigate: (type: NotificationType, relatedId: string | null) => void;
}

export function NotificationsPanel({ visible, onClose, onNavigate }: NotificationsPanelProps) {
    const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
        useNotifications();

    const handlePress = useCallback(
        async (item: AppNotification) => {
            if (!item.is_read) {
                await markAsRead(item.id);
            }
            onClose();
            onNavigate(item.type, item.related_id);
        },
        [markAsRead, onClose, onNavigate],
    );

    const renderEmpty = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconRing}>
                <Feather name="bell-off" size={28} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose} />

            <View style={styles.sheet}>
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.sheetHeader}>
                    <View>
                        <Text style={styles.sheetTitle}>Notifications</Text>
                        {unreadCount > 0 && (
                            <Text style={styles.sheetSubtitle}>
                                {unreadCount} unread
                            </Text>
                        )}
                    </View>
                    <View style={styles.headerActions}>
                        {unreadCount > 0 && (
                            <TouchableOpacity
                                style={styles.markAllBtn}
                                onPress={markAllAsRead}
                            >
                                <Feather name="check-circle" size={14} color="#0D9488" />
                                <Text style={styles.markAllText}>Mark all read</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Feather name="x" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* List */}
                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="small" color="#0D9488" />
                        <Text style={styles.loadingText}>Loading…</Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <NotificationItem
                                item={item}
                                onPress={handlePress}
                                onDelete={deleteNotification}
                            />
                        )}
                        ListEmptyComponent={renderEmpty}
                        contentContainerStyle={
                            notifications.length === 0
                                ? styles.listEmptyContent
                                : styles.listContent
                        }
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '82%',
        paddingBottom: 32,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    markAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: '#F0FDFA',
        borderRadius: 8,
    },
    markAllText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0D9488',
    },
    closeBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 24,
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 16,
    },
    listEmptyContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 40,
    },
    loadingWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 10,
    },
    loadingText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    // Item
    item: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    itemUnread: {
        backgroundColor: '#FAFFFE',
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    itemBody: {
        flex: 1,
        gap: 4,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0D9488',
        flexShrink: 0,
    },
    itemMessage: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    typePill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    typePillText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    itemTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    deleteBtn: {
        padding: 4,
        marginTop: 2,
        flexShrink: 0,
    },
    // Empty state
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 56,
        gap: 12,
    },
    emptyIconRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#9CA3AF',
    },
});
