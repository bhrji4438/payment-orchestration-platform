import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { getActionDefinition, useHasPermission } from './ActionRegistry';

export interface ActionDropdownProps {
  actions: string[];
  onAction: (action: string) => void;
  disabled?: boolean;
}

export function ActionDropdown({ actions, onAction, disabled }: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasPermission = useHasPermission();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableActions = actions.filter(actionId => {
    const def = getActionDefinition(actionId);
    return hasPermission(def.permissions);
  });

  if (availableActions.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center p-2 text-zinc-400 rounded-md hover:text-zinc-200 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 w-48 mt-2 origin-top-right bg-zinc-900 border border-zinc-800 rounded-md shadow-lg outline-none overflow-hidden">
          <div className="py-1">
            {availableActions.map(actionId => {
              const def = getActionDefinition(actionId);
              const Icon = def.icon;
              
              const colorClasses = {
                primary: 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10',
                danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
                warning: 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
                success: 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10',
                default: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
              };
              
              const textColorClass = def.color ? colorClasses[def.color] : colorClasses.default;

              return (
                <button
                  key={actionId}
                  onClick={() => {
                    setIsOpen(false);
                    onAction(actionId);
                  }}
                  className={`flex items-center w-full px-4 py-2 text-sm ${textColorClass} transition-colors`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {def.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
