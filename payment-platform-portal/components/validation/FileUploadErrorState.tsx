import React, { InputHTMLAttributes, forwardRef } from 'react';
import { useValidationContext } from './ValidationField';

export interface FileUploadErrorStateProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  isTouched?: boolean;
  isValid?: boolean;
}

export const FileUploadErrorState = forwardRef<HTMLInputElement, FileUploadErrorStateProps>(
  ({ className = '', error: customError, isTouched: customTouched, isValid: customValid, id: customId, ...props }, ref) => {
    const context = useValidationContext();
    const error = customError !== undefined ? customError : context.error;
    const isTouched = customTouched !== undefined ? customTouched : context.isTouched;
    const isValid = customValid !== undefined ? customValid : context.isValid;
    const id = customId || context.id;

    const hasError = !!(isTouched && error);
    const hasSuccess = !!(isTouched && !error && isValid);

    const borderClass = hasError
      ? 'border-[#EF4444] border-[1.5px]'
      : hasSuccess
      ? 'border-[#22C55E]'
      : 'border-zinc-800 focus-within:border-indigo-500';

    return (
      <div className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors ${borderClass} ${className}`}>
        <input
          ref={ref}
          id={id}
          type="file"
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className="w-full focus:outline-none cursor-pointer text-zinc-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"
          {...props}
        />
      </div>
    );
  }
);

FileUploadErrorState.displayName = 'FileUploadErrorState';
