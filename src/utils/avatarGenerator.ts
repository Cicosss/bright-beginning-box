// Stili di avatar disponibili usando URL DiceBear API
export const AVATAR_STYLES = [
  { id: 'adventurer', name: '🏴‍☠️ Avventuriero' },
  { id: 'avataaars', name: '😊 Cartoon' },
  { id: 'bottts', name: '🤖 Robot' },  
  { id: 'fun-emoji', name: '😀 Emoji' },
  { id: 'lorelei', name: '👩 Moderno' },
  { id: 'personas', name: '👤 Persona' },
];

// Genera URL avatar usando DiceBear API
export const generateAvatarUrl = (styleId: string, seed: string): string => {
  return `https://api.dicebear.com/7.x/${styleId}/svg?seed=${encodeURIComponent(seed)}&size=100&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};

// Genera avatar casuali per preview
export const generatePreviewAvatars = (styleId: string, count: number = 6): string[] => {
  const seeds = ['Felix', 'Aneka', 'Zoey', 'Lucky', 'Shadow', 'Buddy', 'Max', 'Luna'];
  return seeds.slice(0, count).map(seed => generateAvatarUrl(styleId, seed));
};

// Lista di "semi" predefiniti per avatar carini
export const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Zoey', 'Lucky', 'Shadow', 'Buddy', 'Max', 'Luna',
  'Charlie', 'Bella', 'Milo', 'Lucy', 'Oliver', 'Molly', 'Leo', 'Daisy',
  'Toby', 'Rosie', 'Jack', 'Ruby', 'Finn', 'Coco', 'Oscar', 'Lily'
];