import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { registerRootComponent } from 'expo';

import { theme } from './src/theme';

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
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}

registerRootComponent(App);
