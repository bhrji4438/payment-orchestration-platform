import { 
  LucideIcon, 
  Edit, 
  Trash2, 
  Eye, 
  Copy, 
  RefreshCw, 
  Download, 
  FileText, 
  Printer,
  CheckCircle, 
  XCircle,
  Undo2,
  Check
} from 'lucide-react';

export type ActionVariant = 'text' | 'icon' | 'full';

export interface ActionDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  variant: ActionVariant;
  permissions?: string[];
  color?: 'primary' | 'danger' | 'warning' | 'success' | 'default';
}

export const actionRegistry: Record<string, ActionDefinition> = {
  view: {
    id: 'view',
    label: 'View Details',
    icon: Eye,
    variant: 'icon',
    color: 'default',
  },
  viewReceipt: {
    id: 'viewReceipt',
    label: 'View Receipt',
    icon: FileText,
    variant: 'icon',
    color: 'default',
  },
  viewDetails: {
    id: 'viewDetails',
    label: 'View Details',
    icon: Eye,
    variant: 'icon',
    color: 'default',
  },
  printReceipt: {
    id: 'printReceipt',
    label: 'Print Receipt',
    icon: Printer,
    variant: 'icon',
    color: 'default',
  },
  edit: {
    id: 'edit',
    label: 'Edit',
    icon: Edit,
    variant: 'icon',
    color: 'primary',
  },
  delete: {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'icon',
    color: 'danger',
  },
  clone: {
    id: 'clone',
    label: 'Clone',
    icon: Copy,
    variant: 'icon',
    color: 'default',
  },
  retry: {
    id: 'retry',
    label: 'Retry',
    icon: RefreshCw,
    variant: 'icon',
    color: 'warning',
  },
  download: {
    id: 'download',
    label: 'Download',
    icon: Download,
    variant: 'icon',
    color: 'default',
  },
  export: {
    id: 'export',
    label: 'Export',
    icon: FileText,
    variant: 'icon',
    color: 'default',
  },
  activate: {
    id: 'activate',
    label: 'Activate',
    icon: CheckCircle,
    variant: 'icon',
    color: 'success',
  },
  deactivate: {
    id: 'deactivate',
    label: 'Deactivate',
    icon: XCircle,
    variant: 'icon',
    color: 'danger',
  },
  refund: {
    id: 'refund',
    label: 'Refund',
    icon: Undo2,
    variant: 'icon',
    color: 'warning',
  },
  capture: {
    id: 'capture',
    label: 'Capture',
    icon: Check,
    variant: 'icon',
    color: 'success',
  },
  void: {
    id: 'void',
    label: 'Void',
    icon: XCircle,
    variant: 'icon',
    color: 'danger',
  }
};

export function getActionDefinition(actionId: string): ActionDefinition {
  const action = actionRegistry[actionId];
  if (!action) {
    throw new Error(`Action "${actionId}" is not defined in the ActionRegistry.`);
  }
  return action;
}

// Temporary hook for RBAC, currently always returns true as requested by user.
export function useHasPermission() {
  return (permissions?: string[]) => {
    if (!permissions || permissions.length === 0) return true;
    return true; 
  };
}
