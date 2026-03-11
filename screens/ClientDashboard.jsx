import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../src/theme';
import { AppHeader, AppCard, StatusBadge, AppButton } from '../src/components/UI';

function formatMoneyDzd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString()} DZD`;
}

function timeAgo(iso) {
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
}

export default function ClientDashboard({ navigation }) {
  const { userId } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('leak_requests')
        .select('id, description, status, price, created_at')
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch your requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleDelete = useCallback(
    (item) => {
      Alert.alert(
        'Delete Request',
        'Are you sure you want to delete this request? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('leak_requests')
                  .delete()
                  .eq('id', item.id);

                if (error) throw error;
                setRequests((prev) => prev.filter((r) => r.id !== item.id));
              } catch (error) {
                console.error(error);
                Alert.alert('Error', 'Failed to delete request');
              }
            },
          },
        ]
      );
    },
    []
  );

  const hasAny = useMemo(() => requests && requests.length > 0, [requests]);

  const renderItem = ({ item }) => (
    <AppCard style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.desc} numberOfLines={1}>
          {item.description}
        </Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{formatMoneyDzd(item.price)}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Waiting', { requestId: item.id })}
          activeOpacity={0.8}
          style={styles.actionPill}
        >
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item)}
          activeOpacity={0.8}
          style={[styles.actionPill, styles.deletePill]}
        >
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="My Requests" />
      <View style={styles.topActions}>
        <AppButton
          title="New Request"
          onPress={() => navigation.navigate('ReportLeak')}
          variant="primary"
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading your requests...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, !hasAny && { flex: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>No requests yet</Text>
              <AppButton
                title="Create New Request"
                onPress={() => navigation.navigate('ReportLeak')}
                variant="primary"
              />
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
  list: {
    padding: 20,
    paddingTop: 8,
  },
  topActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  card: {
    marginBottom: 16,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  desc: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeText: {
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionText: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  deletePill: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  deleteText: {
    color: theme.colors.danger,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
});

