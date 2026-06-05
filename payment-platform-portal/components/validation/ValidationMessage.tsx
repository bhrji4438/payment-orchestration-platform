import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ValidationMessageProps {
  id?: string;
  error?: string;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({ id, error }) => {
  if (!error) return null;
  return (
    <div
      id={id}
      role="alert"
      className="text-[#F87171] text-xs font-normal mt-1 flex items-center gap-1.5 animate-in fade-in duration-200"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{error}</span>
    </div>
  );
};
