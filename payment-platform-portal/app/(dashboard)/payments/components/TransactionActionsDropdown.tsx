'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { getActionDefinition, useHasPermission } from '@components/actions/ActionRegistry';
import { getTransactionActions, TransactionAction } from '@shared/transactions/transaction-lifecycle';

interface TransactionActionsDropdownProps {
  transaction: {
    status: string;
    type?: string | null;
    refundableAmount?: number | string | null;
    availableActions?: TransactionAction[];
  };
  onAction: (action: TransactionAction) => void;
}

export function TransactionActionsDropdown({ transaction, onAction }: TransactionActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasPermission = useHasPermission();
  const actions = transaction.availableActions || getTransactionActions(transaction);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fallbackActions = getTransactionActions(transaction);
  const availableActions = (actions && actions.length > 0 ? actions : fallbackActions)
    .filter(action => hasPermission(getActionDefinition(action).permissions));

  if (availableActions.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-medium text-zinc-200 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Transaction actions"
      >
        <MoreVertical className="h-4 w-4" />
        <span>Actions</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-md border border-zinc-800 bg-zinc-900 shadow-lg" role="menu">
          <div className="py-1">
            {availableActions.map(action => {
              const definition = getActionDefinition(action);
              const Icon = definition.icon;

              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAction(action);
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                  role="menuitem"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {definition.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
