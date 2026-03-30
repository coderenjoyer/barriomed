import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import {
    notificationService,
    AppNotification,
} from './notificationService';

// ─── Context type ─────────────────────────────────────────────────────────────

interface NotificationContextValue {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    pushToken: string | null;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { session } = useAuth();
    const userId = session?.user?.id ?? null;

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [pushToken, setPushToken] = useState<string | null>(null);

    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    // ── Fetch notifications ────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const data = await notificationService.getNotifications(userId);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
        setIsLoading(false);
    }, [userId]);

    // ── Mark as read ─────────────────────────────────────────────────────
    const markAsRead = useCallback(async (id: string) => {
        await notificationService.markAsRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    // ── Mark all as read ──────────────────────────────────────────────────
    const markAllAsRead = useCallback(async () => {
        if (!userId) return;
        await notificationService.markAllAsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    }, [userId]);

    // ── Delete ────────────────────────────────────────────────────────────
    const deleteNotification = useCallback(async (id: string) => {
        const notif = notifications.find(n => n.id === id);
        await notificationService.deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (notif && !notif.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    }, [notifications]);

    // ── Register push & set up listeners on login ─────────────────────────
    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        // Initial fetch
        fetchNotifications();

        // Register for push notifications
        notificationService.registerForPushNotifications().then(async (token) => {
            if (token) {
                setPushToken(token);
                await notificationService.saveDeviceToken(userId, token);
            }
        });

        // Foreground notification listener
        notificationListener.current = Notifications.addNotificationReceivedListener(() => {
            fetchNotifications();
        });

        // Tap-on-notification response listener
        responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
            fetchNotifications();
        });

        // Real-time subscription for new notifications
        const unsubscribe = notificationService.subscribeToNotifications(userId, (newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            unsubscribe();
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [userId]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                isLoading,
                fetchNotifications,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                pushToken,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationContextValue {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return ctx;
}
