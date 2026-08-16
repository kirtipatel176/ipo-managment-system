import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  className,
  icon,
  ...props
}, ref) => {
  return (
    <div className="relative">
      {icon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-xl border border-black/5 bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue disabled:cursor-not-allowed disabled:opacity-50 shadow-sm transition-all",
          icon && "pl-10",
          className
        )}
        {...props}
      />
    </div>
  );
});
Input.displayName = "Input";
