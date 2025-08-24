import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

interface UserMentionDropdownProps {
  profiles: Profile[];
  searchQuery: string;
  onSelectUser: (user: Profile) => void;
  isVisible: boolean;
  position: { top: number; left: number };
}

const UserMentionDropdown: React.FC<UserMentionDropdownProps> = ({
  profiles,
  searchQuery,
  onSelectUser,
  isVisible,
  position
}) => {
  if (!isVisible) return null;

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredProfiles.length === 0) return null;

  return (
    <div 
      className="absolute z-50 bg-background border border-border rounded-lg shadow-lg min-w-[200px] max-h-[200px] overflow-y-auto"
      style={{ 
        top: position.top - 10, 
        left: position.left 
      }}
    >
      {filteredProfiles.slice(0, 5).map(profile => (
        <div
          key={profile.id}
          className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer transition-colors"
          onClick={() => onSelectUser(profile)}
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-xs">
              {profile.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{profile.name}</span>
        </div>
      ))}
    </div>
  );
};

export default UserMentionDropdown;