import React, { useState } from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginPage, UserRole } from './login/loginscreen';
import { UserDashboard } from './mobile/userdashboard';

// Placeholder Components for other roles
const DoctorDashboard = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.center}>
    <Text>Doctor Dashboard (Placeholder)</Text>
    <Button title="Logout" onPress={onLogout} />
  </View>
);

const StaffDashboard = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.center}>
    <Text>Staff Dashboard (Placeholder)</Text>
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
      case 'patient':
        return <UserDashboard onLogout={handleLogout} />;
      case 'doctor':
        return <DoctorDashboard onLogout={handleLogout} />;
      case 'staff':
        return <StaffDashboard onLogout={handleLogout} />;
      case 'admin':
        return <AdminDashboard onLogout={handleLogout} />;
      default:
        return <LoginPage onLoginComplete={handleLogin} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {!userRole ? (
          <LoginPage onLoginComplete={handleLogin} />
        ) : (
          renderDashboard()
        )}
        <StatusBar style="auto" />
      </View>
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
