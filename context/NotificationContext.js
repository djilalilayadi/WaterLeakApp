import React, { createContext, useContext } from 'react';
import { useNotifications as useNotificationsState } from '../lib/notifications';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const notificationsApi = useNotificationsState();
  return (
    <NotificationContext.Provider value={notificationsApi}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}

