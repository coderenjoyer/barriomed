import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { DataMaintenance } from './datamaintenance';
import { SystemConfig } from './sysconfig';
import { UserManagement } from './usermanagement';

import { UserRole } from '../../login/loginscreen';

interface AdminDashboardProps {
  onLogout: () => void;
  onSetUserRole: (role: UserRole) => void;
}

export function AdminDashboard({ onLogout, onSetUserRole }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'sysconfig' | 'data'>('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(Platform.OS === 'web');

  const navItems = [
    {
      id: 'users',
      label: 'User Management',
      icon: <Feather name="users" size={20} color={activeTab === 'users' ? '#0D9488' : '#6B7280'} />
    },
    {
      id: 'sysconfig',
      label: 'System Config',
      icon: <Feather name="settings" size={20} color={activeTab === 'sysconfig' ? '#0D9488' : '#6B7280'} />
    },
    {
      id: 'data',
      label: 'Data Sync & Maintenance',
      icon: <Feather name="database" size={20} color={activeTab === 'data' ? '#0D9488' : '#6B7280'} />
    }
  ] as const;

  const renderContent = () => {
    switch(activeTab) {
      case 'users':
        return <UserManagement />;
      case 'sysconfig':
        return <SystemConfig />;
      case 'data':
        return <DataMaintenance />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <View className="flex-1 flex-row bg-gray-50 h-full">
      {/* Sidebar for Web / Larger Screens */}
      {isSidebarOpen && (
        <View className={`w-64 bg-white border-r border-gray-200 flex-col h-full shadow-sm z-20 ${Platform.OS === 'web' ? '' : 'absolute top-0 left-0'}`}>
          <View className="p-6 border-b border-gray-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-lg bg-teal-100 items-center justify-center">
                <MaterialCommunityIcons name="shield-check-outline" size={20} color="#0D9488" />
              </View>
              <Text className="font-bold text-lg text-gray-900 tracking-tight">Admin Portal</Text>
            </View>
            {Platform.OS !== 'web' && (
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                <Feather name="x" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView className="flex-1 py-4">
            <View className="px-4 space-y-1 gap-2">
              {navItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setActiveTab(item.id);
                    if (Platform.OS !== 'web') setIsSidebarOpen(false);
                  }}
                  className={`flex-row items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === item.id 
                      ? 'bg-teal-50 border border-teal-100' 
                      : 'hover:bg-gray-50 bg-white'
                  }`}
                >
                  {item.icon}
                  <Text className={`font-medium ${activeTab === item.id ? 'text-teal-700' : 'text-gray-600'}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={onLogout}
              className="flex-row items-center gap-3 px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 transition-colors shadow-lg"
            >
              <Feather name="log-out" size={20} color="white" />
              <Text className="text-white font-medium">System Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Content Area */}
      <View className="flex-1 flex-col h-full">
        {/* Mobile Header overlay */}
        {!isSidebarOpen && Platform.OS !== 'web' && (
           <View className="h-14 bg-white border-b border-gray-200 flex-row items-center px-4 justify-between z-10 shadow-sm">
             <TouchableOpacity 
                onPress={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg bg-gray-50 active:bg-gray-100"
             >
               <Feather name="menu" size={24} color="#374151" />
             </TouchableOpacity>
             <Text className="font-bold text-gray-900">Admin Portal</Text>
           </View>
        )}
        
        <View className="flex-1 bg-gray-50/50 p-4 md:p-8">
            {renderContent()}
        </View>
      </View>
    </View>
  );
}
