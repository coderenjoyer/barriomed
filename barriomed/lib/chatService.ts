import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkingHours {
    startTime: string; // 'HH:MM' 24-hour format
    endTime: string;   // 'HH:MM' 24-hour format
    timezone?: string; // IANA timezone string e.g. 'Asia/Manila'
}

export interface DoctorAvailability {
    doctor_id: string;
    is_available: boolean;
    working_hours_start: string | null; // 'HH:MM'
    working_hours_end: string | null;   // 'HH:MM'
    timezone: string;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    timestamp: string;
    is_read: boolean;
}

export interface Conversation {
    id: string;
    doctor_id: string;
    patient_id: string;
    created_at: string;
    last_message?: string;
    last_message_at?: string;
    unread_count?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine if a doctor is currently within their working hours.
 * Always returns true if no working hours are configured.
 */
export function isWithinWorkingHours(availability: DoctorAvailability): boolean {
    const { working_hours_start, working_hours_end, timezone } = availability;
    if (!working_hours_start || !working_hours_end) return true;

    try {
        // Get current time in doctor's timezone
        const tz = timezone || 'UTC';
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: tz,
        });
        const parts = formatter.formatToParts(now);
        const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
        const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
        const currentMinutes = parseInt(hour) * 60 + parseInt(minute);

        const [startH, startM] = working_hours_start.split(':').map(Number);
        const [endH, endM] = working_hours_end.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } catch {
        return true;
    }
}

/**
 * Returns aggregated availability: manual toggle AND working hours both must be satisfied.
 */
