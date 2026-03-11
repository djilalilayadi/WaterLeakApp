import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import AppNavigator from './navigation/AppNavigator';
import { registerRootComponent } from 'expo';
import { theme } from './src/theme';
import NotificationBanner from './components/NotificationBanner';

const navigationRef = createNavigationContainerRef();

function GlobalNotificationBanner() {
  const { notifications, clearNotification } = useNotifications();
  return (
    <NotificationBanner
      notifications={notifications}
      clearNotification={clearNotification}
    />
  );
}

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background
      }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return <AppNavigator />;
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <NavigationContainer ref={navigationRef}>
          <GlobalNotificationBanner />
          <AppContent />
        </NavigationContainer>
      </NotificationProvider>
    </AuthProvider>
  );
}

registerRootComponent(App);
