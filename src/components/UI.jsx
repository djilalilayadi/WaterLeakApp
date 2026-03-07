import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { theme } from '../theme';

export const AppButton = ({ title, onPress, loading, variant = 'primary', disabled }) => {
    const isOutline = variant === 'outline';
    const isDanger = variant === 'danger';

    const buttonStyle = [
        styles.button,
        isOutline && styles.buttonOutline,
        isDanger && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
    ];

    const textStyle = [
        styles.buttonText,
        isOutline && styles.buttonTextOutline,
    ];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            style={buttonStyle}
        >
            {loading ? (
                <ActivityIndicator color={isOutline ? theme.colors.accent : theme.colors.white} />
            ) : (
                <Text style={textStyle}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

export const AppInput = ({ label, value, onChangeText, placeholder, secureTextEntry, multiline, height }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.inputWrapper}>
            {label && <Text style={styles.inputLabel}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    height && { height }
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={secureTextEntry}
                multiline={multiline}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
        </View>
    );
};

export const AppCard = ({ children, style }) => (
    <View style={[styles.card, style]}>
        {children}
    </View>
);

export const StatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
        switch (status) {
            case 'pending': return { color: '#F59E0B', label: 'Pending' };
            case 'assigned': return { color: theme.colors.accent, label: 'Assigned' };
            case 'in_progress': return { color: theme.colors.accent, label: 'In Progress' };
            case 'done': return { color: theme.colors.success, label: 'Done' };
            case 'cancelled': return { color: theme.colors.danger, label: 'Cancelled' };
            default: return { color: theme.colors.textSecondary, label: status };
        }
    };

    const config = getStatusConfig(status);

    return (
        <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
    );
};

export const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
);

export const AppHeader = ({ title, showBack, onBack }) => (
    <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
            {showBack && (
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
            )}
            <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>
            {showBack && <View style={{ width: 40 }} />}
        </View>
    </SafeAreaView>
);

const styles = StyleSheet.create({
    button: {
        height: 54,
        backgroundColor: theme.colors.accent,
        borderRadius: theme.borderRadius.medium,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginBottom: theme.spacing[16],
    },
    buttonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.accent,
    },
    buttonDanger: {
        backgroundColor: theme.colors.danger,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: theme.colors.white,
        fontSize: 15,
        fontWeight: '600',
    },
    buttonTextOutline: {
        color: theme.colors.accent,
    },
    inputWrapper: {
        marginBottom: theme.spacing[24],
        width: '100%',
    },
    inputLabel: {
        ...theme.typography.label,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing[8],
    },
    input: {
        height: 54,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.medium,
        paddingHorizontal: theme.spacing[16],
        color: theme.colors.textPrimary,
        fontSize: 15,
    },
    inputFocused: {
        borderColor: theme.colors.accent,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 100,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    sectionHeader: {
        ...theme.typography.label,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing[12],
    },
    headerSafeArea: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[16],
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        ...theme.typography.h2,
        color: theme.colors.textPrimary,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: theme.colors.textPrimary,
    },
});
