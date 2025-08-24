import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useNotificationsBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // For now, we'll use a simple approach
    // In a real implementation, you'd query the actual mentions
    const storedCount = localStorage.getItem(`notifications_${user.id}`) || '0';
    setUnreadCount(parseInt(storedCount));
  }, [user?.id]);

  const markAsRead = () => {
    if (!user?.id) return;
    
    setUnreadCount(0);
    localStorage.setItem(`notifications_${user.id}`, '0');
  };

  const incrementCount = () => {
    if (!user?.id) return;
    
    const newCount = unreadCount + 1;
    setUnreadCount(newCount);
    localStorage.setItem(`notifications_${user.id}`, newCount.toString());
  };

  return {
    unreadCount,
    markAsRead,
    incrementCount
  };
};