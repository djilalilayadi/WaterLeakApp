/*
-- ALTER TABLE leak_requests ADD COLUMN price_confirmed boolean default false;
*/

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

const SEVERITY_CONFIG = {
    critical: { color: '#EF4444', emoji: '🔴', label: 'Critical' },
    high:     { color: '#F97316', emoji: '🟠', label: 'High' },
    medium:   { color: '#EAB308', emoji: '🟡', label: 'Medium' },
    low:      { color: '#22C55E', emoji: '🟢', label: 'Low' },
    unknown:  { color: '#6B7280', emoji: '⚪', label: 'Unknown' },
};

const getSeverityConfig = (severity) =>
    SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.unknown;

export default function JobDetailScreen({ route, navigation }) {
    const { job } = route.params;
    const [loading, setLoading] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(job.status);
    const [paymentSeen, setPaymentSeen] = useState(false);
    const { userId } = useAuth();

    const formatMoneyDzd = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return '—';
        return `${n.toLocaleString()} DZD`;
    };

    const handleAcceptJob = async () => {
        if (!paymentSeen) {
            Alert.alert('Confirm Payment', 'Please confirm you have seen the payment amount.');
            return;
        }

        setLoading(true);
        try {
            const updateBase = {
                status: 'assigned',
                technician_id: userId,
            };

            const { error: requestError } = await supabase
                .from('leak_requests')
                .update({ ...updateBase, price_confirmed: true })
                .eq('id', job.id);

            if (requestError) {
                // If the column isn't in DB yet (schema cache), retry without it.
                if (requestError.code === 'PGRST204') {
                    const { error: retryError } = await supabase
                        .from('leak_requests')
                        .update(updateBase)
                        .eq('id', job.id);
                    if (retryError) throw retryError;
                } else {
                    throw requestError;
                }
            }

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

    const hasSeverity = job.severity && job.severity !== 'unknown';
    const sevConfig = getSeverityConfig(job.severity);

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

                    <Text style={styles.paymentLabel}>OFFERED PAYMENT</Text>
                    <Text style={styles.paymentValue}>{formatMoneyDzd(job.price)}</Text>

                    <View style={styles.confirmRow}>
                        <Text style={styles.confirmText}>I confirm I have seen the payment amount</Text>
                        <View style={{ flex: 1 }} />
                        <Text
                            onPress={() => setPaymentSeen((v) => !v)}
                            style={[styles.checkbox, paymentSeen && styles.checkboxChecked]}
                            accessibilityRole="checkbox"
                        >
                            {paymentSeen ? '✓' : ''}
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>REPORTED ISSUE</Text>
                    <Text style={styles.description}>{job.description}</Text>
                </AppCard>

                {/* AI Analysis Section */}
                {hasSeverity && (
                    <AppCard style={styles.aiCard}>
                        <Text style={styles.aiSectionTitle}>AI ANALYSIS</Text>

                        <View style={[styles.aiSeverityPill, { backgroundColor: sevConfig.color + '20' }]}>
                            <Text style={styles.aiSeverityEmoji}>{sevConfig.emoji}</Text>
                            <Text style={[styles.aiSeverityText, { color: sevConfig.color }]}>
                                {sevConfig.label}
                            </Text>
                        </View>

                        {job.ai_description ? (
                            <Text style={styles.aiDescriptionText}>{job.ai_description}</Text>
                        ) : null}

                        {job.estimated_flow ? (
                            <View style={styles.aiFlowRow}>
                                <Text style={styles.aiFlowLabel}>Estimated Flow:</Text>
                                <Text style={styles.aiFlowValue}>{job.estimated_flow}</Text>
                            </View>
                        ) : null}

                        <Text style={styles.aiFooter}>Analyzed by Gemini AI</Text>
                    </AppCard>
                )}

                <View style={styles.buttonGroup}>
                    {currentStatus === 'pending' && (
                        <AppButton
                            title="Accept Job"
                            onPress={handleAcceptJob}
                            loading={loading}
                            disabled={!paymentSeen}
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
    paymentLabel: {
        ...theme.typography.label,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    paymentValue: {
        color: theme.colors.success,
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 14,
    },
    confirmRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 18,
    },
    confirmText: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
        fontWeight: '600',
        paddingRight: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.colors.border,
        color: theme.colors.white,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontWeight: '900',
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    checkboxChecked: {
        borderColor: theme.colors.success,
        backgroundColor: theme.colors.success,
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
    // AI Analysis Card
    aiCard: {
        marginBottom: 24,
    },
    aiSectionTitle: {
        ...theme.typography.label,
        color: theme.colors.textSecondary,
        marginBottom: 14,
    },
    aiSeverityPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        marginBottom: 14,
        gap: 8,
    },
    aiSeverityEmoji: {
        fontSize: 18,
    },
    aiSeverityText: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    aiDescriptionText: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
        marginBottom: 10,
    },
    aiFlowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    aiFlowLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    aiFlowValue: {
        ...theme.typography.caption,
        color: theme.colors.textPrimary,
        fontWeight: '700',
    },
    aiFooter: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        fontSize: 11,
    },
});
