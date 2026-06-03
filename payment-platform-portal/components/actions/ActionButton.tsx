import React from 'react';
import { getActionDefinition, useHasPermission } from './ActionRegistry';

export interface ActionButtonProps {
  action: string;
  variant?: 'text' | 'icon' | 'full';
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function ActionButton({ action, variant, onClick, disabled, className = '' }: ActionButtonProps) {
  const definition = getActionDefinition(action);
  const hasPermission = useHasPermission();

  if (!hasPermission(definition.permissions)) {
    return null;
  }

  const btnVariant = variant || definition.variant;
  const Icon = definition.icon;

  const colorClasses = {
    primary: 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20',
    danger: 'text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20',
    warning: 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20',
    success: 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20',
    default: 'text-zinc-400 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800',
  };

  const selectedColorClass = definition.color ? colorClasses[definition.color] : colorClasses.default;
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const baseClasses = `inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-zinc-950 ${selectedColorClass} ${disabledClass} ${className}`;

  if (btnVariant === 'icon') {
    return (
      <button 
        type="button" 
        onClick={onClick} 
        disabled={disabled}
        title={definition.label}
        className={`${baseClasses} p-2`}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  if (btnVariant === 'text') {
    return (
      <button 
        type="button" 
        onClick={onClick} 
        disabled={disabled}
        className={`${baseClasses} px-3 py-1.5 text-sm bg-transparent hover:bg-zinc-800/50`}
      >
        {definition.label}
      </button>
    );
  }

  return (
    <button 
      type="button" 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseClasses} px-3 py-1.5 text-sm gap-2`}
    >
      <Icon className="w-4 h-4" />
      <span>{definition.label}</span>
    </button>
  );
}
