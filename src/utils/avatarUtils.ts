// Utilitaires de génération d'avatars et initiales pour Évasion Soleil

export function getUserInitials(name?: string): string {
  if (!name || !name.trim()) return 'ES';
  const clean = name.trim().replace(/[^\w\s\u00C0-\u017F]/gi, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ES';
  if (parts.length === 1) {
    return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AVATAR_COLOR_PALETTES = [
  { id: 'teal', label: 'Teal Évasion (Officiel)', from: '#338b84', to: '#143734' },
  { id: 'indigo', label: 'Indigo Royal', from: '#4f46e5', to: '#312e81' },
  { id: 'emerald', label: 'Émeraude Caraïbes', from: '#059669', to: '#064e3b' },
  { id: 'amber', label: 'Or & Soleil', from: '#d97706', to: '#78350f' },
  { id: 'rose', label: 'Corail Passion', from: '#e11d48', to: '#881337' },
  { id: 'cyan', label: 'Lagon Bleu', from: '#0284c7', to: '#0c4a6e' },
  { id: 'slate', label: 'Graphite Prestige', from: '#475569', to: '#0f172a' },
];

export function getInitialsAvatarUrl(name?: string, colorPaletteId = 'teal'): string {
  const initials = getUserInitials(name);
  const palette =
    AVATAR_COLOR_PALETTES.find((p) => p.id === colorPaletteId) || AVATAR_COLOR_PALETTES[0];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.from}"/>
        <stop offset="100%" stop-color="${palette.to}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="32" fill="url(#avatarGrad)"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="46" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns a valid avatar URL. If user avatar is missing, empty, or an unsplash / stock placeholder,
 * returns the default initials SVG avatar. Only custom user-uploaded or modified photos are returned.
 */
export function getSafeAvatar(avatar?: string, name?: string): string {
  if (
    avatar &&
    avatar.trim() &&
    !avatar.includes('unsplash.com') &&
    !avatar.includes('photo-1534528741775') &&
    !avatar.includes('photo-1573496359142') &&
    !avatar.includes('photo-1507003211169') &&
    !avatar.includes('photo-1494790108377')
  ) {
    return avatar;
  }
  return getInitialsAvatarUrl(name);
}
