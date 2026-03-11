import { useCallback, useEffect, useRef, useState } from 'react';

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Simple in-app notifications state for banner UI.
 * - `addNotification(title, body, type)` adds a notification that auto-dismisses in 4 seconds
 * - `clearNotification(id?)` clears one (by id) or all (no id)
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef(new Map());

  const clearNotification = useCallback((id) => {
    if (!id) {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
      setNotifications([]);
      return;
    }

    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((title, body, type = 'info') => {
    const id = makeId();
    const notification = {
      id,
      title: String(title ?? ''),
      body: String(body ?? ''),
      type,
      createdAt: Date.now(),
    };

    setNotifications((prev) => [...prev, notification]);

    const t = setTimeout(() => clearNotification(id), 4000);
    timersRef.current.set(id, t);
    return id;
  }, [clearNotification]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return { notifications, addNotification, clearNotification };
}

