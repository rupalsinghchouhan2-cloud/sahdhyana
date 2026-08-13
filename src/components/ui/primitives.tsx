/**
 * The Sahadhyāna design system primitives.
 * Every screen is composed from these so the whole app breathes the same air.
 */
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sounds } from '@/lib/sounds/soundEngine';

// ---------------------------------------------------------------- buttons
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  quiet?: boolean; // skip the tap sound
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', quiet, onClick, ...props }, ref) => {
    const cls =
      variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'btn-ghost';
    return (
      <button
        ref={ref}
        className={cls}
        onClick={(e) => {
          if (!quiet) sounds.tap();
          onClick?.(e);
        }}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

// ---------------------------------------------------------------- inputs
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} className={`input ${className}`} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => (
    <textarea ref={ref} className={`input min-h-[96px] resize-y ${className}`} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

// ---------------------------------------------------------------- card
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card p-6 ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------- page shell
export function Page({
  children,
  wide,
  className = '',
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`mx-auto w-full px-5 pb-28 pt-8 sm:pt-12 ${
        wide ? 'max-w-3xl' : 'max-w-xl'
      } ${className}`}
    >
      {children}
    </motion.main>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {back && (
          <button
            onClick={back}
            aria-label="Go back"
            className="mt-1 rounded-full p-2 text-ink-faint transition-colors hover:bg-sand/60 hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <div>
          <h1 className="heading-display text-3xl sm:text-4xl text-balance">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

// ---------------------------------------------------------------- empty state
export function EmptyState({
  illustration,
  title,
  body,
  action,
}: {
  illustration?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      {illustration}
      <h2 className="heading-display text-2xl">{title}</h2>
      {body && <p className="max-w-sm text-ink-soft">{body}</p>}
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- modal sheet
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-[2rem] bg-cream p-6 pb-10 shadow-lift sm:inset-y-0 sm:my-auto sm:h-fit sm:rounded-[2rem]"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {title && <h2 className="heading-display mb-4 text-2xl">{title}</h2>}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- breathing orb
export function BreathingOrb({ className = '', active = true }: { className?: string; active?: boolean }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} aria-hidden="true">
      <div className={`absolute rounded-full bg-sage-200/60 ${active ? 'animate-ripple' : ''}`} style={{ inset: 0 }} />
      <div className={`absolute rounded-full bg-sage-100 ${active ? 'animate-breathe' : ''}`} style={{ inset: '12%' }} />
      <div className={`relative rounded-full bg-sage-300/80 shadow-inner`} style={{ width: '46%', height: '46%' }} />
    </div>
  );
}

// ---------------------------------------------------------------- avatar pebbles
const AVATAR_HUES = ['#a5bc98', '#e2a8b6', '#99c5d5', '#e3c475', '#c9d7c0', '#d17f95'];

export function AvatarPebbles({ names, size = 34 }: { names: string[]; size?: number }) {
  return (
    <div className="flex items-center" role="list" aria-label="People meditating">
      {names.slice(0, 8).map((name, i) => (
        <div
          key={`${name}-${i}`}
          role="listitem"
          title={name}
          className="flex items-center justify-center rounded-full border-2 border-cream font-semibold text-cream"
          style={{
            width: size,
            height: size,
            marginLeft: i === 0 ? 0 : -size * 0.28,
            background: AVATAR_HUES[i % AVATAR_HUES.length],
            fontSize: size * 0.42,
            zIndex: names.length - i,
          }}
        >
          {name.trim().charAt(0).toUpperCase() || '🧘'}
        </div>
      ))}
      {names.length > 8 && (
        <span className="ml-2 text-sm text-ink-faint">+{names.length - 8}</span>
      )}
    </div>
  );
}
