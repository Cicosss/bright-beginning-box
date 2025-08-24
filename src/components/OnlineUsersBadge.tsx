import React from 'react';
import { useUserPresence } from '../hooks/useUserPresence';

interface OnlineUsersBadgeProps {
  className?: string;
}

export const OnlineUsersBadge: React.FC<OnlineUsersBadgeProps> = ({ className = '' }) => {
  const { onlineCount, onlineUsers, loading } = useUserPresence();

  if (loading) {
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mr-1.5 animate-pulse"></div>
        <span>...</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700 ${className}`}>
      {/* Animated dot */}
      <div className="relative mr-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75"></div>
      </div>
      
      {/* User count */}
      <span className="transition-all duration-300 ease-in-out">
        {onlineCount} {onlineCount === 1 ? 'utente' : 'utenti'} online
      </span>
      
      {/* Tooltip with user names on hover */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
        {onlineUsers.length > 0 ? (
          <div className="space-y-1">
            {onlineUsers.map((user) => (
              <div key={user.user_id} className="flex items-center space-x-2">
                {user.avatar_url && (
                  <img 
                    src={user.avatar_url} 
                    alt={user.name}
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span>{user.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <span>Nessun utente online</span>
        )}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
      </div>
    </div>
  );
};