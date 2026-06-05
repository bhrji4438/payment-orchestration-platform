import React, { useState } from 'react';
import { TableSchema } from './DataTableSchema';
import { formatCell } from './DataTableFormatters';
import { useDataTable } from './useDataTable';
import { ActionButton, ActionDropdown, BulkActionMenu } from '@components/actions';
import { ChevronUp, ChevronDown, Search, Loader2 } from 'lucide-react';

export interface DataTableProps<T> {
  schema: TableSchema<T>;
  endpoint: string;
  additionalParams?: Record<string, any>;
  filters?: React.ReactNode;
  idField?: string;
  title?: string;
  description?: string;
  onRowAction?: (actionId: string, row: T) => void;
  onBulkAction?: (actionId: string, selectedIds: string[]) => void;
}

export function DataTable<T>({ 
  schema, 
  endpoint, 
  additionalParams,
  filters,
  idField = 'id', 
  title, 
  description,
  onRowAction,
  onBulkAction
}: DataTableProps<T>) {
  const {
    data,
    pagination,
    isLoading,
    error,
    page,
    setPage,
    search,
    setSearch,
    sort,
    order,
    handleSort,
    selectedRows,
    handleSelectAll,
    handleSelectRow,
    clearSelection
  } = useDataTable<T>({ endpoint, additionalParams });

  const [searchInput, setSearchInput] = useState(search);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleBulkAction = (actionId: string) => {
    if (onBulkAction) {
      onBulkAction(actionId, Array.from(selectedRows) as string[]);
      clearSelection();
    }
  };

  const allSelected = data.length > 0 && selectedRows.size === data.length;
  const visibleColumns = schema.columns.filter(c => !c.hidden);

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-400 rounded-md border border-red-500/20">
        Error loading data. Please try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-zinc-900 border border-zinc-800 shadow-sm sm:rounded-2xl overflow-hidden">
      {/* Header Section */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {title && <h2 className="text-lg font-medium text-zinc-50">{title}</h2>}
            </div>

            <div className="w-full sm:w-auto">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  className="block w-full sm:w-80 pl-10 pr-3 py-2 border border-zinc-800 rounded-lg leading-5 bg-zinc-950 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors sm:text-sm"
                  placeholder="Search transactions..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="hidden">Search</button>
              </form>
            </div>
          </div>

          {description && <p className="text-sm text-zinc-400">{description}</p>}

          {filters && (
            <div className="w-full">
              {filters}
            </div>
          )}

          <div className="flex justify-between items-center">
            {schema.bulkActions && schema.bulkActions.length > 0 && selectedRows.size > 0 && (
              <BulkActionMenu 
                actions={schema.bulkActions}
                selectedCount={selectedRows.size}
                onAction={handleBulkAction}
              />
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto relative">
        <table className="w-full table-auto text-left border-collapse">
          <thead className="bg-zinc-950/50">
            <tr className="border-b border-zinc-800">
              {/* Checkbox Column */}
              {schema.bulkActions && schema.bulkActions.length > 0 && (
                <th scope="col" className="px-4 py-4 w-12 text-left">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-500 bg-zinc-900 border-zinc-700 rounded focus:ring-indigo-500 focus:ring-offset-zinc-900"
                    checked={allSelected}
                    onChange={() => handleSelectAll(data, idField)}
                  />
                </th>
              )}

              {/* Data Columns */}
              {visibleColumns.map((column) => (
                <th
                  key={column.key as string}
                  scope="col"
                  className={`px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'} ${column.sortable ? 'cursor-pointer hover:text-zinc-300 transition-colors' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key as string)}
                >
                  <div className={`flex items-center gap-1.5 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{column.label}</span>
                    {column.sortable && sort === column.key && (
                      order === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
              ))}

              {/* Actions Column */}
              {schema.rowActions && (
                <th scope="col" className="relative px-4 py-4 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-zinc-800/50">
            {isLoading && data.length === 0 ? (
              <tr>
                <td colSpan={100} className="px-4 py-12 text-center">
                  <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                  <p className="mt-2 text-sm text-zinc-500">Loading data...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={100} className="px-4 py-12 text-center">
                  <p className="text-sm text-zinc-500">No records found.</p>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = (row as any)[idField];
                const isSelected = selectedRows.has(rowId);

                return (
                  <tr key={rowId || rowIndex} className={`hover:bg-zinc-800/20 transition-colors ${isSelected ? 'bg-indigo-500/10' : ''}`}>
                    {/* Checkbox */}
                    {schema.bulkActions && schema.bulkActions.length > 0 && (
                      <td className="px-4 py-4 whitespace-nowrap w-12">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-500 bg-zinc-900 border-zinc-700 rounded focus:ring-indigo-500 focus:ring-offset-zinc-900"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowId)}
                        />
                      </td>
                    )}

                    {/* Cells */}
                    {visibleColumns.map((column) => (
                      <td 
                        key={column.key as string} 
                        className={`px-4 py-4 align-top break-words ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {column.format 
                          ? column.format((row as any)[column.key], row)
                          : formatCell((row as any)[column.key], column.type, row)
                        }
                      </td>
                    ))}

                    {/* Actions */}
                    {schema.rowActions && (() => {
                      const currentRowActions = typeof schema.rowActions === 'function' 
                        ? schema.rowActions(row) 
                        : schema.rowActions;
                      
                      if (!currentRowActions || currentRowActions.length === 0) return null;

                      return (
                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Show up to 2 primary actions as buttons, rest in dropdown */}
                            {currentRowActions.slice(0, 2).map((actionId) => (
                              <ActionButton
                                key={actionId}
                                action={actionId}
                                onClick={() => onRowAction && onRowAction(actionId, row)}
                              />
                            ))}
                            {currentRowActions.length > 2 && (
                              <ActionDropdown
                                actions={currentRowActions.slice(2)}
                                onAction={(actionId) => onRowAction && onRowAction(actionId, row)}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })()}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {/* Loading overlay for subsequent fetches */}
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Pagination Section */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-950/50 border-t border-zinc-800">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-zinc-500">
              Showing <span className="font-medium text-zinc-300">{(page - 1) * pagination.pageSize + 1}</span> to <span className="font-medium text-zinc-300">{Math.min(page * pagination.pageSize, pagination.total)}</span> of{' '}
              <span className="font-medium text-zinc-300">{pagination.total}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex shadow-sm gap-1" aria-label="Pagination">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-1.5 text-sm font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                <span className="sr-only">Previous</span>
                <ChevronUp className="w-4 h-4 -rotate-90" aria-hidden="true" />
              </button>
              
              {/* Simple page numbers */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum = page;
                if (page <= 3) pageNum = i + 1;
                else if (page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                else pageNum = page - 2 + i;

                if (pageNum <= 0 || pageNum > pagination.totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`relative inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${pageNum === page ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="relative inline-flex items-center px-2 py-1.5 text-sm font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                <span className="sr-only">Next</span>
                <ChevronDown className="w-4 h-4 -rotate-90" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
