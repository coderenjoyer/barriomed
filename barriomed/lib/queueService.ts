import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServiceType } from '../components/patient/patient/selectservice';

export type QueueStatus = 'Pending' | 'Waiting' | 'Serving' | 'Completed' | 'No Show' | 'Cancelled';

// DB statuses that constitute an "active" queue the user must finish before getting a new one
const ACTIVE_DB_STATUSES = ['WAITING', 'SERVING', 'PENDING_SYNC'];

export interface QueueTicketData {
    id?: string;
    queueNumber: number;
    serviceType: ServiceType;
    status: QueueStatus | string;
    nowServing: number;
    peopleAhead: number;
    estWaitTime: string;
    patientName?: string;
}

export interface RecentQueuedPatient {
    ticketId: string;
    queueNumber: number;
    status: QueueStatus | string;
    createdAt: string;
    userId: string | null;
    patientName: string;
    patientFirstName: string;
    patientLastName: string;
}

const getStorageKey = (userId: string) => `@barriomed_queue_ticket_${userId}`;

// Statuses that mean the ticket is no longer active.
// A cached ticket with any of these statuses must NOT be restored as an active queue.
const TERMINAL_STATUSES: QueueStatus[] = ['Completed', 'Cancelled', 'No Show'];

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Maps DB ENUM to UI Status
const mapDbStatusToUi = (dbStatus: string): QueueStatus => {
    switch (dbStatus?.toUpperCase()) {
        case 'WAITING': return 'Waiting';
        case 'SERVING': return 'Serving';
        case 'COMPLETED': return 'Completed';
        case 'SKIPPED': return 'No Show';
        case 'CANCELLED': return 'Cancelled';
        case 'PENDING_SYNC': return 'Pending';
        default: return 'Pending';
    }
};

const mapUiStatusToDb = (uiStatus: string): string => {
    switch (uiStatus) {
        case 'Waiting': return 'WAITING';
        case 'Serving': return 'SERVING';
        case 'Completed': return 'COMPLETED';
        case 'No Show': return 'SKIPPED';
        case 'Cancelled': return 'CANCELLED';
        case 'Pending': return 'PENDING_SYNC';
        default: return 'WAITING';
    }
};

const mapServiceTypeDb = (uiType: string): string => {
    // DB Enum is capitalized: General, Prenatal, Dental, Vaccination
    switch (uiType.toLowerCase()) {
        case 'checkup': return 'General';
        case 'prenatal': return 'Prenatal';
        case 'dental': return 'Dental';
        case 'immunization': return 'Vaccination';
        default: return 'General';
    }
};

const mapDbServiceType = (dbType: string): ServiceType => {
    switch (dbType.toLowerCase()) {
        case 'general': return 'checkup';
        case 'prenatal': return 'prenatal';
        case 'dental': return 'dental';
        case 'vaccination': return 'immunization';
        default: return 'checkup';
    }
};