export function isEffectivelyAvailable(availability: DoctorAvailability): boolean {
    if (!availability.is_available) return false;
    return isWithinWorkingHours(availability);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const chatService = {

    // ── Availability ────────────────────────────────────────────────────────

    /** Fetch a doctor's availability record. Creates one if none exists. */
    async getDoctorAvailability(doctorId: string): Promise<DoctorAvailability | null> {
        const { data, error } = await supabase
            .from('doctor_availability')
            .select('*')
            .eq('doctor_id', doctorId)
            .maybeSingle();

        if (error) {
            console.error('[chatService] getDoctorAvailability error:', error);
            return null;
        }

        // Bootstrap a default row if missing
        if (!data) {
            const defaults: Omit<DoctorAvailability, 'updated_at'> = {
                doctor_id: doctorId,
                is_available: false,
                working_hours_start: '08:00',
                working_hours_end: '17:00',
                timezone: 'Asia/Manila',
            };
            const { data: created, error: createErr } = await supabase
                .from('doctor_availability')
                .insert({ ...defaults, updated_at: new Date().toISOString() })
                .select()
                .single();

            if (createErr) {
                console.error('[chatService] create availability error:', createErr);
                return null;
            }
            return created as DoctorAvailability;
        }

        return data as DoctorAvailability;
    },

    /** Toggle the manual availability switch. */
    async setDoctorAvailability(
        doctorId: string,
        isAvailable: boolean,
    ): Promise<{ success: boolean; data?: DoctorAvailability; error?: string }> {
        const { data, error } = await supabase
            .from('doctor_availability')
            .upsert(
                { doctor_id: doctorId, is_available: isAvailable, updated_at: new Date().toISOString() },
                { onConflict: 'doctor_id' },
            )
            .select()
            .single();

        if (error) {
            console.error('[chatService] setDoctorAvailability error:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data: data as DoctorAvailability };
    },

    /** Update working hours configuration. */
    async updateWorkingHours(
        doctorId: string,
        workingHours: WorkingHours,
    ): Promise<{ success: boolean; data?: DoctorAvailability; error?: string }> {
        const { data, error } = await supabase
            .from('doctor_availability')
            .upsert(
                {
                    doctor_id: doctorId,
                    working_hours_start: workingHours.startTime,
                    working_hours_end: workingHours.endTime,
                    timezone: workingHours.timezone ?? 'Asia/Manila',
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'doctor_id' },
            )
            .select()
            .single();

        if (error) {
            console.error('[chatService] updateWorkingHours error:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data: data as DoctorAvailability };
    },

    /** Real-time subscription to a doctor's availability row. */
    subscribeToDoctorAvailability(
        doctorId: string,
        onChange: (availability: DoctorAvailability) => void,
    ): () => void {
        const channel = supabase
            .channel(`doctor-availability:${doctorId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'doctor_availability',
                    filter: `doctor_id=eq.${doctorId}`,
                },
                (payload) => {
                    if (payload.new) onChange(payload.new as DoctorAvailability);
                },
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    },

    // ── Conversations ────────────────────────────────────────────────────────

    /** Get or create a conversation between doctor and patient. */
    async getOrCreateConversation(
        doctorId: string,
        patientId: string,
    ): Promise<{ success: boolean; data?: Conversation; error?: string }> {
        // Try to find existing conversation
        const { data: existing } = await supabase
            .from('conversations')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('patient_id', patientId)
            .maybeSingle();

        if (existing) return { success: true, data: existing as Conversation };

        // Create new
        const { data, error } = await supabase
            .from('conversations')
            .insert({ doctor_id: doctorId, patient_id: patientId, created_at: new Date().toISOString() })
            .select()
            .single();

        if (error) {
            console.error('[chatService] getOrCreateConversation error:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data: data as Conversation };
    },

    /**
     * Fetch all conversations for a doctor (with last message snippet).
     */
    async getDoctorConversations(doctorId: string): Promise<Conversation[]> {
        const { data, error } = await supabase
            .from('conversations')
            .select('*, chat_messages(content, timestamp, sender_id, is_read)')
            .eq('doctor_id', doctorId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[chatService] getDoctorConversations error:', error);
            return [];
        }

        return (data ?? []).map((conv: any) => {
            const msgs: any[] = conv.chat_messages ?? [];
            const sorted = msgs.sort(
                (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
            );
            const last = sorted[0];
            const unread = msgs.filter((m: any) => m.sender_id !== doctorId && !m.is_read).length;
            return {
                id: conv.id,
                doctor_id: conv.doctor_id,
                patient_id: conv.patient_id,
                created_at: conv.created_at,
                last_message: last?.content ?? '',
                last_message_at: last?.timestamp ?? conv.created_at,
                unread_count: unread,
            } as Conversation;
        });
    },

    /**
     * Fetch all conversations for a patient.
     */
    async getPatientConversations(patientId: string): Promise<Conversation[]> {
        const { data, error } = await supabase
            .from('conversations')
            .select('*, chat_messages(content, timestamp, sender_id, is_read)')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[chatService] getPatientConversations error:', error);
            return [];
        }

        return (data ?? []).map((conv: any) => {
            const msgs: any[] = conv.chat_messages ?? [];
            const sorted = msgs.sort(
                (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
            );
            const last = sorted[0];
            const unread = msgs.filter((m: any) => m.sender_id !== patientId && !m.is_read).length;
            return {
                id: conv.id,
                doctor_id: conv.doctor_id,
                patient_id: conv.patient_id,
                created_at: conv.created_at,
                last_message: last?.content ?? '',
                last_message_at: last?.timestamp ?? conv.created_at,
                unread_count: unread,
            } as Conversation;
        });
    },

    // ── Messages ─────────────────────────────────────────────────────────────

    /** Fetch messages for a conversation, oldest first. */
    async getMessages(conversationId: string): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });

        if (error) {
            console.error('[chatService] getMessages error:', error);
            return [];
        }
        return (data ?? []) as ChatMessage[];
    },

    /** Send a message. */
    async sendMessage(params: {
        conversationId: string;
        senderId: string;
        receiverId: string;
        content: string;
    }): Promise<{ success: boolean; data?: ChatMessage; error?: string }> {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                conversation_id: params.conversationId,
                sender_id: params.senderId,
                receiver_id: params.receiverId,
                content: params.content,
                timestamp: new Date().toISOString(),
                is_read: false,
            })
            .select()
            .single();

        if (error) {
            console.error('[chatService] sendMessage error:', error);
            return { success: false, error: error.message };
        }

        // Update conversation last_message_at
        await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', params.conversationId);

        return { success: true, data: data as ChatMessage };
    },

    /** Mark all messages in a conversation as read for a specific receiver. */
    async markMessagesRead(conversationId: string, receiverId: string): Promise<void> {
        await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .eq('receiver_id', receiverId)
            .eq('is_read', false);
    },

    /** Real-time subscription to new messages in a conversation. */
    subscribeToMessages(
        conversationId: string,
        onMessage: (msg: ChatMessage) => void,
    ): () => void {
        const channel = supabase
            .channel(`chat-messages:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    if (payload.new) onMessage(payload.new as ChatMessage);
                },
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    },

    /** Real-time subscription to conversation list changes (for updating previews). */
    subscribeToConversations(
        userId: string,
        role: 'doctor' | 'patient',
        onChange: () => void,
    ): () => void {
        const field = role === 'doctor' ? 'doctor_id' : 'patient_id';
        const channel = supabase
            .channel(`conversations:${role}:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                },
                () => onChange(),
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    },

    // ── User info helpers ────────────────────────────────────────────────────

    /** Fetch user display info from the users table. */
    async getUserInfo(userId: string): Promise<{ id: string; first_name: string; last_name: string; role: string } | null> {
        const { data, error } = await supabase
            .from('users')
            .select('id, first_name, last_name, role')
            .eq('id', userId)
            .maybeSingle();

        if (error || !data) return null;
        return data as any;
    },

    /** Fetch all doctors (for patient to see who they can message). */
    async getDoctors(): Promise<{ id: string; first_name: string; last_name: string }[]> {
        const { data, error } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('role', 'doctor');

        if (error) return [];
        return (data ?? []) as any[];
    },

    /**
     * Fetch all doctors who are currently available (is_available = true).
     * Returns combined doctor profile + live availability record.
     */
    async getAvailableDoctors(): Promise<Array<{
        id: string;
        first_name: string;
        last_name: string;
        availability: DoctorAvailability | null;
    }>> {
        // 1. Fetch all doctor users
        const { data: doctors, error: doctorErr } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('role', 'doctor');

        if (doctorErr || !doctors) return [];

        // 2. Fetch all availability rows in one query
        const doctorIds = doctors.map((d: any) => d.id);
        const { data: availRows } = await supabase
            .from('doctor_availability')
            .select('*')
            .in('doctor_id', doctorIds);

        const availMap: Record<string, DoctorAvailability> = {};
        for (const row of (availRows ?? [])) {
            availMap[(row as any).doctor_id] = row as DoctorAvailability;
        }

        // 3. Combine and filter to only available doctors
        return (doctors as any[]).map((d) => ({
            id: d.id,
            first_name: d.first_name,
            last_name: d.last_name,
            availability: availMap[d.id] ?? null,
        })).filter((d) => {
            if (!d.availability) return false;
            return isEffectivelyAvailable(d.availability);
        });
    },

    /**
     * Search patients by first name, last name, or mobile number.
     * Used by doctors to find patients to chat with.
     */
    async searchPatients(query: string): Promise<Array<{
        id: string;
        first_name: string;
        last_name: string;
        mobile_number: string;
    }>> {
        if (!query.trim()) {
            // Return all patients when query is empty
            const { data, error } = await supabase
                .from('users')
                .select('id, first_name, last_name, mobile_number')
                .eq('role', 'patient')
                .order('first_name', { ascending: true })
                .limit(50);

            if (error) return [];
            return (data ?? []) as any[];
        }

        const q = query.trim().toLowerCase();

        // Supabase ilike for partial match on first/last name or mobile
        const { data, error } = await supabase
            .from('users')
            .select('id, first_name, last_name, mobile_number')
            .eq('role', 'patient')
            .or(
                `first_name.ilike.%${q}%,last_name.ilike.%${q}%,mobile_number.ilike.%${q}%`
            )
            .order('first_name', { ascending: true })
            .limit(30);

        if (error) {
            console.error('[chatService] searchPatients error:', error);
            return [];
        }
        return (data ?? []) as any[];
    },
};
