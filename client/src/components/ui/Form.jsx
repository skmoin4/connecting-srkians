import { forwardRef, useId } from 'react';
import { cn } from '../../utils/format.js';

export function Field({ label, error, hint, required, children, className, id }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-fog-200">
          {label}
          {required && <span className="ml-0.5 text-crimson-400" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-crimson-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-fog-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export const Input = forwardRef(function Input({ label, error, hint, required, className, fieldClassName, id: idProp, icon: Icon, ...props }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} id={id} className={className}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog-500" aria-hidden />}
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          aria-required={required || undefined}
          className={cn('field', Icon && 'pl-10', fieldClassName)}
          {...props}
        />
      </div>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className, id: idProp, rows = 4, ...props }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} id={id} className={className}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        className="field resize-y leading-relaxed"
        {...props}
      />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, required, className, id: idProp, options = [], placeholder, children, ...props }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} id={id} className={className}>
      <select ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} className="field" {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
    </Field>
  );
});

export function Switch({ checked, onChange, label, description, disabled, id: idProp }) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-fog-100">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-fog-400">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
          checked ? 'border-gold-500 bg-gold-500' : 'border-white/15 bg-ink-700'
        )}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );
}
