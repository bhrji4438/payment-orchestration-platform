'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { customersApi, handleApiError } from '@/lib/api';
import { Messages } from '@/lib/messages';
import { z } from 'zod';
import { useNotification } from '@components/notification';
import {
  useFormValidation,
  ValidationField,
  InputErrorState,
  SelectErrorState,
  CheckboxErrorState,
  FormErrorWrapper
} from '@components/validation';

const CustomerSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().min(1, Messages.VALIDATION.EMAIL_REQUIRED).email(Messages.VALIDATION.EMAIL_INVALID),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  billingLine1: z.string().optional(),
  billingLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().optional(),
  shippingLine1: z.string().optional(),
  shippingLine2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().optional()
});

export default function NewCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notification = useNotification();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [loading, setLoading] = useState(false);
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    isFieldValid
  } = useFormValidation({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      companyName: '',
      phone: '',
      mobilePhone: '',
      billingLine1: '',
      billingLine2: '',
      billingCity: '',
      billingState: '',
      billingZip: '',
      billingCountry: 'United States of America',
      shippingLine1: '',
      shippingLine2: '',
      shippingCity: '',
      shippingState: '',
      shippingZip: '',
      shippingCountry: 'United States of America'
    },
    validationSchema: CustomerSchema,
    onSubmit: async (formValues) => {
      setLoading(true);
      const payload = {
        email: formValues.email,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        companyName: formValues.companyName,
        phone: formValues.phone,
        mobilePhone: formValues.mobilePhone,
        billingAddress: {
          line1: formValues.billingLine1,
          line2: formValues.billingLine2,
          city: formValues.billingCity,
          state: formValues.billingState,
          zip: formValues.billingZip,
          country: formValues.billingCountry
        },
        shippingAddress: sameAsBilling ? {
          line1: formValues.billingLine1,
          line2: formValues.billingLine2,
          city: formValues.billingCity,
          state: formValues.billingState,
          zip: formValues.billingZip,
          country: formValues.billingCountry
        } : {
          line1: formValues.shippingLine1,
          line2: formValues.shippingLine2,
          city: formValues.shippingCity,
          state: formValues.shippingState,
          zip: formValues.shippingZip,
          country: formValues.shippingCountry
        }
      };

      try {
        const res = await customersApi.createCustomer(payload);
        await queryClient.invalidateQueries({ queryKey: ['/v1/customers'] });
        notification.success(Messages.CUSTOMER.CREATE_SUCCESS);

        if (returnTo) {
          router.push(`${returnTo}?createdCustomerId=${res.data.id}`);
        } else {
          router.push('/customers');
        }
      } catch (err) {
        handleApiError(err, setFieldError, Messages.CUSTOMER.CREATE_FAILED);
        setLoading(false);
      }
    }
  });

  // Sync shipping address if sameAsBilling is toggled or billing updates
  useEffect(() => {
    if (sameAsBilling) {
      setFieldValue('shippingLine1', values.billingLine1);
      setFieldValue('shippingLine2', values.billingLine2);
      setFieldValue('shippingCity', values.billingCity);
      setFieldValue('shippingState', values.billingState);
      setFieldValue('shippingZip', values.billingZip);
      setFieldValue('shippingCountry', values.billingCountry);
    }
  }, [
    sameAsBilling,
    values.billingLine1,
    values.billingLine2,
    values.billingCity,
    values.billingState,
    values.billingZip,
    values.billingCountry,
    setFieldValue
  ]);

  const handleSave = () => {
    handleSubmit();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-20">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/customers" className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="text-xs text-zinc-500 font-medium mb-1">Customers / Create New Customer</div>
          <h2 className="text-2xl font-bold text-zinc-50">Create New Customer</h2>
        </div>
      </div>

      <FormErrorWrapper className="space-y-6">
        {/* Name & Contact */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6">Name & Contact</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ValidationField id="firstName" label="First Name" error={errors.firstName} isTouched={touched.firstName} isValid={isFieldValid('firstName')}>
              <InputErrorState type="text" name="firstName" value={values.firstName} onChange={(e) => handleChange('firstName', e.target.value)} onBlur={() => handleBlur('firstName')} />
            </ValidationField>

            <ValidationField id="lastName" label="Last Name" error={errors.lastName} isTouched={touched.lastName} isValid={isFieldValid('lastName')}>
              <InputErrorState type="text" name="lastName" value={values.lastName} onChange={(e) => handleChange('lastName', e.target.value)} onBlur={() => handleBlur('lastName')} />
            </ValidationField>

            <ValidationField id="companyName" label="Company Name" error={errors.companyName} isTouched={touched.companyName} isValid={isFieldValid('companyName')}>
              <InputErrorState type="text" name="companyName" value={values.companyName} onChange={(e) => handleChange('companyName', e.target.value)} onBlur={() => handleBlur('companyName')} />
            </ValidationField>

            <ValidationField id="email" label="Email Address *" error={errors.email} isTouched={touched.email} isValid={isFieldValid('email')}>
              <InputErrorState type="email" name="email" value={values.email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => handleBlur('email')} />
            </ValidationField>

            <ValidationField id="phone" label="Phone Number" error={errors.phone} isTouched={touched.phone} isValid={isFieldValid('phone')}>
              <InputErrorState type="text" name="phone" placeholder="(555) 555-5555" value={values.phone} onChange={(e) => handleChange('phone', e.target.value)} onBlur={() => handleBlur('phone')} />
            </ValidationField>

            <ValidationField id="mobilePhone" label="Mobile Phone" error={errors.mobilePhone} isTouched={touched.mobilePhone} isValid={isFieldValid('mobilePhone')}>
              <InputErrorState type="text" name="mobilePhone" placeholder="(555) 555-5555" value={values.mobilePhone} onChange={(e) => handleChange('mobilePhone', e.target.value)} onBlur={() => handleBlur('mobilePhone')} />
            </ValidationField>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6">Billing Address</h3>
          
          <div className="space-y-6">
            <ValidationField id="billingLine1" label="Address Line 1" error={errors.billingLine1} isTouched={touched.billingLine1} isValid={isFieldValid('billingLine1')}>
              <InputErrorState type="text" name="billingLine1" value={values.billingLine1} onChange={(e) => handleChange('billingLine1', e.target.value)} onBlur={() => handleBlur('billingLine1')} />
            </ValidationField>

            <ValidationField id="billingLine2" label="Address Line 2" error={errors.billingLine2} isTouched={touched.billingLine2} isValid={isFieldValid('billingLine2')}>
              <InputErrorState type="text" name="billingLine2" value={values.billingLine2} onChange={(e) => handleChange('billingLine2', e.target.value)} onBlur={() => handleBlur('billingLine2')} />
            </ValidationField>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <ValidationField id="billingCity" label="City" error={errors.billingCity} isTouched={touched.billingCity} isValid={isFieldValid('billingCity')}>
                <InputErrorState type="text" name="billingCity" value={values.billingCity} onChange={(e) => handleChange('billingCity', e.target.value)} onBlur={() => handleBlur('billingCity')} />
              </ValidationField>

              <ValidationField id="billingState" label="State" error={errors.billingState} isTouched={touched.billingState} isValid={isFieldValid('billingState')}>
                <InputErrorState type="text" name="billingState" value={values.billingState} onChange={(e) => handleChange('billingState', e.target.value)} onBlur={() => handleBlur('billingState')} />
              </ValidationField>

              <ValidationField id="billingZip" label="ZIP Code" error={errors.billingZip} isTouched={touched.billingZip} isValid={isFieldValid('billingZip')}>
                <InputErrorState type="text" name="billingZip" value={values.billingZip} onChange={(e) => handleChange('billingZip', e.target.value)} onBlur={() => handleBlur('billingZip')} />
              </ValidationField>

              <ValidationField id="billingCountry" label="Country" error={errors.billingCountry} isTouched={touched.billingCountry} isValid={isFieldValid('billingCountry')}>
                <SelectErrorState name="billingCountry" value={values.billingCountry} onChange={(e) => handleChange('billingCountry', e.target.value)} onBlur={() => handleBlur('billingCountry')}>
                  <option>United States of America</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                </SelectErrorState>
              </ValidationField>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Shipping Address</h3>
          </div>
          
          <div className="mb-6 flex items-center gap-2">
            <CheckboxErrorState 
              id="sameAsBilling"
              checked={sameAsBilling}
              onChange={(e) => setSameAsBilling(e.target.checked)}
            />
            <label htmlFor="sameAsBilling" className="text-sm text-zinc-400 cursor-pointer select-none">Same as Billing Address</label>
          </div>

          {!sameAsBilling && (
            <div className="space-y-6">
              <ValidationField id="shippingLine1" label="Address Line 1" error={errors.shippingLine1} isTouched={touched.shippingLine1} isValid={isFieldValid('shippingLine1')}>
                <InputErrorState type="text" name="shippingLine1" value={values.shippingLine1} onChange={(e) => handleChange('shippingLine1', e.target.value)} onBlur={() => handleBlur('shippingLine1')} />
              </ValidationField>

              <ValidationField id="shippingLine2" label="Address Line 2" error={errors.shippingLine2} isTouched={touched.shippingLine2} isValid={isFieldValid('shippingLine2')}>
                <InputErrorState type="text" name="shippingLine2" value={values.shippingLine2} onChange={(e) => handleChange('shippingLine2', e.target.value)} onBlur={() => handleBlur('shippingLine2')} />
              </ValidationField>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <ValidationField id="shippingCity" label="City" error={errors.shippingCity} isTouched={touched.shippingCity} isValid={isFieldValid('shippingCity')}>
                  <InputErrorState type="text" name="shippingCity" value={values.shippingCity} onChange={(e) => handleChange('shippingCity', e.target.value)} onBlur={() => handleBlur('shippingCity')} />
                </ValidationField>

                <ValidationField id="shippingState" label="State" error={errors.shippingState} isTouched={touched.shippingState} isValid={isFieldValid('shippingState')}>
                  <InputErrorState type="text" name="shippingState" value={values.shippingState} onChange={(e) => handleChange('shippingState', e.target.value)} onBlur={() => handleBlur('shippingState')} />
                </ValidationField>

                <ValidationField id="shippingZip" label="ZIP Code" error={errors.shippingZip} isTouched={touched.shippingZip} isValid={isFieldValid('shippingZip')}>
                  <InputErrorState type="text" name="shippingZip" value={values.shippingZip} onChange={(e) => handleChange('shippingZip', e.target.value)} onBlur={() => handleBlur('shippingZip')} />
                </ValidationField>

                <ValidationField id="shippingCountry" label="Country" error={errors.shippingCountry} isTouched={touched.shippingCountry} isValid={isFieldValid('shippingCountry')}>
                  <SelectErrorState name="shippingCountry" value={values.shippingCountry} onChange={(e) => handleChange('shippingCountry', e.target.value)} onBlur={() => handleBlur('shippingCountry')}>
                    <option>United States of America</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                  </SelectErrorState>
                </ValidationField>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-end gap-3">
            <Link href="/customers" className="px-6 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancel
            </Link>
            <button 
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-70 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Customer
            </button>
          </div>
        </div>
      </FormErrorWrapper>
    </div>
  );
}
