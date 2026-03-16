import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServiceType } from '../components/patient/selectservice';

export interface QueueTicketData {
    id?: string;
    queueNumber: number;
    serviceType: ServiceType;
    status: 'pending' | 'confirmed' | 'serving' | 'completed' | 'missed';
    nowServing: number;
    peopleAhead: number;
    estWaitTime: string;
}

const STORAGE_KEY = '@barriomed_queue_ticket';

export const queueService = {
    // A-FR-01: Get Ticket (Optimistic offline & online sync)
    async requestTicket(userId: string, serviceType: ServiceType): Promise<QueueTicketData> {
        // Issuing a Pending Ticket immediately
        const mockQueueNum = Math.floor(Math.random() * 20) + 30;
        const pendingTicket: QueueTicketData = {
            queueNumber: mockQueueNum,
            serviceType,
            status: 'pending',
            nowServing: 12, // example start
            peopleAhead: mockQueueNum - 12,
            estWaitTime: `${(mockQueueNum - 12) * 5} mins`
        };

        // Cache immediately for Offline Display (A-FR-04)
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pendingTicket));

        try {
            // Attempt to insert immediately (silent sync attempt)
            const { data, error } = await supabase
                .from('queue_tickets')
                .insert([{
                    user_id: userId,
                    service_type: serviceType,
                    status: 'confirmed',
                    queue_number: mockQueueNum,
                    now_serving: 12
                }])
                .select()
                .single();

            if (!error && data) {
                 const confirmedTicket: QueueTicketData = {
                     id: data.id,
                     queueNumber: data.queue_number || pendingTicket.queueNumber,
                     serviceType: data.service_type as ServiceType,
                     status: data.status,
                     nowServing: data.now_serving || pendingTicket.nowServing,
                     peopleAhead: (data.queue_number || pendingTicket.queueNumber) - (data.now_serving || pendingTicket.nowServing),
                     estWaitTime: `${((data.queue_number || pendingTicket.queueNumber) - (data.now_serving || pendingTicket.nowServing)) * 5} mins`
                 };
                 await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(confirmedTicket));
                 return confirmedTicket;
            } else {
                console.warn('Could not confirm with server right away, keeping as pending:', error?.message);
            }
        } catch (e) {
            console.warn('Network issue, keeping as pending');
        }

        return pendingTicket;
    },

    // Silently sync pending ticket on connectivity restore
    async syncPendingTicket(userId: string): Promise<QueueTicketData | null> {
       const cached = await AsyncStorage.getItem(STORAGE_KEY);
       if (!cached) return null;
       
       const ticket: QueueTicketData = JSON.parse(cached);
       if (ticket.status === 'pending') {
           try {
               const { data, error } = await supabase
                .from('queue_tickets')
                .insert([{
                    user_id: userId,
                    service_type: ticket.serviceType,
                    status: 'confirmed',
                    queue_number: ticket.queueNumber,
                    now_serving: ticket.nowServing
                }])
                .select()
                .single();

                if (!error && data) {
                     const confirmedTicket: QueueTicketData = {
                         id: data.id,
                         queueNumber: data.queue_number || ticket.queueNumber,
                         serviceType: data.service_type as ServiceType,
                         status: data.status,
                         nowServing: data.now_serving || ticket.nowServing,
                         peopleAhead: (data.queue_number || ticket.queueNumber) - (data.now_serving || ticket.nowServing),
                         estWaitTime: `${((data.queue_number || ticket.queueNumber) - (data.now_serving || ticket.nowServing)) * 5} mins`
                     };
                     await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(confirmedTicket));
                     return confirmedTicket;
                }
           } catch {
               // Still pending
           }
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
    
    // A-FR-02: Real-Time Queue Monitoring with Supabase Realtime
    subscribeToQueue(
        serviceType: string, 
        userId: string,
        onNowServingUpdate: (nowServing: number) => void,
        onStatusUpdate: (status: QueueTicketData['status']) => void
    ) {
        // Listen to updates for the current service type
        const generalSub = supabase
          .channel(`public:queue_tickets:service_type=eq.${serviceType}`)
          .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'queue_tickets', filter: `service_type=eq.${serviceType}` },
              (payload) => {
                  if (payload.new.status === 'serving' && payload.new.queue_number) {
                      onNowServingUpdate(payload.new.queue_number);
                  }
              }
          )
          .subscribe();

        // Listen to changes to the user's specific ticket (A-FR-05 No-Show Re-insertion)
        const userSub = supabase
          .channel(`public:queue_tickets:user_id=eq.${userId}`)
          .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'queue_tickets', filter: `user_id=eq.${userId}` },
              (payload) => {
                  if (payload.new.status) {
                      onStatusUpdate(payload.new.status as QueueTicketData['status']);
                  }
              }
          )
          .subscribe();

        return () => {
             supabase.removeChannel(generalSub);
             supabase.removeChannel(userSub);
        };
    }
};
