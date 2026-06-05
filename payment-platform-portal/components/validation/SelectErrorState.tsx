import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { useValidationContext } from './ValidationField';

export interface SelectErrorStateProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  isTouched?: boolean;
  isValid?: boolean;
}

export const SelectErrorState = forwardRef<HTMLSelectElement, SelectErrorStateProps>(
  ({ className = '', error: customError, isTouched: customTouched, isValid: customValid, id: customId, children, ...props }, ref) => {
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
      <select
        ref={ref}
        id={id}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none transition-colors ${borderClass} ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);

SelectErrorState.displayName = 'SelectErrorState';
