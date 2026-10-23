import React from 'react';
import { X, Lock } from 'lucide-react';
import { getTagConfig } from '../utils/tagColors';

interface TagBadgeProps {
  tag: string;
  size?: 'xs' | 'sm' | 'md';
  onRemove?: () => void;
  disabled?: boolean;
  showLockIfAdmin?: boolean;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'xs',
  onRemove,
  disabled = false,
  showLockIfAdmin = false,
  className = '',
}) => {
  const config = getTagConfig(tag);

  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-black tracking-wide uppercase shadow-2xs transition-all ${config.bgColor} ${config.textColor} ${sizeClasses} ${className}`}
      style={{ boxShadow: `0 1px 4px ${config.hex}33` }}
      title={config.isAdminOnly ? `Tag réservé aux administrateurs : [${config.label}]` : `Tag : [${config.label}]`}
    >
      {showLockIfAdmin && config.isAdminOnly && <Lock className="h-2.5 w-2.5 opacity-80" />}
      <span>[{config.label}]</span>
      {onRemove && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-80 p-0.5 rounded-full hover:bg-black/20 transition-colors ml-0.5 cursor-pointer"
          title={`Retirer le tag [${config.label}]`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
};
