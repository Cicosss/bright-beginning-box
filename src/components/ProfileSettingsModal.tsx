import React, { useState, useEffect } from 'react';
import { useProfile } from '../hooks/useProfile';
import { generateAvatarUrl, AVATAR_STYLES, generatePreviewAvatars } from '../utils/avatarGenerator';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { profile, loading, updateProfile } = useProfile();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('avataaars');
  const [selectedSeed, setSelectedSeed] = useState('');
  const [previewAvatars, setPreviewAvatars] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setRole(profile.role || 'Dipendente');
      
      // Extract style and seed from current avatar URL
      if (profile.avatar_url) {
        const urlParts = profile.avatar_url.match(/7\.x\/([^/]+)\/svg\?seed=([^&]+)/);
        if (urlParts) {
          setSelectedStyle(urlParts[1]);
          setSelectedSeed(decodeURIComponent(urlParts[2]));
        }
      } else {
        setSelectedSeed(profile.name || 'User');
      }
    }
  }, [profile]);

  useEffect(() => {
    setPreviewAvatars(generatePreviewAvatars(selectedStyle, 8));
  }, [selectedStyle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const avatarUrl = generateAvatarUrl(selectedStyle, selectedSeed || name);
      await updateProfile({ 
        name: name.trim(), 
        role: role.trim(),
        avatar_url: avatarUrl 
      });
      
      // Force a refresh of the profile data
      window.location.reload();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Impostazioni Profilo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Ruolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ruolo in RM Multimedia
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Inserisci il tuo ruolo"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Avatar personalizzato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Avatar Personalizzato
            </label>
            
            {/* Avatar attuale */}
            <div className="flex items-center gap-3 mb-3">
              <img
                src={generateAvatarUrl(selectedStyle, selectedSeed || name)}
                alt="Avatar attuale"
                className="w-12 h-12 rounded-full"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Avatar attuale</span>
            </div>

            {/* Selezione stile */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stile Avatar
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {AVATAR_STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Seed personalizzato */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Personalizza Avatar (opzionale)
              </label>
              <input
                type="text"
                value={selectedSeed}
                onChange={(e) => setSelectedSeed(e.target.value)}
                placeholder={name || 'Inserisci testo per personalizzare'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Preview avatars */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Oppure scegli dalla galleria
              </label>
              <div className="grid grid-cols-4 gap-2">
                {previewAvatars.map((avatarUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const urlParts = avatarUrl.match(/seed=([^&]+)/);
                      if (urlParts) {
                        setSelectedSeed(decodeURIComponent(urlParts[1]));
                      }
                    }}
                    className="w-12 h-12 rounded-full border-2 border-transparent hover:border-blue-500 transition-colors"
                  >
                    <img
                      src={avatarUrl}
                      alt={`Avatar opzione ${index + 1}`}
                      className="w-full h-full rounded-full"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};