import { cn } from '../utils/cn.js';
import { getInitials } from '../utils/format.js';

interface AvatarProps {
  src?:       string | null;
  firstName:  string;
  lastName:   string;
  size?:      'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  online?:    boolean;
}

const sizeMap = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
  xl: 'h-14 w-14 text-lg',
};

const dotSizeMap = {
  sm: 'h-2 w-2 -bottom-0.5 -right-0.5',
  md: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
  lg: 'h-3 w-3 bottom-0 right-0',
  xl: 'h-3.5 w-3.5 bottom-0 right-0',
};

export function Avatar({ src, firstName, lastName, size = 'md', className, online }: AvatarProps) {
  const initials = getInitials(firstName, lastName);

  return (
    <div className={cn('relative shrink-0', sizeMap[size], className)}>
      {src ? (
        <img
          src={src}
          alt={`${firstName} ${lastName}`}
          className="h-full w-full rounded-full object-cover ring-2 ring-slate-700"
        />
      ) : (
        <div className="h-full w-full rounded-full bg-gradient-to-br from-brand-500 to-cyber-500 flex items-center justify-center font-semibold text-white ring-2 ring-slate-700">
          {initials}
        </div>
      )}

      {online !== undefined && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-surface-base',
            dotSizeMap[size],
            online ? 'bg-status-online' : 'bg-status-offline',
          )}
        />
      )}
    </div>
  );
}
