/**
 * Toast — Animated toast notification component + container
 *
 * Renders a fixed overlay in the top-right corner of the viewport.
 * Each toast slides in from the right and fades out on dismiss.
 * Supports 4 variants: success, error, warning, info.
 */

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import type { ToastVariant } from '../../hooks/useToast';

// ── Per-variant config ────────────────────────────────────────────────────────

interface VariantConfig {
  icon: React.ElementType;
  containerClass: string;
  iconClass: string;
  progressClass: string;
  titleDefault: string;
}

const VARIANTS: Record<ToastVariant, VariantConfig> = {
  success: {
    icon: CheckCircle2,
    containerClass: 'bg-white border-l-4 border-emerald-500 shadow-lg shadow-emerald-100/60',
    iconClass: 'text-emerald-500',
    progressClass: 'bg-emerald-500',
    titleDefault: 'Success',
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-white border-l-4 border-red-500 shadow-lg shadow-red-100/60',
    iconClass: 'text-red-500',
    progressClass: 'bg-red-500',
    titleDefault: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-white border-l-4 border-amber-500 shadow-lg shadow-amber-100/60',
    iconClass: 'text-amber-500',
    progressClass: 'bg-amber-500',
    titleDefault: 'Warning',
  },
  info: {
    icon: Info,
    containerClass: 'bg-white border-l-4 border-blue-500 shadow-lg shadow-blue-100/60',
    iconClass: 'text-blue-500',
    progressClass: 'bg-blue-500',
    titleDefault: 'Info',
  },
};

// ── Single Toast item ─────────────────────────────────────────────────────────

interface ToastItemProps {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ id, variant, title, message, duration = 4000, onDismiss }) => {
  const cfg = VARIANTS[variant];
  const Icon = cfg.icon;
  const displayTitle = title ?? cfg.titleDefault;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative w-80 max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden ${cfg.containerClass}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[3px] ${cfg.progressClass} origin-left`}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />

      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <span className={`mt-0.5 flex-shrink-0 ${cfg.iconClass}`}>
          <Icon size={18} strokeWidth={2.2} />
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug">{displayTitle}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed break-words">{message}</p>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => onDismiss(id)}
          className="flex-shrink-0 mt-0.5 p-0.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Dismiss notification"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
};

// ── Toast Container ───────────────────────────────────────────────────────────

/**
 * Place <ToastContainer /> once at the app root.
 * It renders a fixed overlay and reads from the global toast context.
 */
export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none"
      aria-label="Notifications"
    >
      <AnimatePresence mode="sync">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem
              id={t.id}
              variant={t.variant}
              title={t.title}
              message={t.message}
              duration={t.duration}
              onDismiss={dismiss}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
