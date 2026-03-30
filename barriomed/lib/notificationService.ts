import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Detect if running inside Expo Go (remote push is unsupported there from SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'chat' | 'prescription' | 'queue' | 'record';

export interface AppNotification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    is_read: boolean;
    related_id: string | null;
    created_at: string;
}

export interface CreateNotificationParams {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    relatedId?: string;
}

// ─── Local notification display config ───────────────────────────────────────

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// ─── Service ─────────────────────────────────────────────────────────────────

export const notificationService = {

    // ── Permission & Device Token ────────────────────────────────────────────

    /**
     * Request notification permissions and return the Expo push token.
     * Returns null if:
     *  - running in Expo Go (remote push unsupported since SDK 53)
     *  - permission denied
     *  - not a physical device
     *
     * Local notification channel + permissions are still set up regardless
     * so in-app / foreground local notifications always work.
     */
    async registerForPushNotifications(): Promise<string | null> {
        if (!Device.isDevice) {
            console.log('[notif] Skipping push registration — not a physical device.');
            return null;
        }

        // Android: always set up the notification channel (works in Expo Go)
        if (Platform.OS === 'android') {
            try {
                await Notifications.setNotificationChannelAsync('barriomed', {
                    name: 'BarrioMed Notifications',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#0D9488',
                    sound: 'default',
                });
            } catch (e) {
                console.log('[notif] Channel setup skipped:', e);
            }
        }

        // Request permission (works in Expo Go for local notifications)
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('[notif] Notification permission denied.');
                return null;
            }
        } catch (e) {
            console.log('[notif] Permission request failed:', e);
            return null;
        }

        // Remote push token — only available in a dev/standalone build
        if (isExpoGo) {
            console.log(
                '[notif] Expo Go detected — remote push tokens unavailable. ' +
                'Local & in-app notifications are active. ' +
                'Use a development build for full Android push support.',
            );
            return null;
        }

        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;
            const tokenData = await Notifications.getExpoPushTokenAsync(
                projectId ? { projectId } : undefined
            );
            return tokenData.data;
        } catch (err) {
            console.error('[notif] Failed to get remote push token:', err);
            return null;
        }
    },

    /**
     * Save the device push token to Supabase for the authenticated user.
     */
    async saveDeviceToken(userId: string, token: string): Promise<void> {
        const { error } = await supabase
            .from('device_push_tokens')
            .upsert(
                { user_id: userId, token, platform: Platform.OS, created_at: new Date().toISOString() },
                { onConflict: 'user_id,token' }
            );

        if (error) {
            console.error('[notificationService] saveDeviceToken error:', error);
        }
    },

    /**
     * Remove a specific device token (on logout).
     */
    async removeDeviceToken(userId: string, token: string): Promise<void> {
        await supabase
            .from('device_push_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('token', token);
    },

    // ── Notification CRUD ────────────────────────────────────────────────────

    /**
     * Fetch all notifications for a user, newest first.
     */
    async getNotifications(userId: string): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[notificationService] getNotifications error:', error);
            return [];
        }
        return (data ?? []) as AppNotification[];
    },

    /**
     * Get unread notification count for a user.
     */
    async getUnreadCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('[notificationService] getUnreadCount error:', error);
            return 0;
        }
        return count ?? 0;
    },

    /**
     * Create a new notification record and optionally trigger a local push.
     */
    async createNotification(params: CreateNotificationParams): Promise<AppNotification | null> {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: params.userId,
                title: params.title,
                message: params.message,
                type: params.type,
                related_id: params.relatedId ?? null,
                is_read: false,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('[notificationService] createNotification error:', error);
            return null;
        }
        return data as AppNotification;
    },

    /**
     * Mark a single notification as read.
     */
    async markAsRead(notificationId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('[notificationService] markAsRead error:', error);
        }
    },

    /**
     * Mark all notifications as read for a user.
     */
    async markAllAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('[notificationService] markAllAsRead error:', error);
        }
    },

    /**
     * Delete a notification.
     */
    async deleteNotification(notificationId: string): Promise<void> {
        await supabase.from('notifications').delete().eq('id', notificationId);
    },

    // ── Real-time ────────────────────────────────────────────────────────────

    /**
     * Subscribe to real-time notification inserts for a user.
     * Returns an unsubscribe function.
     */
    subscribeToNotifications(
        userId: string,
        onNew: (notification: AppNotification) => void,
    ): () => void {
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.new) {
                        const notif = payload.new as AppNotification;
                        onNew(notif);
                        // Trigger a local device notification
                        notificationService.scheduleLocalNotification(notif);
                    }
                },
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    },

    // ── Local Notifications ──────────────────────────────────────────────────

    /**
     * Schedule an immediate local notification (for foreground/background display).
     */
    async scheduleLocalNotification(notif: AppNotification): Promise<void> {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: notif.title,
                    body: notif.message,
                    data: {
                        notificationId: notif.id,
                        type: notif.type,
                        relatedId: notif.related_id,
                    },
                    sound: 'default',
                    badge: 1,
                },
                trigger: null, // Fire immediately
            });
        } catch (err) {
            console.error('[notificationService] scheduleLocalNotification error:', err);
        }
    },

    // ── Convenience creators (called after relevant events) ──────────────────

    async notifyChatMessage(params: {
        recipientId: string;
        senderName: string;
        messagePreview: string;
        conversationId: string;
    }): Promise<void> {
        await notificationService.createNotification({
            userId: params.recipientId,
            title: `New message from ${params.senderName}`,
            message: params.messagePreview.length > 80
                ? params.messagePreview.slice(0, 80) + '…'
                : params.messagePreview,
            type: 'chat',
            relatedId: params.conversationId,
        });
    },

    async notifyNewPrescription(params: {
        patientId: string;
        doctorName: string;
        prescriptionId: string;
    }): Promise<void> {
        await notificationService.createNotification({
            userId: params.patientId,
            title: 'New Prescription',
            message: `Dr. ${params.doctorName} has issued you a new prescription.`,
            type: 'prescription',
            relatedId: params.prescriptionId,
        });
    },

    async notifyQueueUpdate(params: {
        patientId: string;
        title: string;
        message: string;
        queueId?: string;
    }): Promise<void> {
        await notificationService.createNotification({
            userId: params.patientId,
            title: params.title,
            message: params.message,
            type: 'queue',
            relatedId: params.queueId,
        });
    },

    async notifyRecordUpdate(params: {
        patientId: string;
        doctorName: string;
        recordId: string;
    }): Promise<void> {
        await notificationService.createNotification({
            userId: params.patientId,
            title: 'Medical Record Updated',
            message: `Dr. ${params.doctorName} has updated your medical record.`,
            type: 'record',
            relatedId: params.recordId,
        });
    },
};
