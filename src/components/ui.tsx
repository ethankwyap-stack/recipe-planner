import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect } from 'react'

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger'

const variants: Record<Variant, string> = {
  primary:
    'bg-neon text-bg font-semibold hover:brightness-110 shadow-[0_0_20px_-6px_var(--color-neon)]',
  ghost: 'bg-transparent text-text border border-border hover:border-neon/60 hover:text-neon',
  subtle: 'bg-surface-2 text-text hover:bg-border',
  danger: 'bg-transparent text-red-300 border border-red-400/40 hover:bg-red-500/10',
}

export function Button({
  variant = 'subtle',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = 'default',
  onClick,
  active,
}: {
  children: ReactNode
  tone?: 'default' | 'neon' | 'accent'
  onClick?: () => void
  active?: boolean
}) {
  const tones = {
    default: 'bg-surface-2 text-muted border-border',
    neon: 'bg-neon/10 text-neon border-neon/30',
    accent: 'bg-accent/10 text-accent border-accent/30',
  }
  const base = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${
    active ? tones.neon : tones[tone]
  }`
  return onClick ? (
    <button className={`${base} cursor-pointer hover:border-neon/50`} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span className={base}>{children}</span>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm no-print"
      onClick={onClose}
    >
      <div
        className={`my-8 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl border border-border bg-surface shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-neon/60 placeholder:text-muted/60'
