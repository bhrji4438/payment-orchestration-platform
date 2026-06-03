# DataTable and Action Framework

This document outlines the architecture and usage of the unified DataTable and Action Framework for the platform frontend. This framework is the **single source of truth** for rendering data tables and actions. **Page-specific table implementations are strictly prohibited.**

## Architecture

The framework is composed of three main layers:
1. **Action Framework**: A centralized, permission-aware registry for all user actions (`@components/actions`).
2. **DataTable Framework**: A schema-driven table component that consumes generic API endpoints (`@components/datatable`).
3. **API Contracts**: Standardized backend responses ensuring seamless integration with the data table.

### 1. Action Framework

The Action Framework is designed to prevent duplicate UI components for common actions (Edit, Delete, View, etc.). It centralizes action metadata (icons, labels, colors, and permissions) in `ActionRegistry.ts`.

#### Components

* `ActionButton`: Renders a single action as an icon, text, or full button. It automatically checks RBAC permissions.
* `ActionDropdown`: Renders a dropdown menu for multiple actions, hiding those the user is not authorized to perform.
* `BulkActionMenu`: Renders available actions when multiple rows are selected.

#### Example Usage

```tsx
import { ActionButton, ActionDropdown } from '@components/actions';

<ActionButton action="edit" onClick={() => handleEdit()} />
<ActionDropdown actions={['view', 'edit', 'delete']} onAction={(action) => handleAction(action)} />
```

### 2. DataTable Framework

The `DataTable` component generates tables dynamically based on a provided schema and fetches data directly from the given endpoint. It supports server-side pagination, sorting, and search.

#### Schema Definition

The table schema defines the columns, their types, and any associated actions.

```typescript
import { TableSchema } from '@components/datatable';

const myTableSchema: TableSchema<MyDataType> = {
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'amount', label: 'Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'createdAt', label: 'Date', type: 'datetime' }
  ],
  rowActions: ['view', 'edit', 'delete'],
  bulkActions: ['delete']
};
```

#### Table Usage

```tsx
import { DataTable } from '@components/datatable';

<DataTable
  title="My Data"
  schema={myTableSchema}
  endpoint="/v1/my-data"
  idField="id"
  onRowAction={(action, row) => handleRowAction(action, row)}
  onBulkAction={(action, ids) => handleBulkAction(action, ids)}
/>
```

### 3. API Contract

The `DataTable` expects the backend to return a standardized paginated response.

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

*Note: For legacy endpoints using cursor-based pagination, the `useDataTable` hook automatically adapts the response to fit this structure.*

## Best Practices

1. **Schema Driven**: Always define table columns in a schema object outside the component render cycle.
2. **API Driven**: Never pass static data to the table. Let the table fetch its own data via the `endpoint` prop.
3. **Formatters**: Use the built-in column types (`text`, `currency`, `status`, `date`, etc.). Only use `custom` type for complex composite cells (like a user avatar next to a name).
4. **Permissions**: Do not manually duplicate permission checks on buttons. The Action Framework handles it automatically.
