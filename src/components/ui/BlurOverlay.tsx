import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock } from 'lucide-react';

interface BlurOverlayProps {
  children: React.ReactNode;
  className?: string;
  blurLevel?: string;
}

export const BlurOverlay: React.FC<BlurOverlayProps> = ({ 
  children, 
  className = '',
  blurLevel = 'blur-sm'
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className={`animate-pulse bg-black/5 rounded ${className}`}>{children}</div>;
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className={`relative inline-block select-none ${className}`}>
      <div className={`pointer-events-none opacity-40 ${blurLevel}`}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
        <Lock size={14} className="opacity-50" />
      </div>
    </div>
  );
};
