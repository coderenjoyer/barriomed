import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminRole = 'patient' | 'doctor' | 'health_staff' | 'system_admin';

export interface AdminUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: AdminRole;
    created_at: string;
    is_active: boolean;
    // Derived on the client
    initials: string;
    displayName: string;
}

export interface AdminLog {
    id: string;
    admin_id: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    metadata: Record<string, any> | null;
    old_value: Record<string, any> | null;
    new_value: Record<string, any> | null;
    performed_by_role: string | null;
    created_at: string;
    // Joined
    admin_name?: string;
}

/** Matches the shape returned by fetchInventory() */
export interface InventoryItem {
    item_id: string;
    generic_name: string;
    brand_name?: string | null;
    category: string;
    quantity?: number | null;
    unit?: string | null;
    stock_status: string;
    last_updated?: string | null;
    updated_by?: string | null;
    batch_no?: string | null;
    expiry_date?: string | null;
    created_by?: string | null;
    created_at?: string | null;
}

export type InventoryAuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface InventoryAuditFilters {
    action?: string;
    /** ISO date string – only return logs on or after this date */
    fromDate?: string;
    /** ISO date string – only return logs on or before this date */
    toDate?: string;
    /** Filter by admin_id */
    userId?: string;
}

export interface AdminNotification {
    id: string;
    user_id: string | null;   // null = broadcast
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    related_id: string | null;
    created_at: string;
}

export type FeatureName = 'login' | 'chat' | 'queue';

