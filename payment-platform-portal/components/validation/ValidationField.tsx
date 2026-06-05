import React, { createContext, useContext } from 'react';
import { ValidationMessage } from './ValidationMessage';

export interface ValidationContextType {
  error?: string;
  isTouched?: boolean;
  isValid?: boolean;
  id?: string;
}

const ValidationContext = createContext<ValidationContextType>({});

export const useValidationContext = () => useContext(ValidationContext);

export interface ValidationFieldProps {
  id: string;
  label?: React.ReactNode;
  error?: string;
  isTouched?: boolean;
  isValid?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const ValidationField: React.FC<ValidationFieldProps> = ({
  id,
  label,
  error,
  isTouched,
  isValid,
  className = '',
  children
}) => {
  const errorId = `${id}-error`;
  const contextValue = { error, isTouched, isValid, id };

  return (
    <ValidationContext.Provider value={contextValue}>
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-zinc-400 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">{children}</div>
        <ValidationMessage id={errorId} error={isTouched ? error : undefined} />
      </div>
    </ValidationContext.Provider>
  );
};
