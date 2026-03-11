import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../src/theme';

const TYPE_COLORS = {
  success: theme.colors.success, // #10B981
  info: theme.colors.accent, // #2E9BF0
  warning: '#F59E0B',
};

export default function NotificationBanner({ notifications, clearNotification }) {
  const active = notifications?.[0] ?? null;
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const bgColor = useMemo(() => {
    if (!active) return TYPE_COLORS.info;
    return TYPE_COLORS[active.type] || TYPE_COLORS.info;
  }, [active]);

  useEffect(() => {
    if (!active) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 160, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start();
      return;
    }

    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [active, opacity, translateY]);

  if (!active) return null;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safe}>
      <Animated.View
        style={[
          styles.wrap,
          { backgroundColor: bgColor, transform: [{ translateY }], opacity },
        ]}
      >
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {active.title}
          </Text>
          {!!active.body && (
            <Text style={styles.body} numberOfLines={2}>
              {active.body}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => clearNotification?.(active.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
    pointerEvents: 'box-none',
  },
  wrap: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  textCol: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  body: {
    color: theme.colors.white,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.95,
  },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  closeText: {
    color: theme.colors.white,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '700',
  },
});

