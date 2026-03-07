import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen.jsx';
import ReportLeakScreen from '../screens/ReportLeakScreen.jsx';
import WaitingScreen from '../screens/WaitingScreen.jsx';
import TechnicianDashboard from '../screens/TechnicianDashboard.jsx';
import JobDetailScreen from '../screens/JobDetailScreen.jsx';
import SignUpScreen from '../screens/SignUpScreen.jsx';

const Stack = createStackNavigator();

const LogoutButton = () => {
    const { logout } = useAuth();
    return (
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
    );
};

export default function AppNavigator() {
    const { user, userRole } = useAuth();

    return (
        <Stack.Navigator
            screenOptions={{
                headerTitle: ' WaterLeak',
                headerTitleAlign: 'center',
                headerStyle: {
                    backgroundColor: '#007bff',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            {!user ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login', headerShown: false }} />
                    <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Sign Up', headerShown: false }} />
                </>
            ) : (
                <>
                    {userRole === 'client' ? (
                        <>
                            <Stack.Screen
                                name="ReportLeak"
                                component={ReportLeakScreen}
                                options={{
                                    title: 'Report Leak',
                                    headerRight: () => <LogoutButton />
                                }}
                            />
                            <Stack.Screen name="Waiting" component={WaitingScreen} options={{ title: 'Waiting' }} />
                        </>
                    ) : (
                        <>
                            <Stack.Screen
                                name="TechnicianDashboard"
                                component={TechnicianDashboard}
                                options={{
                                    title: 'Dashboard',
                                    headerRight: () => <LogoutButton />
                                }}
                            />
                            <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Details' }} />
                        </>
                    )}
                </>
            )}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    logoutButton: {
        marginRight: 15,
        padding: 5,
    },
    logoutText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
