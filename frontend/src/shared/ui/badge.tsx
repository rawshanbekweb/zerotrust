import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn.js';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium font-mono border transition-colors',
  {
    variants: {
      variant: {
        default:  'bg-slate-700/60 text-slate-300 border-slate-600/50',
        brand:    'bg-brand-500/15 text-brand-400 border-brand-500/25',
        info:     'bg-blue-500/15 text-blue-400 border-blue-500/25',
        low:      'bg-green-500/15 text-green-400 border-green-500/25',
        medium:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
        high:     'bg-red-500/15 text-red-400 border-red-500/25',
        critical: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
        success:  'bg-green-500/15 text-green-400 border-green-500/25',
        danger:   'bg-red-500/15 text-red-400 border-red-500/25',
        warning:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
        outline:  'bg-transparent text-slate-400 border-slate-600',
      },
      size: {
        sm: 'text-2xs px-1.5',
        md: 'text-xs',
        lg: 'text-sm px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size:    'md',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'critical' ? 'bg-purple-400'
            : variant === 'high'  ? 'bg-red-400'
            : variant === 'medium'? 'bg-amber-400'
            : variant === 'low'   ? 'bg-green-400'
            : 'bg-slate-400',
          )}
        />
      )}
      {children}
    </span>
  );
}
