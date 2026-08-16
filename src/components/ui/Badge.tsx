import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({
  className,
  variant = 'default',
  ...props
}, ref) => {
  const variants = {
    default: "bg-bg-tertiary text-text-primary",
    success: "bg-accent-green-light text-accent-green",
    warning: "bg-accent-orange/10 text-accent-orange",
    danger: "bg-accent-red-light text-accent-red",
    info: "bg-accent-blue-light text-accent-blue",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";
