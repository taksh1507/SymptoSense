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
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
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
      <span className="flex items-center justify-between">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      </span>
      <div className="relative flex items-center">
        <input
          id={id}
          className={`input ${suffixAction ? '!pr-10' : ''} ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {suffixAction && (
          <div className="absolute right-2.5 flex items-center">
            {suffixAction}
          </div>
        )}
      </div>
      {error && <span id={`${id}-error`} className="text-xs text-red-600 font-medium" role="alert">{error}</span>}
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
    info: 'notice-info',
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
  const level = urgency.toLowerCase();
  const validLevel = ['low', 'medium', 'high'].includes(level) ? level : 'low';
  return (
    <span
      className={`badge badge-${validLevel} ${className}`}
      aria-label={typeof children === 'string' ? children : urgency}
    >
      {children || urgency}
    </span>
  );
}

export function Skeleton({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
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
    <div className={`p-8 text-center grid place-items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-xs ${className}`}>
      {icon && <div className="text-slate-400 p-3 bg-slate-50 rounded-full">{icon}</div>}
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
