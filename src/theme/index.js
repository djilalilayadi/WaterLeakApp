export const theme = {
    colors: {
        background: '#0A0F1E',
        surface: '#111827',
        border: '#1E2A3A',
        accent: '#2E9BF0',
        accentLight: '#EBF5FF',
        textPrimary: '#F9FAFB',
        textSecondary: '#6B7280',
        success: '#10B981',
        danger: '#EF4444',
        white: '#FFFFFF',
    },
    spacing: {
        4: 4,
        8: 8,
        12: 12,
        16: 16,
        24: 24,
        32: 32,
        48: 48,
    },
    borderRadius: {
        small: 6,
        medium: 12,
        large: 20,
    },
    typography: {
        h1: {
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.5,
        },
        h2: {
            fontSize: 20,
            fontWeight: '600',
        },
        body: {
            fontSize: 15,
            fontWeight: '400',
            lineHeight: 22,
        },
        label: {
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
        },
        caption: {
            fontSize: 13,
            color: '#6B7280', // textSecondary
        },
    },
    shadows: {
        card: {
            elevation: 4,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
        },
    },
};
