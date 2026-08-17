import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  className = '', 
  ...props 
}, ref) => {
  
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue disabled:pointer-events-none disabled:opacity-50 rounded-xl";
  
  const variants = {
    primary: "bg-accent-blue text-white hover:bg-accent-blue/90 shadow-sm",
    secondary: "bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80",
    danger: "bg-accent-red text-white hover:bg-accent-red/90 shadow-sm",
    ghost: "hover:bg-bg-tertiary text-text-secondary hover:text-text-primary",
    outline: "border border-black/10 bg-transparent hover:bg-bg-secondary text-text-primary"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10"
  };

  return (
    <motion.button 
      ref={ref}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...(props as any)}
    >
      {icon && <span className={cn("shrink-0", children ? "mr-2" : "")}>{icon}</span>}
      {children}
    </motion.button>
  );
});
Button.displayName = "Button";
