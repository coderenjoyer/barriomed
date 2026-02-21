import './global.css';
import React, { useState } from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { LoginPage, UserRole } from './login/loginscreen';
import { UserDashboard } from './mobile/userdashboard';
import { StaffNavigator } from './components/staff/StaffNavigator';

// Placeholder Components for other roles
const DoctorDashboard = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.center}>
    <Text>Doctor Dashboard (Placeholder)</Text>
    <Button title="Logout" onPress={onLogout} />
  </View>
);

const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.center}>
    <Text>Admin Dashboard (Placeholder)</Text>
    <Button title="Logout" onPress={onLogout} />
  </View>
);

export default function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

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
        return <AdminDashboard onLogout={handleLogout} />;
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
      <StatusBar style={userRole === 'staff' ? 'light' : 'dark'} onPress={() => { }} />
    </SafeAreaProvider>
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
  },
});
