import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ScrollView,
    SafeAreaView,
    TouchableOpacity
} from 'react-native';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../src/theme';
import { AppHeader, AppInput, AppButton } from '../src/components/UI';

export default function SignUpScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('client');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSignUp = async () => {
        if (!email || !password || !name || !phone) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            if (data.user) {
                const { error: profileError } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: data.user.id,
                            name,
                            phone,
                            role,
                            is_available: role === 'technician' ? true : null
                        }
                    ]);

                if (profileError) throw profileError;

                Alert.alert('Success', 'Account created successfully!');
                login(data.user, role);

                if (role === 'client') {
                    navigation.navigate('ClientDashboard');
                } else {
                    navigation.navigate('TechnicianDashboard');
                }
            }
        } catch (error) {
            Alert.alert('Sign Up Failed', error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Create Account" showBack onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.formSection}>
                    <AppInput
                        label="Full Name"
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                    />
                    <AppInput
                        label="Email Address"
                        placeholder="@example.com"
                        value={email}
                        onChangeText={setEmail}
                    />
                    <AppInput
                        label="Phone Number"
                        placeholder="+1 234 567 890"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <AppInput
                        label="Password"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Text style={styles.label}>REGISTER AS</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleButton, role === 'client' && styles.activeRole]}
                            onPress={() => setRole('client')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.roleText, role === 'client' && styles.activeRoleText]}>Client</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleButton, role === 'technician' && styles.activeRole]}
                            onPress={() => setRole('technician')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.roleText, role === 'technician' && styles.activeRoleText]}>Technician</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: 10 }}>
                        <AppButton
                            title="Create Account"
                            onPress={handleSignUp}
                            loading={loading}
                        />

                        <AppButton
                            title="Already have an account? Login"
                            onPress={() => navigation.navigate('Login')}
                            variant="outline"
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    formSection: {
        marginTop: 10,
    },
    label: {
        ...theme.typography.label,
        color: theme.colors.textSecondary,
        marginBottom: 12,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    roleButton: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    activeRole: {
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.accent + '10',
    },
    roleText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    activeRoleText: {
        color: theme.colors.accent,
    },
});
