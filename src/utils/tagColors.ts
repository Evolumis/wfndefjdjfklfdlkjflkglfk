import { TagColorConfig, User } from '../types';

export const KNOWN_TAGS: TagColorConfig[] = [
  {
    label: 'ADMIN',
    bgColor: 'bg-indigo-600',
    textColor: 'text-white',
    borderColor: 'border-indigo-700',
    hex: '#4f46e5',
    isAdminOnly: true,
  },
  {
    label: 'DIRECTION',
    bgColor: 'bg-purple-600',
    textColor: 'text-white',
    borderColor: 'border-purple-700',
    hex: '#9333ea',
    isAdminOnly: true,
  },
  {
    label: 'VIP',
    bgColor: 'bg-[#338b84]',
    textColor: 'text-white',
    borderColor: 'border-[#286f6a]',
    hex: '#338b84',
    isAdminOnly: true,
  },
  {
    label: 'IT',
    bgColor: 'bg-cyan-600',
    textColor: 'text-white',
    borderColor: 'border-cyan-700',
    hex: '#0891b2',
    isAdminOnly: false,
  },
  {
    label: 'EXPERT CROISIÈRES',
    bgColor: 'bg-teal-600',
    textColor: 'text-white',
    borderColor: 'border-teal-700',
    hex: '#0d9488',
    isAdminOnly: false,
  },
  {
    label: 'EXPERT SUD',
    bgColor: 'bg-[#338b84]',
    textColor: 'text-white',
    borderColor: 'border-[#286f6a]',
    hex: '#338b84',
    isAdminOnly: false,
  },
  {
    label: 'CONSEILLER SENIOR',
    bgColor: 'bg-emerald-600',
    textColor: 'text-white',
    borderColor: 'border-emerald-700',
    hex: '#059669',
    isAdminOnly: false,
  },
  {
    label: 'SUPPORT',
    bgColor: 'bg-rose-600',
    textColor: 'text-white',
    borderColor: 'border-rose-700',
    hex: '#e11d48',
    isAdminOnly: false,
  },
  {
    label: 'RESERVATIONS',
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
    borderColor: 'border-blue-700',
    hex: '#2563eb',
    isAdminOnly: false,
  },
  {
    label: 'QUALITÉ',
    bgColor: 'bg-slate-700',
    textColor: 'text-white',
    borderColor: 'border-slate-800',
    hex: '#334155',
    isAdminOnly: false,
  },
];

// Fallback palette for dynamically added tags
const DYNAMIC_PALETTES = [
  { bgColor: 'bg-pink-600', textColor: 'text-white', borderColor: 'border-pink-700', hex: '#db2777' },
  { bgColor: 'bg-[#338b84]', textColor: 'text-white', borderColor: 'border-[#286f6a]', hex: '#338b84' },
  { bgColor: 'bg-lime-600', textColor: 'text-white', borderColor: 'border-lime-700', hex: '#65a30d' },
  { bgColor: 'bg-violet-600', textColor: 'text-white', borderColor: 'border-violet-700', hex: '#7c3aed' },
  { bgColor: 'bg-sky-600', textColor: 'text-white', borderColor: 'border-sky-700', hex: '#0284c7' },
];

export function getTagConfig(tag: string): TagColorConfig {
  const upper = tag.trim().toUpperCase();
  const found = KNOWN_TAGS.find((k) => k.label.toUpperCase() === upper);
  if (found) return found;

  // Derive pseudo-consistent palette from tag text
  let sum = 0;
  for (let i = 0; i < upper.length; i++) {
    sum += upper.charCodeAt(i);
  }
  const pal = DYNAMIC_PALETTES[sum % DYNAMIC_PALETTES.length];

  return {
    label: upper,
    bgColor: pal.bgColor,
    textColor: pal.textColor,
    borderColor: pal.borderColor,
    hex: pal.hex,
    isAdminOnly: upper.includes('ADMIN') || upper.includes('DIR') || upper.includes('ROOT'),
  };
}

/**
 * Checks if the acting user has permission to toggle/assign this tag on targetUser.
 * If tag is admin-only, acting user MUST have admin permissions.
 */
export function canUserModifyTag(tag: string, actingUser: User): { allowed: boolean; reason?: string } {
  const config = getTagConfig(tag);
  const isAdmin =
    actingUser.role === 'super_admin' ||
    actingUser.role === 'admin' ||
    actingUser.permissions?.canManageUsers === true ||
    actingUser.permissions?.canAssignAdminTags === true;

  if (config.isAdminOnly && !isAdmin) {
    return {
      allowed: false,
      reason: `Le tag [${config.label}] est réservé et ne peut être attribué ou retiré que par un Administrateur.`,
    };
  }

  return { allowed: true };
}
