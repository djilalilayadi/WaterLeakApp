import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    Animated,
    SafeAreaView
} from 'react-native';
import supabase from '../lib/supabase';
import { theme } from '../src/theme';
import { AppButton } from '../src/components/UI';
import { useNotifications } from '../context/NotificationContext';

export default function WaitingScreen({ route, navigation }) {
    const { requestId } = route.params;
    const [status, setStatus] = useState('pending');
    const [technicianName, setTechnicianName] = useState(null);
    const [price, setPrice] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const { addNotification } = useNotifications();
    const lastNotifiedStatusRef = useRef(null);

    // Animation ref
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Start pulsing animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 750,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 750,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Timer for elapsed time
        const timer = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);

        // Fetch initial status
        const fetchRequestStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('leak_requests')
                    .select('status, price, users:technician_id(name)')
                    .eq('id', requestId)
                    .single();

                if (error) throw error;

                if (data) {
                    setStatus(data.status);
                    setPrice(data.price ?? null);
                    if (data.status === 'assigned' && data.users) {
                        setTechnicianName(data.users.name);
                    }
                }
            } catch (error) {
                console.error('Error fetching initial status:', error);
            }
        };

        fetchRequestStatus();

        // Realtime subscription
        const channel = supabase
            .channel(`public:leak_requests:id=eq.${requestId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'leak_requests',
                    filter: `id=eq.${requestId}`,
                },
                async (payload) => {
                    const newStatus = payload.new.status;
                    setStatus(newStatus);
                    if (payload?.new?.price !== undefined) {
                        setPrice(payload.new.price ?? null);
                    }

                    if (lastNotifiedStatusRef.current !== newStatus) {
                        if (newStatus === 'assigned') {
                            addNotification("Technician Found! 🔧", "A technician is on the way", "success");
                        } else if (newStatus === 'in_progress') {
                            addNotification("Technician Arrived 📍", "Your technician is at your location", "info");
                        } else if (newStatus === 'done') {
                            addNotification("Job Complete ✅", "Your leak has been fixed!", "success");
                        }
                        lastNotifiedStatusRef.current = newStatus;
                    }

                    if (newStatus === 'assigned') {
                        const { data } = await supabase
                            .from('leak_requests')
                            .select('price, users:technician_id(name)')
                            .eq('id', requestId)
                            .single();

                        if (data?.users) {
                            setTechnicianName(data.users.name);
                        }
                        if (data?.price !== undefined) {
                            setPrice(data.price ?? null);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            clearInterval(timer);
        };
    }, [requestId, addNotification]);

    const handleCancel = async () => {
        Alert.alert(
            'Cancel Request',
            'Are you sure you want to cancel this leak report?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('leak_requests')
                                .update({ status: 'cancelled' })
                                .eq('id', requestId);

                            if (error) throw error;
                            navigation.navigate('ReportLeak');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to cancel request');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.centerContent}>
                <Animated.View
                    style={[
                        styles.pulseCircle,
                        { transform: [{ scale: pulseAnim }] }
                    ]}
                />

                <View style={styles.textSection}>
                    {status === 'pending' || status === 'looking' ? (
                        <>
                            <Text style={styles.title}>Finding nearest technician...</Text>
                            <Text style={styles.timerText}>
                                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')} elapsed
                            </Text>
                        </>
                    ) : status === 'assigned' ? (
                        <>
                            <Text style={[styles.title, { color: theme.colors.success }]}>Technician Found!</Text>
                            <Text style={styles.techName}>{technicianName || 'Technician'}</Text>
                            {price !== null && (
                                <>
                                    <Text style={styles.priceText}>
                                        Agreed payment: {Number(price).toLocaleString()} DZD
                                    </Text>
                                    <Text style={styles.captionText}>Pay your technician upon arrival</Text>
                                </>
                            )}
                            <Text style={styles.subtitle}>Professional is on the way to your location.</Text>
                        </>
                    ) : (
                        <Text style={styles.title}>Status: {status}</Text>
                    )}
                </View>
            </View>

            <View style={styles.footer}>
                <AppButton
                    title="Cancel Request"
                    onPress={handleCancel}
                    variant="outline"
                />

                <View style={{ height: 12 }} />

                <AppButton
                    title="Back Home"
                    onPress={() => navigation.navigate('ClientDashboard')}
                    variant="primary"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    pulseCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.accent,
        opacity: 0.15,
        position: 'absolute',
    },
    textSection: {
        alignItems: 'center',
    },
    title: {
        ...theme.typography.h2,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    timerText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    techName: {
        ...theme.typography.h1,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    priceText: {
        ...theme.typography.body,
        color: theme.colors.success,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
    },
    captionText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 10,
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
    },
});
