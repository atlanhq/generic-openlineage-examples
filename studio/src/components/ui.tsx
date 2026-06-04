import {
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { Check, Copy, Loader2, type LucideIcon } from 'lucide-react'
import { cn, copyText } from '@/lib/utils'

/* ----------------------------- Button ----------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'flow'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-brand hover:bg-brand-strong active:translate-y-px',
  flow: 'bg-flow text-white hover:bg-flow-strong active:translate-y-px shadow-[0_10px_26px_-10px_rgba(15,183,164,0.55)]',
  secondary:
    'bg-surface text-ink-soft border border-line-strong hover:border-faint hover:text-ink',
  ghost: 'text-muted hover:text-ink hover:bg-canvas-deep',
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap',
        'transition-all duration-150 select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 className={cn(size === 'sm' ? 'size-3.5' : 'size-4', 'spin')} />
      ) : (
        Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      )}
      {children}
    </button>
  )
}

/* ------------------------------ Chip ------------------------------- */

type Tone = 'neutral' | 'brand' | 'flow' | 'ok' | 'warn' | 'danger'

const CHIP_TONE: Record<Tone, string> = {
  neutral: 'bg-canvas-deep text-muted',
  brand: 'bg-brand-soft text-brand-strong',
  flow: 'bg-flow-soft text-flow-strong',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
}

export function Chip({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone
  icon?: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'text-[11.5px] font-medium leading-none tracking-wide',
        CHIP_TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  )
}

/* ------------------------------ Card ------------------------------- */

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface shadow-card',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
      {children}
    </div>
  )
}

/* ------------------------------ Field ------------------------------ */

export function Field({
  label,
  help,
  htmlFor,
  children,
  trailing,
}: {
  label: string
  help?: string
  htmlFor?: string
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-[12.5px] font-medium text-ink-soft"
        >
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {help && <p className="text-[11.5px] leading-snug text-faint">{help}</p>}
    </div>
  )
}

export function Input({
  mono,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-line-strong bg-surface-2 px-3',
        'text-[13.5px] text-ink placeholder:text-faint',
        'transition-colors duration-150',
        'hover:border-faint focus:border-brand focus:bg-surface',
        'focus:outline-none',
        mono && 'font-mono text-[12.5px] tracking-tight',
        className,
      )}
      spellCheck={false}
      autoComplete="off"
      {...rest}
    />
  )
}

/* --------------------------- CopyButton ---------------------------- */

export function CopyButton({
  text,
  label = 'Copy',
  size = 'sm',
  variant = 'secondary',
}: {
  text: string
  label?: string
  size?: Size
  variant?: Variant
}) {
  const [done, setDone] = useState(false)
  return (
    <Button
      size={size}
      variant={variant}
      icon={done ? Check : Copy}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        }
      }}
    >
      {done ? 'Copied' : label}
    </Button>
  )
}
