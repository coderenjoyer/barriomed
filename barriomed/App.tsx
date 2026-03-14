import './global.css';
import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { LoginPage, UserRole } from './login/loginscreen';
import { UserDashboard } from './mobile/userdashboard';
import { StaffNavigator } from './components/staff/StaffNavigator';
import { DoctorDashboard } from './mobile/doctordashboard';
import { AdminDashboard } from './web/admin/admindashboard';
import { AuthProvider, useAuth } from './lib/AuthContext';

// ---------------------------------------------------------------------------
// Inner app – has access to useAuth()
// ---------------------------------------------------------------------------
function AppContent() {
  const { signOut, isLoading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = async () => {
    await signOut();
    setUserRole(null);
  };

  // Show a loading spinner while the auth session is being restored
  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const renderDashboard = () => {
    switch (userRole) {
      case 'staff':
        return (
          <NavigationContainer>
            <StaffNavigator onLogout={handleLogout} />
          </NavigationContainer>
        );
      case 'patient':
        return <UserDashboard onLogout={handleLogout} />;
      case 'doctor':
        return <DoctorDashboard onLogout={handleLogout} />;
      case 'admin':
        return <AdminDashboard onLogout={handleLogout} onSetUserRole={setUserRole} />;
      default:
        return <LoginPage onLoginComplete={handleLogin} />;
    }
  };

  return (
    <SafeAreaProvider style={styles.container}>
      {!userRole ? (
        <LoginPage onLoginComplete={handleLogin} />
      ) : (
        <SafeAreaView style={{ flex: 1, backgroundColor: userRole === 'staff' ? '#0F766E' : '#FFFFFF' }} edges={['top', 'left', 'right']}>
          {renderDashboard()}
        </SafeAreaView>
      )}
      <StatusBar style={userRole === 'staff' ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

// ---------------------------------------------------------------------------
// Root – wraps everything with AuthProvider
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
  },
});
