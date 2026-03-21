import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StockStatus = 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK';

export interface InventoryItem {
    item_id: string;
    generic_name: string;
    brand_name?: string;
    category: string;
    stock_status: StockStatus;
    last_updated: string;
    updated_by?: string;
}

const INVENTORY_CACHE_KEY = 'barriomed_inventory_cache';
const INVENTORY_TIMESTAMP_KEY = 'barriomed_inventory_timestamp';

export const inventoryService = {
    /**
     * Fetch inventory from Supabase.
     * If offline, loads from AsyncStorage cache.
     */
    async fetchInventory(): Promise<{ data: InventoryItem[]; lastUpdated: string | null; offline: boolean }> {
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('category', { ascending: true })
                .order('generic_name', { ascending: true });

            if (error) throw error;

            const items: InventoryItem[] = data;
            const now = new Date().toISOString();

            // Save to cache
            await AsyncStorage.setItem(INVENTORY_CACHE_KEY, JSON.stringify(items));
            await AsyncStorage.setItem(INVENTORY_TIMESTAMP_KEY, now);

            return { data: items, lastUpdated: now, offline: false };
        } catch (error) {
            console.warn('Network error, loading inventory from cache.', error);

            // Load from cache if offline
            const cachedData = await AsyncStorage.getItem(INVENTORY_CACHE_KEY);
            const cachedTime = await AsyncStorage.getItem(INVENTORY_TIMESTAMP_KEY);

            if (cachedData) {
                return {
                    data: JSON.parse(cachedData),
                    lastUpdated: cachedTime,
                    offline: true,
                };
            }

            // Return empty if no cache exists
            return { data: [], lastUpdated: null, offline: true };
        }
    },

    /**
     * Staff only: Update the stock status of a single item
     */
    async updateStockStatus(item_id: string, status: StockStatus): Promise<boolean> {
        const { error } = await supabase
            .from('inventory')
            .update({ stock_status: status })
            .eq('item_id', item_id);

        if (error) {
            console.error('Failed to update stock status:', error);
            return false;
        }

        return true;
    },

    /**
     * Staff only: Mark all items as AVAILABLE
     */
    async markAllAvailable(): Promise<boolean> {
        const { error } = await supabase
            .from('inventory')
            .update({ stock_status: 'AVAILABLE' })
            .not('stock_status', 'eq', 'AVAILABLE');

        if (error) {
            console.error('Failed to mark all as available:', error);
            return false;
        }

        return true;
    },

    /**
     * Staff only: Create new inventory item
     */
    async createInventoryItem(item: Partial<InventoryItem>): Promise<boolean> {
        const { error } = await supabase
            .from('inventory')
            .insert([item]);

        if (error) {
            console.error('Failed to create inventory item:', error);
            return false;
        }

        return true;
    },

    /**
     * Staff only: Update full inventory item details
     */
    async updateInventoryItem(item_id: string, updates: Partial<InventoryItem>): Promise<boolean> {
        const { error } = await supabase
            .from('inventory')
            .update(updates)
            .eq('item_id', item_id);

        if (error) {
            console.error('Failed to update inventory item:', error);
            return false;
        }

        return true;
    },

    /**
     * Staff only: Delete an inventory item
     */
    async deleteInventoryItem(item_id: string): Promise<boolean> {
        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('item_id', item_id);

        if (error) {
            console.error('Failed to delete inventory item:', error);
            return false;
        }

        return true;
    },

    /**
     * Subscribe to realtime 'inventory' table updates
     */
    subscribeToInventoryChanges(onUpdate: (payload: any) => void) {
        const channel = supabase
            .channel('public:inventory')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'inventory' },
                (payload) => {
                    onUpdate(payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};
