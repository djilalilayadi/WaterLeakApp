import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    Alert,
    Linking,
    SafeAreaView
} from 'react-native';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../src/theme';
import { AppHeader, AppCard, StatusBadge, AppButton } from '../src/components/UI';

export default function JobDetailScreen({ route, navigation }) {
    const { job } = route.params;
    const [loading, setLoading] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(job.status);
    const { userId } = useAuth();

    const handleAcceptJob = async () => {
        setLoading(true);
        try {
            const { error: requestError } = await supabase
                .from('leak_requests')
                .update({
                    status: 'assigned',
                    technician_id: userId
                })
                .eq('id', job.id);

            if (requestError) throw requestError;

            await supabase
                .from('users')
                .update({ is_available: false })
                .eq('id', userId);

            setCurrentStatus('assigned');
            Alert.alert('Job Accepted', 'Opening navigation to client...');

            const lat = job.client_lat;
            const lng = job.client_lng;
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open navigation app');
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to accept job: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsDone = async () => {
        setLoading(true);
        try {
            const { error: requestError } = await supabase
                .from('leak_requests')
                .update({ status: 'done' })
                .eq('id', job.id);

            if (requestError) throw requestError;

            await supabase
                .from('users')
                .update({ is_available: true })
                .eq('id', userId);

            setCurrentStatus('done');
            Alert.alert('Success', 'Job marked as completed!');
            navigation.goBack();

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update job status');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Job Details" showBack onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Image
                    source={{ uri: job.photo_url }}
                    style={styles.fullImage}
                />

                <AppCard style={styles.card}>
                    <View style={styles.cardHeader}>
                        <StatusBadge status={currentStatus} />
                        <Text style={styles.distanceText}>
                            {job.distance ? `${job.distance.toFixed(2)} km away` : 'Distance unknown'}
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>REPORTED ISSUE</Text>
                    <Text style={styles.description}>{job.description}</Text>
                </AppCard>

                <View style={styles.buttonGroup}>
                    {currentStatus === 'pending' && (
                        <AppButton
                            title="Accept Job"
                            onPress={handleAcceptJob}
                            loading={loading}
                        />
                    )}

                    <AppButton
                        title="Mark as Done"
                        onPress={handleMarkAsDone}
                        variant="outline"
                        loading={loading}
                        disabled={currentStatus !== 'assigned'}
                    />

                    {currentStatus === 'assigned' && (
                        <AppButton
                            title="Navigate to Client"
                            onPress={() => {
                                const url = `https://www.google.com/maps/search/?api=1&query=${job.client_lat},${job.client_lng}`;
                                Linking.openURL(url);
                            }}
                            variant="primary"
                        />
                    )}
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
        padding: 20,
        paddingBottom: 40,
    },
    fullImage: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        marginBottom: 20,
    },
    card: {
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    distanceText: {
        ...theme.typography.caption,
        color: theme.colors.accent,
        fontWeight: '700',
    },
    sectionTitle: {
        ...theme.typography.label,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    description: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
    },
    buttonGroup: {
        gap: 12,
    },
});
