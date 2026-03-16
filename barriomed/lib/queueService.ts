import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServiceType } from '../components/patient/selectservice';

export type QueueStatus = 'Pending' | 'Waiting' | 'Serving' | 'Completed' | 'No Show';

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

const STORAGE_KEY = '@barriomed_queue_ticket';

export const queueService = {
    // A-FR-01: Get Ticket (Optimistic offline & online sync)
    async requestTicket(userId: string, serviceType: ServiceType): Promise<QueueTicketData> {
        // Fallback/Initial state
        const initialTicket: QueueTicketData = {
            queueNumber: 0,
            serviceType,
            status: 'Pending',
            nowServing: 0,
            peopleAhead: 0,
            estWaitTime: 'Calculating...'
        };

        try {
            // Use RPC for atomic ticket generation
            const { data, error } = await supabase.rpc('generate_ticket', {
                p_user_id: userId,
                p_service_type: serviceType
            });

            if (!error && data) {
                 // Get now serving from queue_state
                 const { data: stateData } = await supabase
                    .from('queue_state')
                    .select('currently_serving')
                    .eq('service_type', serviceType)
                    .eq('date', new Date().toISOString().split('T')[0])
                    .maybeSingle();

                 const nowServing = stateData?.currently_serving || 0;
                 const confirmedTicket: QueueTicketData = {
                     id: data.id,
                     queueNumber: data.queue_number,
                     serviceType: data.service_type as ServiceType,
                     status: data.status,
                     nowServing: nowServing,
                     peopleAhead: Math.max(0, data.queue_number - nowServing - 1),
                     estWaitTime: `${Math.max(0, data.queue_number - nowServing - 1) * 5} mins`
                 };
                 await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(confirmedTicket));
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
       const cached = await AsyncStorage.getItem(STORAGE_KEY);
       if (!cached) return null;
       
       const ticket: QueueTicketData = JSON.parse(cached);
       if (ticket.status === 'Pending') {
           return this.requestTicket(userId, ticket.serviceType);
       }
       return ticket;
    },

    async getLocalTicket(): Promise<QueueTicketData | null> {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        return cached ? JSON.parse(cached) : null;
    },

    async updateLocalTicket(ticket: QueueTicketData) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ticket));
    },

    async clearLocalTicket() {
        await AsyncStorage.removeItem(STORAGE_KEY);
    },
    
    // A-FR-02: Real-Time Queue Monitoring
    subscribeToQueue(
        serviceType: string, 
        userId: string,
        onNowServingUpdate: (nowServing: number) => void,
        onStatusUpdate: (status: QueueStatus) => void
    ) {
        // Listen to queue_state changes (global serving updates)
        const stateSub = supabase
          .channel(`public:queue_state:service_type=eq.${serviceType}`)
          .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'queue_state', filter: `service_type=eq.${serviceType}` },
              (payload) => {
                  if (payload.new.currently_serving !== undefined) {
                      onNowServingUpdate(payload.new.currently_serving);
                  }
              }
          )
          .subscribe();

        // Listen to changes to the user's specific ticket
        const userSub = supabase
          .channel(`public:queue_transactions:user_id=eq.${userId}`)
          .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'queue_transactions', filter: `user_id=eq.${userId}` },
              (payload) => {
                  if (payload.new.status) {
                      onStatusUpdate(payload.new.status as QueueStatus);
                  }
              }
          )
          .subscribe();

        return () => {
             supabase.removeChannel(stateSub);
             supabase.removeChannel(userSub);
        };
    },

    // --- STAFF SIDE METHODS (Section 4) ---

    async getQueueList(serviceType?: string) {
        let query = supabase
            .from('queue_transactions')
            .select('*, users(first_name, last_name)')
            .eq('date', new Date().toISOString().split('T')[0])
            .neq('status', 'Completed')
            .order('queue_number', { ascending: true });

        if (serviceType) {
            query = query.eq('service_type', serviceType);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async callNext(serviceType: ServiceType) {
        const { data, error } = await supabase.rpc('call_next', { p_service_type: serviceType });
        if (error) throw error;
        return data;
    },

    async completePatient(transactionId: string) {
        const { error } = await supabase.rpc('complete_patient', { p_transaction_id: transactionId });
        if (error) throw error;
    },

    async markNoShow(transactionId: string) {
        const { error } = await supabase.rpc('mark_no_show', { p_transaction_id: transactionId });
        if (error) throw error;
    },

    async reinsertPatient(transactionId: string) {
        const { data, error } = await supabase.rpc('reinsert_patient', { p_transaction_id: transactionId });
        if (error) throw error;
        return data;
    },

    async registerWalkIn(patientName: string, serviceType: ServiceType) {
        const { data, error } = await supabase.rpc('register_walk_in', {
            p_patient_name: patientName,
            p_service_type: serviceType
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
    }
};

