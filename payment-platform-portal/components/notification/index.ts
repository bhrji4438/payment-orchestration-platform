/**
 * @file index.ts
 * @description Barrel exports for the notification system.
 * Import everything through this alias: @components/notification
 */

export { NotificationProvider, useNotification, useToasts } from './NotificationContext';
export { ToastContainer } from './ToastContainer';
export { NotificationService } from './notification.service';
export type { Toast, ToastVariant } from './notification.service';
