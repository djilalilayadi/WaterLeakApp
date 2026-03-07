import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, ScrollView } from 'react-native';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../src/theme';
import { AppButton, AppInput } from '../src/components/UI';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw new Error('Could not retrieve user profile');
        }

        const role = profile.role;
        login(data.user, role);

        if (role === 'client') {
          navigation.navigate('ReportLeak');
        } else if (role === 'technician') {
          navigation.navigate('TechnicianDashboard');
        } else {
          Alert.alert('Error', 'Unknown user role');
        }
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>💧</Text>
          </View>
          <Text style={styles.title}>WaterLeak</Text>
          <Text style={styles.tagline}>Professional leak response</Text>
        </View>

        <View style={styles.formSection}>
          <AppInput
            label="Email Address"
            placeholder="name@company.com"
            value={email}
            onChangeText={setEmail}
          />
          <AppInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={{ marginTop: 10 }}>
            <AppButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
            />

            <AppButton
              title="Don't have an account? Sign Up"
              onPress={() => navigation.navigate('SignUp')}
              variant="outline"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  logoSection: {
    height: '35%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 32,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  tagline: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  formSection: {
    flex: 1,
    marginTop: 20,
  },
});
