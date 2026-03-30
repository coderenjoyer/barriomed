import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { DataMaintenance } from './datamaintenance';
import { SystemConfig } from './sysconfig';
import { UserManagement } from './usermanagement';
import { InventoryOversight } from './inventoryoversight';
import { QueueOversight } from './queueoversight';
import { MedicalDataOversight } from './medicaldataoversight';
import { useAuth } from '../../lib/AuthContext';

import { UserRole } from '../../login/loginscreen';

// ─── Platform Guard ─────────────────────────────────────────────────────────
// If accessed from a non-web environment, render a block screen instead of
// exposing any admin UI.
if (Platform.OS !== 'web') {
  console.warn('[AdminDashboard] Access attempted from non-web platform. Rendering access denied.');
}

interface AdminDashboardProps {
  onLogout: () => void;
  onSetUserRole: (role: UserRole) => void;
}

type TabId = 'users' | 'inventory' | 'queue' | 'records' | 'sysconfig' | 'data';

const NAV_ITEMS: {
  id: TabId;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  badge?: string;
}[] = [
  {
    id: 'users',
    label: 'User Management',
    icon: (active) => <Feather name="users" size={18} color={active ? '#0D9488' : '#6B7280'} />,
  },
  {
    id: 'inventory',
    label: 'Inventory Oversight',
    icon: (active) => <Feather name="package" size={18} color={active ? '#0D9488' : '#6B7280'} />,
  },
  {
    id: 'queue',
    label: 'Queue Oversight',
    icon: (active) => <Feather name="list" size={18} color={active ? '#0D9488' : '#6B7280'} />,
  },
  {
    id: 'records',
    label: 'Medical Records',
    icon: (active) => <FontAwesome5 name="notes-medical" size={16} color={active ? '#0D9488' : '#6B7280'} />,
  },
  {
    id: 'sysconfig',
    label: 'Logs & Notifications',
    icon: (active) => <Feather name="terminal" size={18} color={active ? '#0D9488' : '#6B7280'} />,
  },
  {
    id: 'data',
    label: 'Data Maintenance',
    icon: (active) => <Feather name="database" size={18} color={active ? '#0D9488' : '#6B7280'} />,
  },
];

// ─── Mobile Block Screen ─────────────────────────────────────────────────────
function MobileAccessDenied() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F0FDFA' }}>
      <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <MaterialCommunityIcons name="shield-lock-outline" size={40} color="#EF4444" />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
        Web Access Only
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, maxWidth: 300 }}>
        The System Administrator portal is restricted to web browsers only. Mobile access is not permitted.
      </Text>
      <View style={{ marginTop: 24, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 }}>
        <Text style={{ fontSize: 12, color: '#991B1B', textAlign: 'center', fontWeight: '600' }}>
          Please use a desktop or laptop browser to access the admin portal.
        </Text>
      </View>
    </View>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export function AdminDashboard({ onLogout, onSetUserRole }: AdminDashboardProps) {
  // Hard block on non-web platforms
  if (Platform.OS !== 'web') {
    return <MobileAccessDenied />;
  }

  const { userProfile } = useAuth();
  const adminDisplayName = userProfile
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : 'System Administrator';

  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case 'users':     return <UserManagement />;
      case 'inventory': return <InventoryOversight />;
      case 'queue':     return <QueueOversight />;
      case 'records':   return <MedicalDataOversight />;
      case 'sysconfig': return <SystemConfig />;
      case 'data':      return <DataMaintenance />;
      default:          return <UserManagement />;
    }
  };

  return (
    <View className="flex-1 flex-row bg-white h-full relative">
      {/* ── Sidebar ── */}
      {isSidebarOpen && (
        <View className="w-64 bg-white border-r border-gray-200 flex-col h-full shadow-sm z-20">
          {/* Brand */}
          <View className="p-5 border-b border-gray-100">
            <View className="flex-row items-center gap-3 mb-1">
              <View className="w-9 h-9 rounded-xl bg-teal-600 items-center justify-center shadow-sm">
                <MaterialCommunityIcons name="shield-check-outline" size={20} color="white" />
              </View>
              <View>
                <Text className="font-bold text-base text-gray-900">Admin Portal</Text>
                <Text className="text-xs text-teal-600 font-semibold">System Administrator</Text>
              </View>
            </View>
          </View>

          {/* Nav Items */}
          <ScrollView className="flex-1 py-3" showsVerticalScrollIndicator={false}>
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest px-5 mb-2 mt-1">
              Modules
            </Text>
            <View className="px-3 gap-1">
              {NAV_ITEMS.map((item) => {
                const active = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setActiveTab(item.id)}
                    className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl ${
                      active ? 'bg-teal-50 border border-teal-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    {item.icon(active)}
                    <Text className={`text-sm font-semibold ${active ? 'text-teal-700' : 'text-gray-600'}`}>
                      {item.label}
                    </Text>
                    {active && (
                      <View className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer: Logout */}
          <View className="p-4 border-t border-gray-100">
            <TouchableOpacity
              onPress={onLogout}
              className="flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100"
            >
              <Feather name="log-out" size={16} color="#E11D48" />
              <Text className="text-rose-600 font-bold text-sm">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Main Content ── */}
      <View className="flex-1 flex-col h-full overflow-hidden relative">
        {/* Decorative Background Elements */}
        <View style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 9999, backgroundColor: '#CCFBF1', opacity: 0.4 }} pointerEvents="none" />
        <View style={{ position: 'absolute', bottom: -50, left: -50, width: 250, height: 250, borderRadius: 9999, backgroundColor: '#EFF6FF', opacity: 0.4 }} pointerEvents="none" />
        
        {/* Top Bar */}
        <View className="h-14 bg-white border-b border-gray-200 flex-row items-center px-4 justify-between z-10 shadow-sm">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setIsSidebarOpen(v => !v)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200"
            >
              <Feather name="menu" size={18} color="#374151" />
            </TouchableOpacity>
            <Text className="font-bold text-gray-700 text-sm">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label ?? 'Dashboard'}
            </Text>
          </View>

          {/* Right: access info */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-full">
              <View className="w-2 h-2 rounded-full bg-teal-500" />
              <Text className="text-xs font-bold text-teal-700">{adminDisplayName}</Text>
            </View>
          </View>
        </View>

        {/* Content Area */}
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
          {renderContent()}
        </ScrollView>
      </View>
    </View>
  );
}