export interface FeatureToggle {
    feature: FeatureName;
    is_enabled: boolean;
    updated_by: string | null;
    updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInitials(first: string, last: string): string {
    return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

function mapUser(row: any): AdminUser {
    return {
        id: row.id,
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        email: row.email ?? '',
        role: row.role as AdminRole,
        created_at: row.created_at,
        is_active: row.is_active !== false, // default to true if column is null
        initials: makeInitials(row.first_name, row.last_name),
        displayName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    };
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────

/**
 * Writes an admin action to the admin_logs table (fail-safe: never throws).
 * Supports structured old_value / new_value / performed_by_role for inventory audit.
 */
export async function logAdminAction(params: {
    adminId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, any>;
    oldValue?: Record<string, any> | null;
    newValue?: Record<string, any> | null;
    performedByRole?: string | null;
}): Promise<void> {
    try {
        await supabase.from('admin_logs').insert({
            admin_id: params.adminId,
            action: params.action,
            resource_type: params.resourceType,
            resource_id: params.resourceId ?? null,
            metadata: params.metadata ?? null,
            old_value: params.oldValue ?? null,
            new_value: params.newValue ?? null,
            performed_by_role: params.performedByRole ?? null,
            created_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[adminService] logAdminAction error:', err);
    }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const adminService = {

    // ── Guard ────────────────────────────────────────────────────────────────

    /**
     * Verify the current session user is a system_admin. Returns false if not.
     */
    async verifyAdminSession(): Promise<boolean> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return false;

        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

        if (error || !data) return false;
        return data.role === 'system_admin';
    },

    // ── User Management ───────────────────────────────────────────────────────

    async fetchAllUsers(): Promise<AdminUser[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[adminService] fetchAllUsers error:', error);
            return [];
        }
        return (data ?? []).map(mapUser);
    },

    /**
     * Creates a new user via Supabase Auth signUp.
     * This is the only safe way to create auth + profile in one call
     * from the client without the service_role key.
     */
    async createUser(params: {
        firstName: string;
        lastName: string;
        email: string;
        role: AdminRole;
        password: string;
        adminId: string;
    }): Promise<{ success: boolean; error?: string }> {
        // 1. Create the auth user
        const { data, error } = await supabase.auth.signUp({
            email: params.email.toLowerCase().trim(),
            password: params.password,
            options: {
                data: {
                    first_name: params.firstName,
                    last_name: params.lastName,
                    role: params.role,
                },
            },
        });

        if (error) {
            console.error('[adminService] createUser auth error:', error);
            return { success: false, error: error.message };
        }

        // Guard: email already exists (Supabase returns empty identities array)
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            return { success: false, error: 'An account with this email already exists.' };
        }

        // 2. Insert the profile row
        const userId = data.user?.id;
        if (userId) {
            const { error: profileError } = await supabase.from('users').insert({
                id: userId,
                first_name: params.firstName,
                last_name: params.lastName,
                mobile_number: '',
                email: params.email.toLowerCase().trim(),
                role: params.role,
                created_at: new Date().toISOString(),
            });

            if (profileError) {
                console.error('[adminService] createUser profile error:', profileError);
                return { success: false, error: 'Auth user created but profile failed. Contact support.' };
            }

            await logAdminAction({
                adminId: params.adminId,
                action: `Created user account: ${params.email} (${params.role})`,
                resourceType: 'users',
                resourceId: userId,
                metadata: { email: params.email, role: params.role },
            });
        }

        return { success: true };
    },

    /**
     * Updates a user's role.
     */
    async updateUserRole(params: {
        userId: string;
        newRole: AdminRole;
        adminId: string;
    }): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('users')
            .update({ role: params.newRole })
            .eq('id', params.userId);

        if (error) {
            console.error('[adminService] updateUserRole error:', error);
            return { success: false, error: error.message };
        }

        await logAdminAction({
            adminId: params.adminId,
            action: `Changed user role to ${params.newRole}`,
            resourceType: 'users',
            resourceId: params.userId,
            metadata: { new_role: params.newRole },
        });

        return { success: true };
    },

    /**
     * Deactivates or reactivates a user by updating their status in the users table.
     * The users table uses an `is_active` boolean column.
     */
    async setUserActiveStatus(params: {
        userId: string;
        active: boolean;
        adminId: string;
    }): Promise<{ success: boolean; error?: string; updatedStatus?: boolean }> {
        const { data, error } = await supabase
            .from('users')
            .update({ is_active: params.active })
            .eq('id', params.userId)
            .select('is_active')
            .maybeSingle();

        if (error) {
            console.error('[adminService] setUserActiveStatus error:', error);
            return { success: false, error: error.message };
        }

        if (!data) {
            return { success: false, error: 'Update failed. User not found or permission denied.' };
        }

        await logAdminAction({
            adminId: params.adminId,
            action: params.active ? 'Reactivated user account' : 'Deactivated user account',
            resourceType: 'users',
            resourceId: params.userId,
            metadata: { status: params.active ? 'active' : 'deactivated' },
        });

        return { success: true, updatedStatus: data.is_active };
    },

    // ── Inventory ─────────────────────────────────────────────────────────────

    async fetchInventory(): Promise<InventoryItem[]> {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('category', { ascending: true })
            .order('generic_name', { ascending: true });

        if (error) {
            console.error('[adminService] fetchInventory error:', error);
            return [];
        }
        return (data ?? []) as InventoryItem[];
    },

    /**
     * Adds a new inventory item and writes a CREATE audit log.
     */
    async addInventoryItem(params: {
        item: Omit<InventoryItem, 'item_id' | 'last_updated' | 'updated_by' | 'created_at'>;
        adminId: string;
        adminName: string;
        adminRole: string;
    }): Promise<{ success: boolean; item?: InventoryItem; error?: string }> {
        const now = new Date().toISOString();
        const row = {
            ...params.item,
            created_by: params.adminName,
            created_at: now,
            last_updated: now,
            updated_by: params.adminName,
            stock_status: params.item.stock_status ?? 'AVAILABLE',
        };

        const { data, error } = await supabase
            .from('inventory')
            .insert(row)
            .select()
            .single();

        if (error) {
            console.error('[adminService] addInventoryItem error:', error);
            return { success: false, error: error.message };
        }

        const created = data as InventoryItem;

        return { success: true, item: created };
    },

    async overrideInventoryQuantity(params: {
        itemId: string;
        genericName: string;
        newStatus: string;
        adminId: string;
        adminName: string;
        adminRole?: string;
        /** Previous item snapshot (for audit old_value) */
        previousItem?: InventoryItem | null;
    }): Promise<{ success: boolean; error?: string }> {
        const now = new Date().toISOString();

        const { data: updatedRows, error } = await supabase
            .from('inventory')
            .update({
                stock_status: params.newStatus,
                last_updated: now,
                updated_by: params.adminName,
            })
            .eq('item_id', params.itemId)
            .select()

        if (error) {
            console.error('[adminService] overrideInventoryQuantity error:', error);
            return { success: false, error: error.message };
        }

        const updatedItem = (updatedRows?.[0] ?? null) as InventoryItem | null;

        return { success: true };
    },

    subscribeToInventory(onUpdate: () => void): () => void {
        const channel = supabase
            .channel('admin_inventory_watch')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, onUpdate)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    },

    async deleteInventoryItem(params: {
        itemId: string;
        genericName: string;
        adminId: string;
        adminName: string;
        adminRole?: string;
        /** Full item snapshot captured before deletion for audit old_value */
        itemSnapshot?: InventoryItem | null;
    }): Promise<{ success: boolean; error?: string }> {
        // .select('*') is required — without it, a RLS-blocked DELETE
        // returns { data: null, error: null } which is indistinguishable from success.
        const { data, error } = await supabase
            .from('inventory')
            .delete()
            .eq('item_id', params.itemId)
            .select('*');

        if (error) {
            console.error('[adminService] deleteInventoryItem error:', error);
            return { success: false, error: error.message };
        }

        if (!data || data.length === 0) {
            console.warn('[adminService] deleteInventoryItem: no rows deleted – RLS may have blocked the operation');
            return {
                success: false,
                error: 'Could not delete item. You may not have the required permissions.',
            };
        }

        // Use the returned row as the definitive old_value (or fall back to snapshot)
        const deletedRow = (data[0] ?? params.itemSnapshot ?? null) as InventoryItem | null;

        return { success: true };
    },

    // ── Queue ─────────────────────────────────────────────────────────────────

    async fetchActiveQueue() {
        const { data, error } = await supabase
            .from('queue_transactions')
            .select('*, users(first_name, last_name)')
            .in('status', ['WAITING', 'SERVING', 'SKIPPED'])
            .order('queue_number', { ascending: true });

        if (error) {
            console.error('[adminService] fetchActiveQueue error:', error);
            return [];
        }
        return (data ?? []).map((item: any) => ({
            id: item.ticket_id,
            ticketNo: `Q-${String(item.queue_number).padStart(3, '0')}`,
            patientName: item.users
                ? `${item.users.first_name} ${item.users.last_name}`
                : (item.patient_name || 'Walk-in'),
            purpose: item.service_type ?? 'General',
            status: mapQueueStatus(item.status),
            joinedAt: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            attendedBy: item.attended_by ?? undefined,
        }));
    },

    async fetchQueueHistory() {
        const { data, error } = await supabase
            .from('queue_transactions')
            .select('*, users(first_name, last_name)')
            .eq('status', 'COMPLETED')
            .order('completed_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[adminService] fetchQueueHistory error:', error);
            return [];
        }
        return (data ?? []).map((item: any) => ({
            id: item.ticket_id,
            ticketNo: `Q-${String(item.queue_number).padStart(3, '0')}`,
            patientName: item.users
                ? `${item.users.first_name} ${item.users.last_name}`
                : (item.patient_name || 'Walk-in'),
            purpose: item.service_type ?? 'General',
            status: 'Completed' as const,
            joinedAt: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            completedAt: item.completed_at
                ? new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
            attendedBy: item.attended_by ?? undefined,
        }));
    },

