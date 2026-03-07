import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
    SafeAreaView
} from 'react-native';
import supabase from '../lib/supabase';
import { getUserLocation } from '../lib/gps';
import { useAuth } from '../context/AuthContext';
import { theme } from '../src/theme';
import { AppHeader, AppCard, StatusBadge } from '../src/components/UI';

export default function TechnicianDashboard({ navigation }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const { userId } = useAuth();

    const updateLocationAndFetch = useCallback(async () => {
        try {
            const location = await getUserLocation();
            if (!location) {
                Alert.alert('Location Error', 'Could not get your current location.');
                return;
            }
            setCurrentLocation(location);

            await supabase
                .from('technician_locations')
                .upsert({
                    technician_id: userId,
                    lat: location.latitude,
                    lng: location.longitude,
                    updated_at: new Date().toISOString()
                });

            const { data, error } = await supabase
                .from('leak_requests')
                .select('*')
                .eq('status', 'pending');

            if (error) throw error;

            const enrichedRequests = data.map(req => {
                const R = 6371;
                const dLat = (req.client_lat - location.latitude) * Math.PI / 180;
                const dLon = (req.client_lng - location.longitude) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(location.latitude * Math.PI / 180) * Math.cos(req.client_lat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;

                return { ...req, distance };
            }).sort((a, b) => a.distance - b.distance);

            setRequests(enrichedRequests);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch requests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    useEffect(() => {
        updateLocationAndFetch();
    }, [updateLocationAndFetch]);

    const onRefresh = () => {
        setRefreshing(true);
        updateLocationAndFetch();
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('JobDetail', { job: item })}
            activeOpacity={0.7}
        >
            <AppCard style={styles.card}>
                <Image source={{ uri: item.photo_url }} style={styles.thumbnail} />
                <View style={styles.info}>
                    <View style={styles.infoTop}>
                        <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
                        <Text style={styles.chevron}>→</Text>
                    </View>
                    <View style={styles.infoBottom}>
                        <Text style={styles.distanceText}>{item.distance.toFixed(2)} km</Text>
                        <StatusBadge status={item.status} />
                    </View>
                </View>
            </AppCard>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Available Jobs" />

            <View style={styles.statusBar}>
                <View style={styles.onlineBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.onlineText}>You are online</Text>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                    <Text style={styles.loadingText}>Searching for jobs...</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.accent}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🔍</Text>
                            <Text style={styles.emptyText}>No requests nearby</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    greenDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.success,
        marginRight: 6,
    },
    onlineText: {
        ...theme.typography.caption,
        color: theme.colors.success,
        fontWeight: '600',
    },
    list: {
        padding: 20,
        paddingTop: 8,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
    },
    thumbnail: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: theme.colors.border,
    },
    info: {
        flex: 1,
        marginLeft: 16,
    },
    infoTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    description: {
        ...theme.typography.body,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        flex: 1,
        marginRight: 10,
    },
    chevron: {
        fontSize: 18,
        color: theme.colors.textSecondary,
    },
    infoBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    distanceText: {
        ...theme.typography.caption,
        color: theme.colors.accent,
        fontWeight: '700',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: 12,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
});
