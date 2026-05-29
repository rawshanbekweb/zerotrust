import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn.js';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-glow-brand hover:shadow-glow-brand',
        secondary:
          'bg-slate-700/60 text-slate-200 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500',
        danger:
          'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50',
        ghost:
          'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
        outline:
          'border border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600',
        cyber:
          'bg-gradient-brand text-white hover:opacity-90 active:opacity-80 shadow-glow-cyan',
      },
      size: {
        sm:   'h-8 px-3 text-xs rounded-lg',
        md:   'h-10 px-4',
        lg:   'h-11 px-6 text-base',
        xl:   'h-12 px-8 text-base',
        icon: 'h-9 w-9 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size:    'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  ),
);

Button.displayName = 'Button';
