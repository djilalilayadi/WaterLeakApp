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
import { useNotifications } from '../context/NotificationContext';
import { theme } from '../src/theme';
import { AppHeader, AppCard, StatusBadge } from '../src/components/UI';

export default function TechnicianDashboard({ navigation }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [activeFilter, setActiveFilter] = useState('recent'); // recent | nearest | payment
    const { userId } = useAuth();
    const { addNotification } = useNotifications();

    const formatMoneyDzd = useCallback((value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return '—';
        return `${n.toLocaleString()} DZD`;
    }, []);

    const timeAgo = useCallback((iso) => {
        if (!iso) return '';
        const ts = new Date(iso).getTime();
        if (!Number.isFinite(ts)) return '';
        const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (diffSec < 60) return `${diffSec} sec ago`;
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin} min ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
        const diffDay = Math.floor(diffHr / 24);
        return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    }, []);

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
            });

            setRequests(enrichedRequests);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch requests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    const displayedRequests = useCallback(() => {
        const list = [...requests];
        if (activeFilter === 'recent') {
            return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        if (activeFilter === 'payment') {
            return list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        }
        return list.sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY));
    }, [requests, activeFilter]);

    useEffect(() => {
        updateLocationAndFetch();
    }, [updateLocationAndFetch]);

    useEffect(() => {
        const channel = supabase
            .channel('public:leak_requests:pending_inserts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'leak_requests',
                    filter: 'status=eq.pending',
                },
                () => {
                    addNotification(
                        'New Job Nearby 💧',
                        'A new leak request was submitted near you',
                        'info'
                    );
                    setRefreshing(true);
                    updateLocationAndFetch();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [addNotification, updateLocationAndFetch]);

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
                        <View style={styles.rightMeta}>
                            <Text style={styles.timeAgoText}>{timeAgo(item.created_at)}</Text>
                            <View style={styles.priceBadge}>
                                <Text style={styles.priceText}>{formatMoneyDzd(item.price)}</Text>
                            </View>
                        </View>
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

            <View style={styles.filterBar}>
                <TouchableOpacity
                    onPress={() => setActiveFilter('recent')}
                    style={[styles.filterPill, activeFilter === 'recent' ? styles.filterPillActive : styles.filterPillInactive]}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.filterText, activeFilter === 'recent' ? styles.filterTextActive : styles.filterTextInactive]}>
                        🕐 Recent
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveFilter('nearest')}
                    style={[styles.filterPill, activeFilter === 'nearest' ? styles.filterPillActive : styles.filterPillInactive]}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.filterText, activeFilter === 'nearest' ? styles.filterTextActive : styles.filterTextInactive]}>
                        📍 Nearest
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveFilter('payment')}
                    style={[styles.filterPill, activeFilter === 'payment' ? styles.filterPillActive : styles.filterPillInactive]}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.filterText, activeFilter === 'payment' ? styles.filterTextActive : styles.filterTextInactive]}>
                        💰 Payment
                    </Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                    <Text style={styles.loadingText}>Searching for jobs...</Text>
                </View>
            ) : (
                <FlatList
                    data={displayedRequests()}
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
    filterBar: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    filterPillActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    filterPillInactive: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '700',
    },
    filterTextActive: {
        color: theme.colors.white,
    },
    filterTextInactive: {
        color: theme.colors.textSecondary,
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
    rightMeta: {
        alignItems: 'flex-end',
        gap: 6,
    },
    timeAgoText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    priceBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.35)',
    },
    priceText: {
        color: theme.colors.success,
        fontWeight: '800',
        fontSize: 13,
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
