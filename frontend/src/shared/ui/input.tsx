import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:      string;
  error?:      string;
  leftIcon?:   React.ReactNode;
  rightIcon?:  React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, helperText, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-300"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex h-10 w-full rounded-xl border bg-slate-800/60 px-3 py-2 text-sm text-slate-100',
              'placeholder:text-slate-500',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50'
                : 'border-slate-700/60 hover:border-slate-600',
              leftIcon  && 'pl-10',
              rightIcon && 'pr-10',
              className,
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