    async overrideQueueStatus(params: {
        ticketId: string;
        newStatus: 'WAITING' | 'SERVING' | 'SKIPPED' | 'COMPLETED';
        adminId: string;
    }): Promise<{ success: boolean; error?: string }> {
        const updates: Record<string, any> = { status: params.newStatus };
        if (params.newStatus === 'COMPLETED') {
            updates.completed_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('queue_transactions')
            .update(updates)
            .eq('ticket_id', params.ticketId);

        if (error) {
            console.error('[adminService] overrideQueueStatus error:', error);
            return { success: false, error: error.message };
        }

        await logAdminAction({
            adminId: params.adminId,
            action: `Override queue status for ticket ${params.ticketId} → ${params.newStatus}`,
            resourceType: 'queue_transactions',
            resourceId: params.ticketId,
            metadata: { new_status: params.newStatus },
        });

        return { success: true };
    },

    async resetQueue(adminId: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('queue_transactions')
            .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
            .in('status', ['WAITING', 'SERVING', 'SKIPPED']);

        if (error) {
            console.error('[adminService] resetQueue error:', error);
            return { success: false, error: error.message };
        }

        await logAdminAction({
            adminId,
            action: 'Emergency queue reset — all active tickets completed',
            resourceType: 'queue_transactions',
            metadata: {},
        });

        return { success: true };
    },

    subscribeToQueueChanges(onUpdate: () => void): () => void {
        const channel = supabase
            .channel('admin_queue_watch')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_transactions' }, onUpdate)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    },

    // ── Medical Records ───────────────────────────────────────────────────────

    async fetchAllMedicalRecords() {
        const { data, error } = await supabase
            .from('medical_records')
            .select(`
                *,
                patient:users!medical_records_patient_id_fkey(first_name, last_name),
                doctor:users!medical_records_doctor_id_fkey(first_name, last_name)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[adminService] fetchAllMedicalRecords error:', error);
            return [];
        }

        return (data ?? []).map((r: any) => ({
            id: r.id,
            patientName: r.patient ? `${r.patient.first_name} ${r.patient.last_name}` : 'Unknown Patient',
            patientId: r.patient_id,
            doctorName: r.doctor ? `Dr. ${r.doctor.first_name} ${r.doctor.last_name}` : 'Unknown Doctor',
            date: r.created_at ? r.created_at.split('T')[0] : '',
            diagnosis: r.diagnosis ?? '',
            title: r.title ?? '',
            description: r.description ?? '',
            notes: r.description ?? '',
        }));
    },

    async fetchAllPrescriptions() {
        const { data, error } = await supabase
            .from('prescriptions')
            .select(`
                *,
                patient:users!prescriptions_patient_id_fkey(first_name, last_name),
                doctor:users!prescriptions_doctor_id_fkey(first_name, last_name)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[adminService] fetchAllPrescriptions error:', error);
            return [];
        }

        return (data ?? []).map((p: any) => ({
            id: p.id,
            patientName: p.patient ? `${p.patient.first_name} ${p.patient.last_name}` : 'Unknown',
            patientId: p.patient_id,
            doctorName: p.doctor ? `Dr. ${p.doctor.first_name} ${p.doctor.last_name}` : 'Unknown',
            date: p.created_at ? p.created_at.split('T')[0] : '',
            medicines: (p.medications ?? []).map((m: any) =>
                `${m.name} ${m.dosage} – ${m.frequency}${m.duration ? ` x ${m.duration}` : ''}`
            ),
            status: 'Active' as const,
        }));
    },

    // ── Notifications (Admin Broadcast) ───────────────────────────────────────

    async fetchAllNotifications(): Promise<AdminNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[adminService] fetchAllNotifications error:', error);
            return [];
        }
        return (data ?? []) as AdminNotification[];
    },