export const queueService = {

    /**
     * Helper to verify if the queue system is enabled. Throws if disabled.
     */
    async ensureQueueEnabled() {
        const { data } = await supabase.from('feature_toggles').select('is_enabled').eq('feature', 'queue').maybeSingle();
        if (data && data.is_enabled === false) {
            throw new Error('Queue system is currently offline for maintenance.');
        }
    },

    /**
     * Checks Supabase for an existing active queue entry for this user.
     * "Active" means WAITING, SERVING, or PENDING_SYNC.
     * Returns the hydrated QueueTicketData if one exists, or null.
     * This always hits the server so it cannot be tricked by a stale local cache.
     */
    async getActiveQueue(userId: string): Promise<QueueTicketData | null> {
        try {
            const { data, error } = await supabase
                .from('queue_transactions')
                .select('*')
                .eq('user_id', userId)
                .in('status', ACTIVE_DB_STATUSES)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error || !data) return null;

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { count } = await supabase
                .from('queue_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'WAITING')
                .gte('created_at', startOfDay.toISOString())
                .lt('queue_number', data.queue_number);

            const peopleAhead = count ?? 0;

            return {
                id: data.ticket_id,
                queueNumber: data.queue_number,
                serviceType: mapDbServiceType(data.service_type),
                status: mapDbStatusToUi(data.status),
                nowServing: Math.max(0, data.queue_number - peopleAhead - 1),
                peopleAhead,
                estWaitTime: `${peopleAhead * 15} mins`,
            };
        } catch (e) {
            console.warn('getActiveQueue error:', e);
            return null;
        }
    },

    // A-FR-01: Get Ticket (Optimistic offline & online sync)
    // Guard: if the user already has an active queue, return it instead of creating a new one.
    async requestTicket(userId: string, serviceType: ServiceType): Promise<QueueTicketData & { alreadyActive?: boolean }> {
        await this.ensureQueueEnabled();

        // ── Active-queue guard (server-side check) ──────────────────────────────
        const existing = await this.getActiveQueue(userId);
        if (existing) {
            // Persist the existing ticket locally so the UI is consistent
            await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(existing));
            return { ...existing, alreadyActive: true };
        }
        // ───────────────────────────────────────────────────────────────────────

        const ticketId = generateUUID();
        const initialTicket: QueueTicketData = {
            id: ticketId,
            queueNumber: 0,
            serviceType,
            status: 'Pending',
            nowServing: 0,
            peopleAhead: 0,
            estWaitTime: 'Calculating...'
        };

        try {
            await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(initialTicket));

            const dbServiceType = mapServiceTypeDb(serviceType);
            // NOTE: p_created_at is intentionally omitted so the RPC always uses
            // the server-side now(), eliminating client clock-skew as a root cause
            // of wrong day-boundary calculations.
            const { data, error } = await supabase.rpc('assign_queue_number', {
                p_ticket_id: ticketId,
                p_user_id: userId,
                p_service_type: dbServiceType
            });

            if (!error && data && data.length > 0) {
                const result = data[0];

                // Get now serving for EWT calculation
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                // find the specific serving ticket count/number or just people ahead
                const { count } = await supabase
                    .from('queue_transactions')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'WAITING')
                    .gte('created_at', startOfDay.toISOString())
                    .lt('queue_number', result.queue_number);

                const peopleAhead = count || 0;
                const confirmedTicket: QueueTicketData = {
                    id: result.ticket_id,
                    queueNumber: result.queue_number,
                    serviceType: serviceType,
                    status: mapDbStatusToUi(result.status),
                    nowServing: Math.max(0, result.queue_number - peopleAhead - 1),
                    peopleAhead: peopleAhead,
                    estWaitTime: `${peopleAhead * 15} mins` // 15 mins avg wait time
                };
                await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(confirmedTicket));
                return confirmedTicket;
            } else {
                console.warn('RPC Error:', error?.message);
            }
        } catch (e) {
            console.warn('Network issue or RPC failure');
        }

        return initialTicket;
    },

    // Silently sync pending ticket on connectivity restore (A-BL-02)
    async syncPendingTicket(userId: string): Promise<QueueTicketData | null> {
        const cached = await AsyncStorage.getItem(getStorageKey(userId));
        if (!cached) return null;

        const ticket: QueueTicketData = JSON.parse(cached);
        if (ticket.status === 'Pending') {
            return this.requestTicket(userId, ticket.serviceType);
        }
        return ticket;
    },

    async getLocalTicket(userId: string): Promise<QueueTicketData | null> {
        const cached = await AsyncStorage.getItem(getStorageKey(userId));
        if (!cached) return null;

        const ticket: QueueTicketData = JSON.parse(cached);

        // Do NOT surface a completed/cancelled ticket as active.
        // This prevents a stale cache from re-displaying a finished queue on app relaunch.
        if (TERMINAL_STATUSES.includes(ticket.status as QueueStatus)) {
            await AsyncStorage.removeItem(getStorageKey(userId));
            return null;
        }

        return ticket;
    },

    async updateLocalTicket(userId: string, ticket: QueueTicketData) {
        await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(ticket));
    },

    async clearLocalTicket(userId: string) {
        await AsyncStorage.removeItem(getStorageKey(userId));
    },

    async cancelTicket(userId: string, ticketId: string) {
        await this.ensureQueueEnabled();
        const { error } = await supabase
            .from('queue_transactions')
            .update({ status: 'CANCELLED' })
            .eq('ticket_id', ticketId)
            .eq('user_id', userId);
        
        if (!error) {
            await AsyncStorage.removeItem(getStorageKey(userId));
        }
        return !error;
    },

    // A-FR-02: Real-Time Queue Monitoring
    subscribeToQueue(
        serviceType: string,
        userId: string,
        onNowServingUpdate: (nowServing: number) => void,
        onStatusUpdate: (status: QueueStatus) => void
    ) {
        // Listen to queue_transactions updates for serving/waiting
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const globalSub = supabase
            .channel(`public:queue_transactions`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'queue_transactions' },
                (payload) => {
                    if (payload.new.status === 'SERVING') {
                        onNowServingUpdate(payload.new.queue_number);
                    }
                    if (payload.new.user_id === userId && payload.new.status) {
                        onStatusUpdate(mapDbStatusToUi(payload.new.status));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(globalSub);
        };
    },

    // --- STAFF SIDE METHODS (Section 4) ---

    async getQueueList(serviceType?: string) {
        // We use just the statuses directly since the system marks past queues as COMPLETED.
        // And timezone-based date filtering in JS vs Postgres can hide early-morning local queues.
        let query = supabase
            .from('queue_transactions')
            .select('*, users(first_name, last_name)')
            .in('status', ['PENDING_SYNC', 'WAITING', 'SERVING', 'SKIPPED'])
            .order('queue_number', { ascending: true });

        // if serviceType is provided we might want to map it
        // if (serviceType && serviceType !== 'all') { ... }

        const { data, error } = await query;
        if (error) {
            console.error("Queue Fetch Error:", error);
            throw error;
        }

        // Map data to the expected UI format
        return (data || []).map((item: any) => ({
            id: item.ticket_id,
            queue_number: item.queue_number,
            patient_name: item.users ? `${item.users.first_name} ${item.users.last_name}` : (item.patient_name || 'Walk-in Patient'),
            service_type: mapDbServiceType(item.service_type),
            status: mapDbStatusToUi(item.status),
            created_at: item.created_at
        }));
    },

    async getQueueHistory() {
        let query = supabase
            .from('queue_transactions')
            .select('*, users(first_name, last_name)')
            .eq('status', 'COMPLETED')
            .order('completed_at', { ascending: false })
            .limit(50); // Get the last 50 completed records

        const { data, error } = await query;
        if (error) {
            console.error("Queue History Fetch Error:", error);
            throw error;
        }

        return (data || []).map((item: any) => ({
            id: item.ticket_id,
            queue_number: item.queue_number,
            patient_name: item.users ? `${item.users.first_name} ${item.users.last_name}` : (item.patient_name || 'Walk-in Patient'),
            service_type: mapDbServiceType(item.service_type),
            status: mapDbStatusToUi(item.status),
            created_at: item.created_at,
            completed_at: item.completed_at
        }));
    },

    async callNext(serviceType: ServiceType) {
        await this.ensureQueueEnabled();
        const dbServiceType = mapServiceTypeDb(serviceType);
        // DB RPC call_next handles finding the next ticket automatically. By passing dbServiceType, it filters to that specific service if needed.
        const { data, error } = await supabase.rpc('call_next', { p_service_type: dbServiceType });
        if (error) throw error;
        return data;
    },

    async completePatient(transactionId: string) {
        await this.ensureQueueEnabled();
        const { error } = await supabase
            .from('queue_transactions')
            .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
            .eq('ticket_id', transactionId);
        if (error) throw error;
    },

    async markNoShow(transactionId: string) {
        await this.ensureQueueEnabled();
        const { error } = await supabase
            .from('queue_transactions')
            .update({ status: 'SKIPPED' })
            .eq('ticket_id', transactionId);
        if (error) throw error;
    },

    async reinsertPatient(transactionId: string) {
        await this.ensureQueueEnabled();
        const { error } = await supabase
            .from('queue_transactions')
            .update({ status: 'WAITING' })
            .eq('ticket_id', transactionId);
        if (error) throw error;
    },

    async registerWalkIn(patientName: string, serviceType: ServiceType) {
        await this.ensureQueueEnabled();
        const dbServiceType = mapServiceTypeDb(serviceType);
        // We will assume "Walk-ins" might need a dummy user_id in the strict schema, 
        // but if schema allows NULL or we just create a temp UUID for them since it's just a generated ticket.
        const DUMMY_USER = null;

        const { data, error } = await supabase.rpc('add_walk_in', {
            p_service_type: dbServiceType,
            p_user_id: DUMMY_USER
        });
        if (error) throw error;
        return data;
    },

    subscribeToStaffQueue(onUpdate: () => void) {
        const channel = supabase
            .channel('staff_queue_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'queue_transactions' },
                () => onUpdate()
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Fetches the 5 most recently queued active patients (pending/in-progress).
     * Used in the Doctor Dashboard Patient Lookup "Recently Queued" section.
     * Statuses included: PENDING_SYNC, WAITING, SERVING
     */
    async getRecentQueuedPatients(): Promise<RecentQueuedPatient[]> {
        const { data, error } = await supabase
            .from('queue_transactions')
            .select('ticket_id, queue_number, status, created_at, user_id, users(id, first_name, last_name)')
            .in('status', ['PENDING_SYNC', 'WAITING', 'SERVING'])
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('[getRecentQueuedPatients] error:', error);
            return [];
        }

        return (data || []).map((item: any) => ({
            ticketId: item.ticket_id,
            queueNumber: item.queue_number,
            status: mapDbStatusToUi(item.status),
            createdAt: item.created_at,
            userId: item.user_id,
            patientName: item.users
                ? `${item.users.first_name ?? ''} ${item.users.last_name ?? ''}`.trim()
                : 'Walk-in Patient',
            patientFirstName: item.users?.first_name ?? '',
            patientLastName: item.users?.last_name ?? '',
        }));
    },

    subscribeToQueueHistory(onUpdate: () => void) {
        const channel = supabase
            .channel('queue_history_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'queue_transactions', filter: 'status=eq.COMPLETED' },
                () => onUpdate()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};
