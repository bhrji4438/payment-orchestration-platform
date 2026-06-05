# Validation & Notification Standard

This document defines the portal-wide rules for form validation, error display, user feedback, and user-facing string management in `payment-platform-portal`.

**See also**: [Development Rules § 12](../development/development-rules.md), [Design Patterns § 14–16](../design_patterns.md)

---

## Architecture Overview

```
app/lib/
├── messages.ts              ← Single source of truth for all user-facing strings
└── api.ts                   ← + handleApiError() — centralized error routing

components/
├── notification/
│   ├── notification.service.ts   ← Singleton (no React dependency)
│   ├── NotificationContext.tsx   ← React provider + useNotification() hook
│   ├── Toast.tsx                 ← Individual toast component
│   ├── ToastContainer.tsx        ← Fixed portal, bottom-right of viewport
│   └── index.ts                  ← Barrel exports (@components/notification)
└── validation/
    ├── useFormValidation.ts       ← Central form state engine
    ├── ValidationField.tsx        ← Field label + inline error wrapper
    ├── InputErrorState.tsx        ← Input styling with error/valid states
    ├── SelectErrorState.tsx       ← Select styling with error/valid states
    ├── CheckboxErrorState.tsx     ← Checkbox styling
    ├── ValidationMessage.tsx      ← Inline error message (for submit errors on auth forms only)
    ├── FormErrorWrapper.tsx       ← <form noValidate> wrapper
    └── index.ts                   ← Barrel exports (@components/validation)
```

---

## 1. Message Registry

`app/lib/messages.ts` is the **only** place where user-facing strings are defined.

### Structure

```typescript
// Tag-based generic factories — parameterized templates
GENERIC.REQUIRED('Email address')          // "Email address is required"
GENERIC.SUCCESS('Customer', 'created')     // "Customer created successfully"
GENERIC.FAILED('rotate API key')           // "Failed to rotate API key"

// Domain namespaces — direct constants
Messages.VALIDATION.EMAIL_INVALID          // "Invalid email address"
Messages.GATEWAY.CREATE_SUCCESS            // "Gateway configuration saved"
Messages.SYSTEM.NETWORK_ERROR              // "A network error occurred..."
```

### Domain Namespaces

| Namespace | Purpose |
|---|---|
| `GENERIC` | Tag-based parameterized factories |
| `FIELD` | Canonical field name constants used in GENERIC factories |
| `VALIDATION` | Field-level inline validation messages (used in Zod schemas) |
| `AUTH` | Login, signup, session expiry messages |
| `CUSTOMER` | Customer CRUD success/failure messages |
| `GATEWAY` | Gateway CRUD, circuit-reset messages |
| `PAYMENT` | Transaction processing messages |
| `DEVELOPER` | API key management messages |
| `SYSTEM` | Network errors, server errors, unknown errors |

### Adding New Messages

1. Add to the appropriate domain namespace in `messages.ts`
2. Use `GENERIC.*` factories where the pattern matches — do not write a new literal string if a factory covers it
3. Add new domain namespace if a new feature area warrants it
4. Include the domain in the `Messages` composite export at the bottom of the file

---

## 2. Validation System

### Rules

| Rule | Requirement |
|---|---|
| Error location | Always inline, directly below the field. Never banners, modals, or toasts |
| Trigger: blur | Validate field on focus-out |
| Trigger: change | Re-validate if field already has an error |
| Trigger: submit | Validate all fields; focus + scroll to first error |
| Error styling | `#EF4444` border, `#F87171` text, `AlertCircle` icon, 12px |
| Valid styling | `#22C55E` border (after touched + valid) |

### Standard Form Pattern