    async broadcastNotification(params: {
        title: string;
        message: string;
        type: string;
        adminId: string;
    }): Promise<{ success: boolean; count: number; error?: string }> {
        // Fetch all user ids
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id');

        if (usersError || !users) {
            return { success: false, count: 0, error: usersError?.message ?? 'Could not fetch users' };
        }

        const now = new Date().toISOString();
        const rows = users.map((u: any) => ({
            user_id: u.id,
            title: params.title,
            message: params.message,
            type: params.type,
            is_read: false,
            related_id: null,
            created_at: now,
        }));

        const { error: insertError } = await supabase.from('notifications').insert(rows);

        if (insertError) {
            console.error('[adminService] broadcastNotification error:', insertError);
            return { success: false, count: 0, error: insertError.message };
        }

        await logAdminAction({
            adminId: params.adminId,
            action: `Broadcast notification: "${params.title}"`,
            resourceType: 'notifications',
            metadata: { recipient_count: users.length, message: params.message },
        });

        return { success: true, count: users.length };
    },

    // ── Audit Logs ────────────────────────────────────────────────────────────

    async fetchAdminLogs(): Promise<AdminLog[]> {
        const { data, error } = await supabase
            .from('admin_logs')
            .select(`
                *,
                admin:users!admin_logs_admin_id_fkey(first_name, last_name)
            `)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) {
            console.error('[adminService] fetchAdminLogs error:', error);
            return [];
        }

