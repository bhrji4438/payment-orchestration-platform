import React, { HTMLAttributes, forwardRef } from 'react';
import { useValidationContext } from './ValidationField';

export interface RadioGroupErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  error?: string;
  isTouched?: boolean;
}

export const RadioGroupErrorState = forwardRef<HTMLDivElement, RadioGroupErrorStateProps>(
  ({ className = '', error: customError, isTouched: customTouched, id: customId, children, ...props }, ref) => {
    const context = useValidationContext();
    const error = customError !== undefined ? customError : context.error;
    const isTouched = customTouched !== undefined ? customTouched : context.isTouched;
    const id = customId || context.id;

    const hasError = !!(isTouched && error);

    return (
      <div
        ref={ref}
        id={id}
        role="radiogroup"
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`space-y-2 p-2 rounded-lg border transition-colors ${
          hasError ? 'border-[#EF4444] border-[1.5px]' : 'border-transparent'
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

RadioGroupErrorState.displayName = 'RadioGroupErrorState';
