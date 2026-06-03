import { ReactNode } from 'react';

export type ColumnType = 
  | 'text' 
  | 'badge' 
  | 'status' 
  | 'currency' 
  | 'amount' 
  | 'percentage' 
  | 'date' 
  | 'datetime' 
  | 'boolean' 
  | 'avatar' 
  | 'icon' 
  | 'link' 
  | 'email' 
  | 'phone' 
  | 'custom';

export interface ColumnDefinition<T = any> {
  key: Extract<keyof T, string> | string;
  label: string;
  type: ColumnType;
  sortable?: boolean;
  hidden?: boolean;
  format?: (value: any, row: T) => ReactNode; // Custom formatter override
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableSchema<T = any> {
  columns: ColumnDefinition<T>[];
  rowActions?: string[] | ((row: T) => string[]);
  bulkActions?: string[];
}
