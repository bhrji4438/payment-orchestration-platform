import React, { FormHTMLAttributes, forwardRef } from 'react';

export interface FormErrorWrapperProps extends FormHTMLAttributes<HTMLFormElement> {}

export const FormErrorWrapper = forwardRef<HTMLFormElement, FormErrorWrapperProps>(
  ({ children, ...props }, ref) => {
    return (
      <form ref={ref} noValidate {...props}>
        {children}
      </form>
    );
  }
);

FormErrorWrapper.displayName = 'FormErrorWrapper';
