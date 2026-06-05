import { useState, useCallback } from 'react';
import { z } from 'zod';

export interface UseFormValidationOptions<T> {
  initialValues: T;
  validationSchema?: z.ZodSchema<any>;
  validate?: (values: T) => Record<string, string>;
  onSubmit?: (values: T) => void | Promise<void>;
  customPathMapper?: (path: (string | number | symbol)[]) => string;
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const setNestedValue = (obj: any, path: string, value: any): any => {
  const keys = path.split('.');
  const newObj = { ...obj };
  let current = newObj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = current[key] !== undefined && current[key] !== null 
      ? { ...current[key] } 
      : {};
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return newObj;
};

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  validate,
  onSubmit,
  customPathMapper
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = useCallback((currentValues: T): Record<string, string> => {
    let formErrors: Record<string, string> = {};

    if (validationSchema) {
      const result = validationSchema.safeParse(currentValues);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const pathStr = customPathMapper ? customPathMapper(issue.path) : issue.path.map(String).join('.');
          if (!formErrors[pathStr]) {
            formErrors[pathStr] = issue.message;
          }
        });
      }
    }

    if (validate) {
      formErrors = { ...formErrors, ...validate(currentValues) };
    }

    return formErrors;
  }, [validationSchema, validate, customPathMapper]);

  const handleBlur = useCallback((path: string) => {
    setTouched((prev) => ({ ...prev, [path]: true }));
    const currentErrors = validateForm(values);
    setErrors((prev) => {
      const nextErrors = { ...prev };
      if (currentErrors[path]) {
        nextErrors[path] = currentErrors[path];
      } else {
        delete nextErrors[path];
      }
      return nextErrors;
    });
  }, [values, validateForm]);

  const handleChange = useCallback((path: string, value: any) => {
    setValues((prev) => {
      const nextValues = setNestedValue(prev, path, value);
      
      // If the field is currently in error, revalidate immediately
      if (errors[path]) {
        const currentErrors = validateForm(nextValues);
        setErrors((prevErrors) => {
          const nextErrors = { ...prevErrors };
          if (currentErrors[path]) {
            nextErrors[path] = currentErrors[path];
          } else {
            delete nextErrors[path];
          }
          return nextErrors;
        });
      }
      return nextValues;
    });
  }, [errors, validateForm]);

  const focusFirstError = useCallback((currentErrors: Record<string, string>) => {
    const errorKeys = Object.keys(currentErrors);
    if (errorKeys.length === 0) return;

    // Find the first form element in DOM order that has an error
    setTimeout(() => {
      const elements = document.querySelectorAll('input, select, textarea, [role="radiogroup"]');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        const id = el.getAttribute('id');
        const name = el.getAttribute('name');
        const ariaInvalid = el.getAttribute('aria-invalid') === 'true';

        if ((id && currentErrors[id]) || (name && currentErrors[name]) || ariaInvalid) {
          // If in dynamic sections like Shipping, ensure parent accordion is open
          if (id && id.startsWith('shippingAddress')) {
            // Dispatch a custom or window event to let parent know if needed, or rely on normal flow
            const shipCheck = document.getElementById('copyBilling');
            if (shipCheck && (shipCheck as HTMLInputElement).checked) {
              (shipCheck as HTMLInputElement).click();
            }
          }
          
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    }, 50);
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const currentErrors = validateForm(values);
    const hasErrors = Object.keys(currentErrors).length > 0;

    // Mark all keys from validation as touched
    const nextTouched: Record<string, boolean> = {};
    if (validationSchema && 'shape' in validationSchema) {
      // flat fields from zod shape
      Object.keys((validationSchema as any).shape).forEach((key) => {
        nextTouched[key] = true;
      });
    }
    // Also include all error keys
    Object.keys(currentErrors).forEach((key) => {
      nextTouched[key] = true;
    });
    // For nested fields from values
    const touchAll = (obj: any, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach((key) => {
        const path = prefix ? `${prefix}.${key}` : key;
        nextTouched[path] = true;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          touchAll(obj[key], path);
        }
      });
    };
    touchAll(values);

    setTouched(nextTouched);
    setErrors(currentErrors);

    if (hasErrors) {
      focusFirstError(currentErrors);
      return false;
    }

    if (onSubmit) {
      await onSubmit(values);
    }
    return true;
  }, [values, validateForm, validationSchema, onSubmit, focusFirstError]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((path: string, value: any) => {
    setValues((prev) => setNestedValue(prev, path, value));
  }, []);

  const setFieldError = useCallback((path: string, error: string) => {
    setErrors((prev) => ({ ...prev, [path]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    setValues,
    setFieldValue,
    setErrors,
    setFieldError,
    handleBlur,
    handleChange,
    handleSubmit,
    resetForm,
    isFieldValid: useCallback((path: string) => {
      return !!(touched[path] && !errors[path]);
    }, [touched, errors])
  };
}
