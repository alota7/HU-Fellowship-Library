import { useId } from 'react'
import { useTranslation } from '../../context/LanguageContext'
import { formatFileSize } from '../../utils/format'

export default function FileInput({
  label,
  accept,
  hint,
  error,
  required,
  file,
  fileName,
  progress = null,
  onSelect,
  onRemove,
  disabled,
}) {
  const { t } = useTranslation()
  const id = useId()
  const currentName = file?.name || fileName || ''

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        onChange={(event) => onSelect(event.target.files?.[0] || null)}
        className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-800 hover:border-brand-400"
      />

      {currentName && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{currentName}</p>
            {file && (
              <p className="text-xs text-slate-500">
                {t('file.size')}: {formatFileSize(file.size)}
              </p>
            )}
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              {t('action.remove')}
            </button>
          )}
        </div>
      )}

      {progress !== null && progress >= 0 && progress < 100 && (
        <div className="mt-2">
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('file.uploadProgress')}
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
          >
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {t('file.uploadProgress')}: {progress}%
          </p>
        </div>
      )}

      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  )
}
