import React, { InputHTMLAttributes, forwardRef } from 'react';
import { useValidationContext } from './ValidationField';

export interface CheckboxErrorStateProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  isTouched?: boolean;
  isValid?: boolean;
}

export const CheckboxErrorState = forwardRef<HTMLInputElement, CheckboxErrorStateProps>(
  ({ className = '', error: customError, isTouched: customTouched, isValid: customValid, id: customId, ...props }, ref) => {
    const context = useValidationContext();
    const error = customError !== undefined ? customError : context.error;
    const isTouched = customTouched !== undefined ? customTouched : context.isTouched;
    const isValid = customValid !== undefined ? customValid : context.isValid;
    const id = customId || context.id;

    const hasError = !!(isTouched && error);

    const borderClass = hasError
      ? 'border-[#EF4444] border-[1.5px] focus:ring-[#EF4444]'
      : 'border-zinc-800 text-indigo-500 focus:ring-indigo-500';

    return (
      <input
        ref={ref}
        id={id}
        type="checkbox"
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`rounded bg-zinc-950 border h-4 w-4 cursor-pointer focus:ring-1 transition-colors ${borderClass} ${className}`}
        {...props}
      />
    );
  }
);

CheckboxErrorState.displayName = 'CheckboxErrorState';
