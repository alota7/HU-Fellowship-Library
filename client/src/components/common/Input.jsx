import { useId } from 'react'
import { useTranslation } from '../../context/LanguageContext'

export function Field({ label, htmlFor, required, error, hint, children }) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> ({t('ui.required')})</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  )
}

export default function Input({ label, error, hint, required, className = '', ...props }) {
  const generatedId = useId()
  const id = props.id || generatedId

  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={`field-control ${error ? 'field-control-invalid' : ''} ${className}`}
        {...props}
      />
    </Field>
  )
}

export function Textarea({ label, error, hint, required, className = '', ...props }) {
  const generatedId = useId()
  const id = props.id || generatedId

  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <textarea
        id={id}
        rows={4}
        aria-invalid={error ? 'true' : undefined}
        className={`field-control ${error ? 'field-control-invalid' : ''} ${className}`}
        {...props}
      />
    </Field>
  )
}

export function Select({ label, error, hint, required, options = [], className = '', ...props }) {
  const generatedId = useId()
  const id = props.id || generatedId

  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <select
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={`field-control ${error ? 'field-control-invalid' : ''} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function Checkbox({ label, error, className = '', ...props }) {
  const generatedId = useId()
  const id = props.id || generatedId
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          className={`mt-1 size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600 ${className}`}
          {...props}
        />
        <label htmlFor={id} className="text-sm text-slate-700">
          {label}
        </label>
      </div>
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  )
}
