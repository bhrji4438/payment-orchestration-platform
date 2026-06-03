import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PaginatedResponse, PaginationParams } from '@shared/contracts/pagination.contract';

export interface UseDataTableOptions {
  endpoint: string;
  initialPageSize?: number;
  additionalParams?: Record<string, any>;
}

export function useDataTable<T>({ endpoint, initialPageSize = 10, additionalParams = {} }: UseDataTableOptions) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<string | undefined>();
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());

  const params: PaginationParams = {
    page,
    pageSize,
    ...(sort && { sort }),
    ...(order && { order }),
    ...(search && { search }),
    ...additionalParams,
  };

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<T>>({
    queryKey: [endpoint, params],
    queryFn: async () => {
      const response = await api.get(endpoint, { params });
      const data = response.data;
      // Handle standard contract
      if (data.pagination) {
        return data as PaginatedResponse<T>;
      }
      // Handle legacy cursor/array responses
      const items = Array.isArray(data) ? data : (data.data || []);
      return {
        data: items,
        pagination: {
          page,
          pageSize,
          total: data.total || items.length * page + (data.nextCursor ? 1 : 0),
          totalPages: data.totalPages || page + (data.nextCursor ? 1 : 0),
        }
      } as PaginatedResponse<T>;
    },
    // Keep previous data when fetching new page for smooth transition
    placeholderData: (previousData) => previousData,
  });

  const handleSort = (key: string) => {
    if (sort === key) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(key);
      setOrder('desc');
    }
  };

  const handleSelectAll = (items: any[], idField: string) => {
    if (selectedRows.size === items.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(items.map(item => item[idField])));
    }
  };

  const handleSelectRow = (id: string | number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  return {
    data: data?.data || [],
    pagination: data?.pagination || { page: 1, pageSize, total: 0, totalPages: 0 },
    isLoading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    sort,
    order,
    handleSort,
    selectedRows,
    handleSelectAll,
    handleSelectRow,
    clearSelection,
    refetch,
  };
}
