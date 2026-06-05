import React, { InputHTMLAttributes, forwardRef } from 'react';
import { useValidationContext } from './ValidationField';

export interface DatePickerErrorStateProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  isTouched?: boolean;
  isValid?: boolean;
}

export const DatePickerErrorState = forwardRef<HTMLInputElement, DatePickerErrorStateProps>(
  ({ className = '', error: customError, isTouched: customTouched, isValid: customValid, id: customId, ...props }, ref) => {
    const context = useValidationContext();
    const error = customError !== undefined ? customError : context.error;
    const isTouched = customTouched !== undefined ? customTouched : context.isTouched;
    const isValid = customValid !== undefined ? customValid : context.isValid;
    const id = customId || context.id;

    const hasError = !!(isTouched && error);
    const hasSuccess = !!(isTouched && !error && isValid);

    const borderClass = hasError
      ? 'border-[#EF4444] border-[1.5px] focus:border-[#EF4444] focus:ring-[#EF4444]'
      : hasSuccess
      ? 'border-[#22C55E] border-[1.5px] focus:border-[#22C55E] focus:ring-[#22C55E]'
      : 'border-zinc-800 focus:border-indigo-500';

    return (
      <input
        ref={ref}
        id={id}
        type="date"
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none transition-colors ${borderClass} ${className}`}
        {...props}
      />
    );
  }
);

DatePickerErrorState.displayName = 'DatePickerErrorState';
