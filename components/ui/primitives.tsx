import React, {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  HTMLAttributes,
  TableHTMLAttributes,
  ReactNode,
} from 'react';

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];

  return (
    <button
      className={`btn ${variantClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          style={{
            display: 'inline-block',
            width: '15px',
            height: '15px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  id,
  hint,
  error,
  suffixAction,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  suffixAction?: ReactNode;
}) {
  return (
    <label className={`field ${className}`} htmlFor={id}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {hint && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{hint}</span>}
      </span>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          className={`input${suffixAction ? ' input-with-suffix' : ''}${error ? ' input-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {suffixAction && (
          <div style={{ position: 'absolute', right: '4px', display: 'flex', alignItems: 'center' }}>
            {suffixAction}
          </div>
        )}
      </div>
      {error && (
        <span
          id={`${id}-error`}
          style={{ fontSize: 'var(--text-xs)', color: 'var(--urgency-high)', fontWeight: 600 }}
          role="alert"
        >
          {error}
        </span>
      )}
    </label>
  );
}

export function Notice({
  tone = 'info',
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: 'info' | 'warning' | 'danger' | 'success';
}) {
  const toneClass = {
    info: '',
    warning: 'notice-warning',
    danger: 'notice-danger',
    success: 'notice-success',
  }[tone];

  return (
    <div className={`notice ${toneClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Card({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Section({
  title,
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  title?: string;
}) {
  return (
    <section className={`section ${className}`} {...props}>
      {title && <h2 className="section-heading">{title}</h2>}
      {children}
    </section>
  );
}

export function Table({
  className = '',
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="table-scroll">
      <table className={`data-table ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Badge({
  urgency,
  children,
  className = '',
}: {
  urgency: string;
  children?: ReactNode;
  className?: string;
}) {
  const level = urgency?.toLowerCase();
  const validLevel = ['low', 'medium', 'high'].includes(level) ? level : 'unknown';
  return (
    <span
      className={`badge badge-${validLevel} ${className}`}
      aria-label={typeof children === 'string' ? children : urgency}
    >
      {children || urgency || 'Not available'}
    </span>
  );
}

export function Skeleton({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = '',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`empty-state ${className}`}
      style={{
        padding: '48px 32px',
        textAlign: 'center',
        display: 'grid',
        placeItems: 'center',
        gap: '16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {icon && (
        <div
          style={{
            color: 'var(--text-muted)',
            padding: '14px',
            background: 'var(--bg-canvas)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: 'var(--text-heading)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          maxWidth: '380px',
          margin: 0,
        }}
      >
        {description}
      </p>
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}