        return (data ?? []).map(mapAdminLog);
    },

    /**
     * Fetches audit logs scoped to the inventory resource, with optional filters.
     * Supports filtering by action type (CREATE/UPDATE/DELETE), date range, and user.
     */
    async fetchInventoryAuditLogs(filters?: InventoryAuditFilters): Promise<AdminLog[]> {
        let query = supabase
            .from('admin_logs')
            .select(`
                *,
                admin:users!admin_logs_admin_id_fkey(first_name, last_name)
            `)
            .eq('resource_type', 'inventory')
            .order('created_at', { ascending: false })
            .limit(500);

        if (filters?.action) {
            // action column starts with CREATE / UPDATE / DELETE
            query = query.ilike('action', `${filters.action}%`);
        }
        if (filters?.fromDate) {
            query = query.gte('created_at', filters.fromDate);
        }
        if (filters?.toDate) {
            query = query.lte('created_at', filters.toDate);
        }
        if (filters?.userId) {
            query = query.eq('admin_id', filters.userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[adminService] fetchInventoryAuditLogs error:', error);
            return [];
        }

        return (data ?? []).map(mapAdminLog);
    },

    /**
     * Fetches audit logs scoped to the queue_transactions resource, with optional filters.
     * Supports filtering by action type, date range, and user.
     */
    async fetchQueueAuditLogs(filters?: InventoryAuditFilters): Promise<AdminLog[]> {
        let query = supabase
            .from('admin_logs')
            .select(`
                *,
                admin:users!admin_logs_admin_id_fkey(first_name, last_name)
            `)
            .eq('resource_type', 'queue_transactions')
            .order('created_at', { ascending: false })
            .limit(500);

        if (filters?.action) {
            query = query.ilike('action', `${filters.action}%`);
        }
        if (filters?.fromDate) {
            query = query.gte('created_at', filters.fromDate);
        }
        if (filters?.toDate) {
            query = query.lte('created_at', filters.toDate);
        }
        if (filters?.userId) {
            query = query.eq('admin_id', filters.userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[adminService] fetchQueueAuditLogs error:', error);
            return [];
        }

        return (data ?? []).map(mapAdminLog);
    },

    subscribeToAdminLogs(onUpdate: () => void): () => void {
        const channel = supabase
            .channel('admin_logs_watch')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' }, onUpdate)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    },

    // ── Feature Toggles ───────────────────────────────────────────────────────

    /**
     * Fetches the current enabled/disabled state for all system features.
     * Returns a map keyed by feature name for easy lookup.
     */
    async fetchFeatureToggles(): Promise<Record<FeatureName, FeatureToggle>> {
        const { data, error } = await supabase
            .from('feature_toggles')
            .select('*');

        if (error) {
            console.error('[adminService] fetchFeatureToggles error:', error);
            // Return safe defaults (all enabled) on error
            return {
                login: { feature: 'login', is_enabled: true, updated_by: null, updated_at: new Date().toISOString() },
                chat: { feature: 'chat', is_enabled: true, updated_by: null, updated_at: new Date().toISOString() },
                queue: { feature: 'queue', is_enabled: true, updated_by: null, updated_at: new Date().toISOString() },
            };
        }

        const map = {} as Record<FeatureName, FeatureToggle>;
        for (const row of (data ?? [])) {
            map[row.feature as FeatureName] = row as FeatureToggle;
        }
        return map;
    },

    /**
     * Enables or disables a single system feature atomically.
     * Writes an audit log entry on every change.
     *
     * @param feature   - The feature to toggle ('login' | 'chat' | 'queue')
     * @param enabled   - The desired new state
     * @param adminId   - The system_admin performing the action
     */
    async setFeatureToggle(params: {
        feature: FeatureName;
        enabled: boolean;
        adminId: string;
    }): Promise<{ success: boolean; error?: string }> {
        const now = new Date().toISOString();

        const { error } = await supabase
            .from('feature_toggles')
            .update({
                is_enabled: params.enabled,
                updated_by: params.adminId,
                updated_at: now,
            })
            .eq('feature', params.feature);

        if (error) {
            console.error('[adminService] setFeatureToggle error:', error);
            return { success: false, error: error.message };
        }

        const action = params.enabled ? 'enable' : 'disable';

        await logAdminAction({
            adminId: params.adminId,
            action: `FEATURE_TOGGLE: ${action} feature=${params.feature}`,
            resourceType: 'feature_toggles',
            resourceId: params.feature,
            metadata: {
                feature: params.feature,
                action,
                timestamp: now,
            },
            newValue: { feature: params.feature, is_enabled: params.enabled },
        });

        return { success: true };
    },

    /**
     * Subscribes to real-time changes on the feature_toggles table.
     * Triggers the callback immediately whenever any toggle is updated.
     */
    subscribeToFeatureToggles(onUpdate: () => void): () => void {
        const channel = supabase
            .channel('feature_toggles_watch')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'feature_toggles' }, onUpdate)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    },

    // ── Patient Account Deletion ───────────────────────────────────────────────
    // Deletion has been restricted. Admins should use Deactivate functionality instead.

};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapQueueStatus(dbStatus: string): string {
    switch (dbStatus?.toUpperCase()) {
        case 'WAITING': return 'Waiting';
        case 'SERVING': return 'In Progress';
        case 'COMPLETED': return 'Completed';
        case 'SKIPPED': return 'Skipped';
        default: return 'Waiting';
    }
}

function mapAdminLog(log: any): AdminLog {
    return {
        id: log.id,
        admin_id: log.admin_id,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        metadata: log.metadata,
        old_value: log.old_value ?? null,
        new_value: log.new_value ?? null,
        performed_by_role: log.performed_by_role ?? null,
        created_at: log.created_at,
        admin_name: log.admin
            ? `${log.admin.first_name} ${log.admin.last_name}`
            : 'Admin',
    };
}