```tsx
import {
  useFormValidation,
  ValidationField,
  InputErrorState,
  SelectErrorState,
  FormErrorWrapper
} from '@components/validation';
import { Messages } from '@/lib/messages';
import { handleApiError } from '@/lib/api';
import { z } from 'zod';

// 1. Define schema using Messages registry
const Schema = z.object({
  email: z.string().min(1, Messages.VALIDATION.EMAIL_REQUIRED).email(Messages.VALIDATION.EMAIL_INVALID),
});

// 2. Initialize hook
const { values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldError, isFieldValid } =
  useFormValidation({
    initialValues: { email: '' },
    validationSchema: Schema,
    onSubmit: async (formValues) => {
      try {
        await myApi.create(formValues);
        // redirect or success toast
      } catch (err) {
        handleApiError(err, setFieldError, Messages.CUSTOMER.CREATE_FAILED);
      }
    }
  });

// 3. Render using ValidationField wrapper
<FormErrorWrapper onSubmit={handleSubmit}>
  <ValidationField id="email" label="Email Address *" error={errors.email} isTouched={touched.email} isValid={isFieldValid('email')}>
    <InputErrorState
      id="email"
      type="email"
      value={values.email}
      onChange={(e) => handleChange('email', e.target.value)}
      onBlur={() => handleBlur('email')}
    />
  </ValidationField>
</FormErrorWrapper>
```

### What Is Prohibited

- Top-of-form error summary banners
- Bottom-of-form error summary banners
- Toast notifications for validation errors
- `<ValidationMessage>` for anything other than auth `submit` errors

---

## 3. Notification System

### Toast Variants

| Variant | Color | Icon | Auto-dismiss | `aria-live` | Use For |
|---|---|---|---|---|---|
| `success` | Emerald | CheckCircle2 | 4s | `polite` | Successful mutations |
| `error` | Red | XCircle | 8s | **`assertive`** | API failures, system errors |
| `warning` | Amber | AlertTriangle | 6s | `polite` | Warnings, partial ops |
| `info` | Indigo | Info | 5s | `polite` | Non-urgent info, coming-soon |

### Behaviour

- **Max 3 visible** simultaneously (queue depth: 10)
- **Deduplication**: same message+variant shown only once at a time
- **Progress bar**: visual countdown for each toast
- **Manual close**: X button on each toast
- **Position**: fixed bottom-right on desktop, full-width bottom on mobile (z-index: 9999)

### Usage

```typescript
// Inside React components
import { useNotification } from '@components/notification';
const notification = useNotification();

notification.success(Messages.GATEWAY.CREATE_SUCCESS);
notification.error(Messages.GATEWAY.DELETE_FAILED);
notification.warning(Messages.SYSTEM.TIMEOUT);
notification.info(Messages.DEVELOPER.FEATURE_COMING_SOON);

// Outside React (api.ts, interceptors, utilities)
import { NotificationService } from '@components/notification';
NotificationService.error(Messages.SYSTEM.SERVER_ERROR);
```

---

## 4. API Error Routing

`handleApiError()` is the single decision point for all `catch` blocks.

### Routing Logic

```
Server response has { errors: { fieldName: "message" } }
  → Map to form fields via setFieldError()  ← inline validation
  → Return (do not show toast)

Server response has { message } or { error }
  → Show as error toast via NotificationService
  → Use fallbackMsg if no message found
```

### Standard Catch Block

```typescript
import { handleApiError } from '@/lib/api';
import { Messages } from '@/lib/messages';

} catch (err) {
  // With form (field-level errors mapped inline; system errors → toast)
  handleApiError(err, setFieldError, Messages.CUSTOMER.UPDATE_FAILED);

  // Without form (all errors → toast)
  handleApiError(err, undefined, Messages.GATEWAY.DELETE_FAILED);
}
```

### Auth Exception

Login and signup `catch` blocks may use `setFieldError('submit', msg)` directly — credential errors are contextual to the form and should not appear as toasts.

---

## 5. Receipt / Confirmation Pages

Success toasts are **suppressed** on transaction receipt pages (`/transactions/[id]/receipt`). The receipt page itself is the authoritative feedback for transaction outcomes. Showing a success toast alongside a receipt creates duplicate messaging.

This is enforced by convention: the Virtual Terminal redirects to the receipt page on both approved and declined transactions. The notification system is not called post-redirect.
