import React from 'react';
import { getActionDefinition, useHasPermission } from './ActionRegistry';

export interface BulkActionMenuProps {
  actions: string[];
  selectedCount: number;
  onAction: (action: string) => void;
  disabled?: boolean;
}

export function BulkActionMenu({ actions, selectedCount, onAction, disabled }: BulkActionMenuProps) {
  const hasPermission = useHasPermission();

  const availableActions = actions.filter(actionId => {
    const def = getActionDefinition(actionId);
    return hasPermission(def.permissions);
  });

  if (availableActions.length === 0 || selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shadow-sm">
      <span className="text-sm font-medium text-indigo-300 ml-2">
        {selectedCount} selected
      </span>
      <div className="w-px h-6 bg-indigo-500/20"></div>
      <div className="flex flex-wrap items-center gap-2">
        {availableActions.map(actionId => {
          const def = getActionDefinition(actionId);
          const Icon = def.icon;
          
          const buttonColorClasses = {
            primary: 'text-indigo-300 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 focus:ring-indigo-500',
            danger: 'text-red-400 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 focus:ring-red-500',
            warning: 'text-amber-400 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 focus:ring-amber-500',
            success: 'text-emerald-400 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 focus:ring-emerald-500',
            default: 'text-zinc-300 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 focus:ring-zinc-500',
          };
          
          const colorClass = def.color ? buttonColorClasses[def.color] : buttonColorClasses.default;

          return (
            <button
              key={actionId}
              onClick={() => onAction(actionId)}
              disabled={disabled}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {def.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
