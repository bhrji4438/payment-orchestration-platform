'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Building2,
  Users,
  Search,
  Plus,
  Loader2,
  X,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { gatewaysApi, paymentsApi, customersApi } from '@/lib/api';
import { UnifiedPaymentRequestSchema } from '@shared/validators/payment.schemas';
import {
  useFormValidation,
  ValidationField,
  InputErrorState,
  SelectErrorState,
  CheckboxErrorState,
  ValidationMessage,
  FormErrorWrapper
} from '@components/validation';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  billingAddress?: any;
  shippingAddress?: any;
}

export default function VirtualTerminalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdCustomerId = searchParams.get('createdCustomerId');

  // Gateway Configurations
  const [configs, setConfigs] = useState<any[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Customer Autocomplete Search
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Address open state
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [copyBilling, setCopyBilling] = useState(false);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);

  // Setup form validation hook
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setValues,
    setFieldError,
    isFieldValid,
    resetForm
  } = useFormValidation({
    initialValues: {
      customerId: '',
      gatewayId: '',
      amount: '',
      paymentMethodType: 'credit_card' as 'credit_card' | 'echeck',
      email: '',
      phone: '',
      billingAddress: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US'
      },
      shippingAddress: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US'
      },
      ccDetails: {
        cardholderName: '',
        cardNumber: '',
        expiry: '', // MM/YY
        cvv: ''
      },
      echeckDetails: {
        accountHolderName: '',
        holderType: 'personal' as 'personal' | 'business',
        accountType: 'checking' as 'checking' | 'savings',
        accountNumber: '',
        routingNumber: ''
      }
    },
    validate: (formValues) => {
      const amtNum = parseFloat(formValues.amount);
      
      let expM = '';
      let expY = '';
      if (formValues.paymentMethodType === 'credit_card' && formValues.ccDetails.expiry) {
        const parts = formValues.ccDetails.expiry.split('/');
        expM = parts[0] || '';
        expY = parts[1] ? `20${parts[1]}` : '';
      }

      const payload = {
        customerId: selectedCustomer?.id || '',
        gatewayId: formValues.gatewayId || '',
        amount: isNaN(amtNum) ? 0 : amtNum,
        paymentMethodType: formValues.paymentMethodType,
        billingAddress: {
          addressLine1: formValues.billingAddress.addressLine1,
          addressLine2: formValues.billingAddress.addressLine2 || null,
          city: formValues.billingAddress.city,
          state: formValues.billingAddress.state,
          postalCode: formValues.billingAddress.postalCode,
          country: formValues.billingAddress.country
        },
        shippingAddress: isShippingOpen ? {
          addressLine1: formValues.shippingAddress.addressLine1,
          addressLine2: formValues.shippingAddress.addressLine2 || null,
          city: formValues.shippingAddress.city,
          state: formValues.shippingAddress.state,
          postalCode: formValues.shippingAddress.postalCode,
          country: formValues.shippingAddress.country
        } : null,
        paymentDetails: formValues.paymentMethodType === 'credit_card' ? {
          cardholderName: formValues.ccDetails.cardholderName,
          cardNumber: formValues.ccDetails.cardNumber.replace(/\s+/g, ''),
          expMonth: expM,
          expYear: expY,
          cvv: formValues.ccDetails.cvv
        } : {
          accountHolderName: formValues.echeckDetails.accountHolderName,
          holderType: formValues.echeckDetails.holderType,
          accountType: formValues.echeckDetails.accountType,
          accountNumber: formValues.echeckDetails.accountNumber,
          routingNumber: formValues.echeckDetails.routingNumber
        }
      };

      const result = UnifiedPaymentRequestSchema.safeParse(payload);
      const formErrors: Record<string, string> = {};

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          let pathStr = issue.path.map(String).join('.');
          
          if (issue.path[0] === 'paymentDetails') {
            if (formValues.paymentMethodType === 'credit_card') {
              if (issue.path[1] === 'expMonth' || issue.path[1] === 'expYear') {
                pathStr = 'ccDetails.expiry';
              } else {
                pathStr = `ccDetails.${String(issue.path[1])}`;
              }
            } else {
              pathStr = `echeckDetails.${String(issue.path[1])}`;
            }
          }
          
          if (!formErrors[pathStr]) {
            formErrors[pathStr] = issue.message;
          }
        });
      }

      if (!selectedCustomer) {
        formErrors['customerId'] = 'Please select or create a customer profile';
      }

      if (!formValues.email) {
        formErrors['email'] = 'Transaction email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
        formErrors['email'] = 'Invalid email address';
      }

      return formErrors;
    },
    onSubmit: async (formValues) => {
      setIsProcessing(true);
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : 'vt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

      // Prepare billing/shipping
      const billAddr = {
        addressLine1: formValues.billingAddress.addressLine1,
        addressLine2: formValues.billingAddress.addressLine2 || undefined,
        city: formValues.billingAddress.city,
        state: formValues.billingAddress.state,
        postalCode: formValues.billingAddress.postalCode,
        country: formValues.billingAddress.country
      };

      const shipAddr = isShippingOpen ? {
        addressLine1: formValues.shippingAddress.addressLine1,
        addressLine2: formValues.shippingAddress.addressLine2 || undefined,
        city: formValues.shippingAddress.city,
        state: formValues.shippingAddress.state,
        postalCode: formValues.shippingAddress.postalCode,
        country: formValues.shippingAddress.country
      } : undefined;

      // Transform MM/YY expiry to expMonth, expYear
      let paymentDetails: any = {};
      if (formValues.paymentMethodType === 'credit_card') {
        const [m, y] = formValues.ccDetails.expiry.split('/');
        paymentDetails = {
          cardholderName: formValues.ccDetails.cardholderName,
          cardNumber: formValues.ccDetails.cardNumber.replace(/\s+/g, ''),
          expMonth: m,
          expYear: `20${y}`,
          cvv: formValues.ccDetails.cvv
        };
      } else {
        paymentDetails = {
          accountHolderName: formValues.echeckDetails.accountHolderName,
          holderType: formValues.echeckDetails.holderType,
          accountType: formValues.echeckDetails.accountType,
          accountNumber: formValues.echeckDetails.accountNumber,
          routingNumber: formValues.echeckDetails.routingNumber
        };
      }

      const payload = {
        customerId: selectedCustomer?.id,
        gatewayId: formValues.gatewayId,
        amount: parseFloat(formValues.amount),
        paymentMethodType: formValues.paymentMethodType,
        billingAddress: billAddr,
        shippingAddress: shipAddr,
        customerSnapshot: {
          email: formValues.email,
          phone: formValues.phone || undefined,
          billingAddress: billAddr,
          shippingAddress: shipAddr
        },
        paymentDetails: paymentDetails
      };

      try {
        const res = await paymentsApi.createPayment(payload, {
          headers: { 'Idempotency-Key': idempotencyKey }
        });

        const responseData = res.data;
        router.push(`/transactions/${responseData.id}/receipt`);
      } catch (err: any) {
        const failedPaymentId = err.response?.data?.paymentId;
        if (failedPaymentId) {
          router.push(`/transactions/${failedPaymentId}/receipt`);
          return;
        }

        const errMsg = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Transaction declined by gateway config.';
        setFieldError('submit', errMsg);
        setIsProcessing(false);
      }
    }
  });

  // Load configs and restore session/created customer
  useEffect(() => {
    gatewaysApi.getConfigurations().then((res) => {
      setConfigs(res.data);
      setLoadingConfigs(false);
    });

    // Restore context if stored
    const saved = sessionStorage.getItem('vt_form_context');
    if (saved) {
      try {
        const context = JSON.parse(saved);
        if (context.form) {
          setValues({
            customerId: context.selectedCustomer?.id || '',
            gatewayId: context.form.gatewayId || '',
            amount: context.form.amount || '',
            paymentMethodType: context.form.paymentMethodType || 'credit_card',
            email: context.form.email || '',
            phone: context.form.phone || '',
            billingAddress: context.form.billingAddress || {
              addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'US'
            },
            shippingAddress: context.form.shippingAddress || {
              addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'US'
            },
            ccDetails: context.form.ccDetails || {
              cardholderName: '', cardNumber: '', expiry: '', cvv: ''
            },
            echeckDetails: context.form.echeckDetails || {
              accountHolderName: '', holderType: 'personal', accountType: 'checking', accountNumber: '', routingNumber: ''
            }
          });
          setIsShippingOpen(context.form.isShippingOpen || false);
          setCopyBilling(context.form.copyBilling || false);
        }
        if (context.selectedCustomer) {
          setSelectedCustomer(context.selectedCustomer);
        }
      } catch (err) {
        // ignore
      }
      sessionStorage.removeItem('vt_form_context');
    }
  }, [setValues]);

  // Handle newly created customer redirect
  useEffect(() => {
    if (createdCustomerId) {
      customersApi.getCustomer(createdCustomerId).then((res) => {
        const customer = res.data;
        setSelectedCustomer(customer);
        
        setValues((prev) => ({
          ...prev,
          customerId: customer.id,
          email: customer.email || '',
          phone: customer.phone || '',
          billingAddress: customer.billingAddress ? {
            addressLine1: customer.billingAddress.line1 || '',
            addressLine2: customer.billingAddress.line2 || '',
            city: customer.billingAddress.city || '',
            state: customer.billingAddress.state || '',
            postalCode: customer.billingAddress.zip || '',
            country: customer.billingAddress.country === 'Canada' ? 'CA' : (customer.billingAddress.country === 'United Kingdom' ? 'GB' : 'US')
          } : prev.billingAddress
        }));

        // Clean URL params
        router.replace('/virtual-terminal');
      }).catch(() => {
        // ignore
      });
    }
  }, [createdCustomerId, router, setValues]);

  // Customer search dynamic querying (Lazy Loading)
  useEffect(() => {
    if (customerSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingCustomers(true);
    const delayDebounce = setTimeout(() => {
      customersApi.getCustomers({ search: customerSearch, limit: 10 })
        .then((res) => {
          setSearchResults(res.data.data);
          setIsSearchingCustomers(false);
        })
        .catch(() => {
          setIsSearchingCustomers(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [customerSearch]);

  // Copy billing address to shipping address when copyBilling is checked
  useEffect(() => {
    if (copyBilling) {
      setFieldValue('shippingAddress', {
        addressLine1: values.billingAddress.addressLine1,
        addressLine2: values.billingAddress.addressLine2,
        city: values.billingAddress.city,
        state: values.billingAddress.state,
        postalCode: values.billingAddress.postalCode,
        country: values.billingAddress.country
      });
    }
  }, [copyBilling, values.billingAddress, setFieldValue]);

  const selectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    
    const nextValues = {
      ...values,
      customerId: cust.id,
      email: cust.email || '',
      phone: cust.phone || '',
      billingAddress: cust.billingAddress ? {
        addressLine1: cust.billingAddress.line1 || '',
        addressLine2: cust.billingAddress.line2 || '',
        city: cust.billingAddress.city || '',
        state: cust.billingAddress.state || '',
        postalCode: cust.billingAddress.zip || '',
        country: cust.billingAddress.country === 'Canada' ? 'CA' : (cust.billingAddress.country === 'United Kingdom' ? 'GB' : 'US')
      } : values.billingAddress,
      shippingAddress: cust.shippingAddress ? {
        addressLine1: cust.shippingAddress.line1 || '',
        addressLine2: cust.shippingAddress.line2 || '',
        city: cust.shippingAddress.city || '',
        state: cust.shippingAddress.state || '',
        postalCode: cust.shippingAddress.zip || '',
        country: cust.shippingAddress.country === 'Canada' ? 'CA' : (cust.shippingAddress.country === 'United Kingdom' ? 'GB' : 'US')
      } : values.shippingAddress
    };

    setValues(nextValues);

    if (cust.shippingAddress) {
      setIsShippingOpen(true);
      setCopyBilling(false);
    } else {
      setIsShippingOpen(false);
      setCopyBilling(false);
    }

    setCustomerSearch('');
    setShowDropdown(false);
  };

  const handleCreateCustomerRedirect = () => {
    // Preserve form context
    const context = {
      form: {
        amount: values.amount,
        paymentMethodType: values.paymentMethodType,
        email: values.email,
        phone: values.phone,
        billingAddress: values.billingAddress,
        shippingAddress: values.shippingAddress,
        isShippingOpen,
        copyBilling,
        ccDetails: values.ccDetails,
        echeckDetails: values.echeckDetails,
        gatewayId: values.gatewayId
      },
      selectedCustomer
    };
    sessionStorage.setItem('vt_form_context', JSON.stringify(context));
    router.push('/customers/new?returnTo=/virtual-terminal');
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setValues((prev) => ({
      ...prev,
      customerId: '',
      email: '',
      phone: '',
      billingAddress: {
        addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'US'
      },
      shippingAddress: {
        addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'US'
      }
    }));
    setIsShippingOpen(false);
    setCopyBilling(false);
  };

  // Input formatting helpers
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,19}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const detectCardBrand = (number: string) => {
    const raw = number.replace(/\s+/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(raw)) return 'Mastercard';
    return null;
  };

  const handleProcessPayment = () => {
    handleSubmit();
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-300 pb-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-50">Virtual Terminal</h2>
        <p className="text-zinc-400 mt-1">Process payments securely using your configured gateways.</p>
      </div>

      {loadingConfigs ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-sm text-zinc-500 mt-4">Loading gateways configuration...</span>
        </div>
      ) : (
        <FormErrorWrapper className="space-y-6">
          {/* Customer Selection */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" /> Customer Profile *
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <ValidationField
                id="customerId"
                error={errors.customerId}
                isTouched={touched.customerId}
                isValid={isFieldValid('customerId')}
                className="flex-1"
              >
                <div className="relative">
                  <input
                    id="customerId"
                    type="text"
                    placeholder="Search customer by name or email..."
                    value={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.email})` : customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    disabled={!!selectedCustomer}
                    aria-invalid={touched.customerId && !!errors.customerId ? 'true' : 'false'}
                    aria-describedby={touched.customerId && !!errors.customerId ? 'customerId-error' : undefined}
                    className={`w-full bg-zinc-950 border rounded-lg pl-10 pr-10 py-2.5 text-sm text-zinc-200 focus:outline-none transition-colors disabled:opacity-80 disabled:cursor-not-allowed ${
                      touched.customerId && errors.customerId
                        ? 'border-[#EF4444] border-[1.5px] focus:border-[#EF4444]'
                        : isFieldValid('customerId')
                        ? 'border-[#22C55E] border-[1.5px] focus:border-[#22C55E]'
                        : 'border-zinc-800 focus:border-indigo-500'
                    }`}
                  />
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                  {selectedCustomer ? (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300"
                      title="Clear selected customer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    isSearchingCustomers && (
                      <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-indigo-500" />
                    )
                  )}

                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-20">
                      {searchResults.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => selectCustomer(cust)}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-900 border-b border-zinc-900 text-xs text-zinc-300 flex flex-col gap-0.5 transition-colors"
                        >
                          <span className="font-semibold text-zinc-200">{cust.firstName} {cust.lastName}</span>
                          <span className="text-zinc-500">{cust.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && customerSearch.trim().length >= 2 && searchResults.length === 0 && !isSearchingCustomers && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-center text-xs text-zinc-500 z-20">
                      No active profiles found.
                    </div>
                  )}
                </div>
              </ValidationField>

              <button
                type="button"
                onClick={handleCreateCustomerRedirect}
                className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors border border-zinc-700 whitespace-nowrap h-[42px] self-start"
              >
                <Plus className="h-4 w-4" /> Create Customer
              </button>
            </div>

            {/* Transaction Scoped Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-800/50">
              <ValidationField
                id="email"
                label="Transaction Email Address *"
                error={errors.email}
                isTouched={touched.email}
                isValid={isFieldValid('email')}
              >
                <InputErrorState
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
              </ValidationField>

              <ValidationField
                id="phone"
                label="Transaction Phone Number"
                error={errors.phone}
                isTouched={touched.phone}
                isValid={isFieldValid('phone')}
              >
                <InputErrorState
                  id="phone"
                  type="text"
                  placeholder="(555) 123-4567"
                  value={values.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                />
              </ValidationField>
              <p className="col-span-1 sm:col-span-2 text-[10px] text-zinc-500 mt-1">
                Changes apply only to this transaction and do not modify the customer profile.
              </p>
            </div>
          </div>

          {/* Gateway & Amount */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ValidationField
                id="gatewayId"
                label="Gateway Configuration *"
                error={errors.gatewayId}
                isTouched={touched.gatewayId}
                isValid={isFieldValid('gatewayId')}
              >
                <SelectErrorState
                  id="gatewayId"
                  value={values.gatewayId}
                  onChange={(e) => handleChange('gatewayId', e.target.value)}
                  onBlur={() => handleBlur('gatewayId')}
                >
                  <option value="">Select Gateway</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} ({c.provider.name})
                    </option>
                  ))}
                </SelectErrorState>
              </ValidationField>

              <ValidationField
                id="amount"
                label="Amount ($) *"
                error={errors.amount}
                isTouched={touched.amount}
                isValid={isFieldValid('amount')}
              >
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-zinc-500 font-semibold">$</span>
                  <InputErrorState
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={values.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    onBlur={() => handleBlur('amount')}
                    className="pl-8 pr-4 font-semibold"
                  />
                </div>
              </ValidationField>
            </div>
          </div>

          {/* Payment Type Selector & Form details */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <label className="block text-xs font-semibold text-zinc-400 mb-3">Payment Type *</label>

            {/* Segmented Control Switcher */}
            <div className="bg-zinc-950 p-1 rounded-lg flex gap-1 border border-zinc-800/80 mb-6 max-w-sm">
              <button
                type="button"
                onClick={() => setFieldValue('paymentMethodType', 'credit_card')}
                className={`flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${values.paymentMethodType === 'credit_card'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
              >
                <CreditCard className="h-4 w-4" /> Credit Card
              </button>
              <button
                type="button"
                onClick={() => setFieldValue('paymentMethodType', 'echeck')}
                className={`flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${values.paymentMethodType === 'echeck'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
              >
                <Building2 className="h-4 w-4" /> E-Check
              </button>
            </div>

            {values.paymentMethodType === 'credit_card' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ValidationField
                    id="ccDetails.cardholderName"
                    label="Cardholder Name *"
                    error={errors['ccDetails.cardholderName']}
                    isTouched={touched['ccDetails.cardholderName']}
                    isValid={isFieldValid('ccDetails.cardholderName')}
                    className="col-span-1 sm:col-span-2"
                  >
                    <InputErrorState
                      id="ccDetails.cardholderName"
                      type="text"
                      placeholder="Jane Doe"
                      value={values.ccDetails.cardholderName}
                      onChange={(e) => handleChange('ccDetails.cardholderName', e.target.value)}
                      onBlur={() => handleBlur('ccDetails.cardholderName')}
                    />
                  </ValidationField>

                  <ValidationField
                    id="ccDetails.cardNumber"
                    label="Card Number *"
                    error={errors['ccDetails.cardNumber']}
                    isTouched={touched['ccDetails.cardNumber']}
                    isValid={isFieldValid('ccDetails.cardNumber')}
                    className="col-span-1 sm:col-span-2"
                  >
                    <div className="relative">
                      <InputErrorState
                        id="ccDetails.cardNumber"
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        value={values.ccDetails.cardNumber}
                        onChange={(e) => handleChange('ccDetails.cardNumber', formatCardNumber(e.target.value))}
                        onBlur={() => handleBlur('ccDetails.cardNumber')}
                        maxLength={24}
                        className="pl-3 pr-10 tracking-widest font-mono"
                      />
                      {detectCardBrand(values.ccDetails.cardNumber) && (
                        <span className="absolute right-3.5 top-2.5 text-xs text-indigo-400 font-bold font-mono">
                          {detectCardBrand(values.ccDetails.cardNumber)}
                        </span>
                      )}
                    </div>
                  </ValidationField>

                  <ValidationField
                    id="ccDetails.expiry"
                    label="Expiry (MM/YY) *"
                    error={errors['ccDetails.expiry']}
                    isTouched={touched['ccDetails.expiry']}
                    isValid={isFieldValid('ccDetails.expiry')}
                  >
                    <InputErrorState
                      id="ccDetails.expiry"
                      type="text"
                      placeholder="12/30"
                      value={values.ccDetails.expiry}
                      onChange={(e) => handleChange('ccDetails.expiry', formatExpiry(e.target.value))}
                      onBlur={() => handleBlur('ccDetails.expiry')}
                      maxLength={5}
                      className="font-mono text-center"
                    />
                  </ValidationField>

                  <ValidationField
                    id="ccDetails.cvv"
                    label="CVV *"
                    error={errors['ccDetails.cvv']}
                    isTouched={touched['ccDetails.cvv']}
                    isValid={isFieldValid('ccDetails.cvv')}
                  >
                    <InputErrorState
                      id="ccDetails.cvv"
                      type="text"
                      placeholder="123"
                      value={values.ccDetails.cvv}
                      onChange={(e) => handleChange('ccDetails.cvv', e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => handleBlur('ccDetails.cvv')}
                      maxLength={4}
                      className="font-mono text-center"
                    />
                  </ValidationField>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ValidationField
                    id="echeckDetails.accountHolderName"
                    label="Account Holder Name *"
                    error={errors['echeckDetails.accountHolderName']}
                    isTouched={touched['echeckDetails.accountHolderName']}
                    isValid={isFieldValid('echeckDetails.accountHolderName')}
                    className="col-span-1 sm:col-span-2"
                  >
                    <InputErrorState
                      id="echeckDetails.accountHolderName"
                      type="text"
                      placeholder="Jane Doe"
                      value={values.echeckDetails.accountHolderName}
                      onChange={(e) => handleChange('echeckDetails.accountHolderName', e.target.value)}
                      onBlur={() => handleBlur('echeckDetails.accountHolderName')}
                    />
                  </ValidationField>

                  <ValidationField
                    id="echeckDetails.holderType"
                    label="Holder Type *"
                    error={errors['echeckDetails.holderType']}
                    isTouched={touched['echeckDetails.holderType']}
                    isValid={isFieldValid('echeckDetails.holderType')}
                  >
                    <SelectErrorState
                      id="echeckDetails.holderType"
                      value={values.echeckDetails.holderType}
                      onChange={(e) => handleChange('echeckDetails.holderType', e.target.value)}
                      onBlur={() => handleBlur('echeckDetails.holderType')}
                    >
                      <option value="personal">Personal</option>
                      <option value="business">Business</option>
                    </SelectErrorState>
                  </ValidationField>

                  <ValidationField
                    id="echeckDetails.accountType"
                    label="Account Type *"
                    error={errors['echeckDetails.accountType']}
                    isTouched={touched['echeckDetails.accountType']}
                    isValid={isFieldValid('echeckDetails.accountType')}
                  >
                    <SelectErrorState
                      id="echeckDetails.accountType"
                      value={values.echeckDetails.accountType}
                      onChange={(e) => handleChange('echeckDetails.accountType', e.target.value)}
                      onBlur={() => handleBlur('echeckDetails.accountType')}
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </SelectErrorState>
                  </ValidationField>

                  <ValidationField
                    id="echeckDetails.accountNumber"
                    label="Account Number *"
                    error={errors['echeckDetails.accountNumber']}
                    isTouched={touched['echeckDetails.accountNumber']}
                    isValid={isFieldValid('echeckDetails.accountNumber')}
                  >
                    <InputErrorState
                      id="echeckDetails.accountNumber"
                      type="text"
                      placeholder="1234567890"
                      value={values.echeckDetails.accountNumber}
                      onChange={(e) => handleChange('echeckDetails.accountNumber', e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => handleBlur('echeckDetails.accountNumber')}
                      className="tracking-wider font-mono"
                    />
                  </ValidationField>

                  <ValidationField
                    id="echeckDetails.routingNumber"
                    label="Routing Number (ABA) *"
                    error={errors['echeckDetails.routingNumber']}
                    isTouched={touched['echeckDetails.routingNumber']}
                    isValid={isFieldValid('echeckDetails.routingNumber')}
                  >
                    <InputErrorState
                      id="echeckDetails.routingNumber"
                      type="text"
                      placeholder="021000021"
                      value={values.echeckDetails.routingNumber}
                      onChange={(e) => handleChange('echeckDetails.routingNumber', e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => handleBlur('echeckDetails.routingNumber')}
                      maxLength={9}
                      className="tracking-wider font-mono"
                    />
                  </ValidationField>
                </div>
              </div>
            )}
          </div>

          {/* Billing Address */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" /> Transaction Billing Address
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ValidationField
                  id="billingAddress.addressLine1"
                  label="Address Line 1 *"
                  error={errors['billingAddress.addressLine1']}
                  isTouched={touched['billingAddress.addressLine1']}
                  isValid={isFieldValid('billingAddress.addressLine1')}
                  className="col-span-1 sm:col-span-2"
                >
                  <InputErrorState
                    id="billingAddress.addressLine1"
                    type="text"
                    value={values.billingAddress.addressLine1}
                    onChange={(e) => handleChange('billingAddress.addressLine1', e.target.value)}
                    onBlur={() => handleBlur('billingAddress.addressLine1')}
                  />
                </ValidationField>

                <ValidationField
                  id="billingAddress.addressLine2"
                  label="Address Line 2"
                  error={errors['billingAddress.addressLine2']}
                  isTouched={touched['billingAddress.addressLine2']}
                  isValid={isFieldValid('billingAddress.addressLine2')}
                  className="col-span-1 sm:col-span-2"
                >
                  <InputErrorState
                    id="billingAddress.addressLine2"
                    type="text"
                    value={values.billingAddress.addressLine2}
                    onChange={(e) => handleChange('billingAddress.addressLine2', e.target.value)}
                    onBlur={() => handleBlur('billingAddress.addressLine2')}
                  />
                </ValidationField>

                <ValidationField
                  id="billingAddress.city"
                  label="City *"
                  error={errors['billingAddress.city']}
                  isTouched={touched['billingAddress.city']}
                  isValid={isFieldValid('billingAddress.city')}
                >
                  <InputErrorState
                    id="billingAddress.city"
                    type="text"
                    value={values.billingAddress.city}
                    onChange={(e) => handleChange('billingAddress.city', e.target.value)}
                    onBlur={() => handleBlur('billingAddress.city')}
                  />
                </ValidationField>

                <ValidationField
                  id="billingAddress.state"
                  label="State *"
                  error={errors['billingAddress.state']}
                  isTouched={touched['billingAddress.state']}
                  isValid={isFieldValid('billingAddress.state')}
                >
                  <InputErrorState
                    id="billingAddress.state"
                    type="text"
                    value={values.billingAddress.state}
                    onChange={(e) => handleChange('billingAddress.state', e.target.value)}
                    onBlur={() => handleBlur('billingAddress.state')}
                  />
                </ValidationField>

                <ValidationField
                  id="billingAddress.postalCode"
                  label="ZIP / Postal Code *"
                  error={errors['billingAddress.postalCode']}
                  isTouched={touched['billingAddress.postalCode']}
                  isValid={isFieldValid('billingAddress.postalCode')}
                >
                  <InputErrorState
                    id="billingAddress.postalCode"
                    type="text"
                    value={values.billingAddress.postalCode}
                    onChange={(e) => handleChange('billingAddress.postalCode', e.target.value)}
                    onBlur={() => handleBlur('billingAddress.postalCode')}
                  />
                </ValidationField>

                <ValidationField
                  id="billingAddress.country"
                  label="Country *"
                  error={errors['billingAddress.country']}
                  isTouched={touched['billingAddress.country']}
                  isValid={isFieldValid('billingAddress.country')}
                >
                  <SelectErrorState
                    id="billingAddress.country"
                    value={values.billingAddress.country}
                    onChange={(e) => handleChange('billingAddress.country', e.target.value)}
                    onBlur={() => handleBlur('billingAddress.country')}
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                  </SelectErrorState>
                </ValidationField>
              </div>
            </div>
          </div>

          {/* Shipping Address Accordion */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsShippingOpen(!isShippingOpen)}
            >
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-400" /> Transaction Shipping Address
              </h3>
              <div className="flex items-center gap-3">
                {isShippingOpen ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
              </div>
            </div>

            {isShippingOpen && (
              <div className="space-y-4 mt-6 pt-6 border-t border-zinc-800/50 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <CheckboxErrorState
                    id="copyBilling"
                    checked={copyBilling}
                    onChange={(e) => setCopyBilling(e.target.checked)}
                  />
                  <label htmlFor="copyBilling" className="text-xs font-semibold text-zinc-400 cursor-pointer select-none">
                    Copy Billing Address
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ValidationField
                    id="shippingAddress.addressLine1"
                    label="Address Line 1 *"
                    error={errors['shippingAddress.addressLine1']}
                    isTouched={touched['shippingAddress.addressLine1']}
                    isValid={isFieldValid('shippingAddress.addressLine1')}
                    className="col-span-1 sm:col-span-2"
                  >
                    <InputErrorState
                      id="shippingAddress.addressLine1"
                      type="text"
                      value={values.shippingAddress.addressLine1}
                      onChange={(e) => handleChange('shippingAddress.addressLine1', e.target.value)}
                      onBlur={() => handleBlur('shippingAddress.addressLine1')}
                      disabled={copyBilling}
                    />
                  </ValidationField>

                  <ValidationField
                    id="shippingAddress.addressLine2"
                    label="Address Line 2"
                    error={errors['shippingAddress.addressLine2']}
                    isTouched={touched['shippingAddress.addressLine2']}
                    isValid={isFieldValid('shippingAddress.addressLine2')}
                    className="col-span-1 sm:col-span-2"
                  >
                    <InputErrorState
                      id="shippingAddress.addressLine2"
                      type="text"
                      value={values.shippingAddress.addressLine2}
                      onChange={(e) => handleChange('shippingAddress.addressLine2', e.target.value)}
                      onBlur={() => handleBlur('shippingAddress.addressLine2')}
                      disabled={copyBilling}
                    />
                  </ValidationField>

                  <ValidationField
                    id="shippingAddress.city"
                    label="City *"
                    error={errors['shippingAddress.city']}
                    isTouched={touched['shippingAddress.city']}
                    isValid={isFieldValid('shippingAddress.city')}
                  >
                    <InputErrorState
                      id="shippingAddress.city"
                      type="text"
                      value={values.shippingAddress.city}
                      onChange={(e) => handleChange('shippingAddress.city', e.target.value)}
                      onBlur={() => handleBlur('shippingAddress.city')}
                      disabled={copyBilling}
                    />
                  </ValidationField>

                  <ValidationField
                    id="shippingAddress.state"
                    label="State *"
                    error={errors['shippingAddress.state']}
                    isTouched={touched['shippingAddress.state']}
                    isValid={isFieldValid('shippingAddress.state')}
                  >
                    <InputErrorState
                      id="shippingAddress.state"
                      type="text"
                      value={values.shippingAddress.state}
                      onChange={(e) => handleChange('shippingAddress.state', e.target.value)}
                      onBlur={() => handleBlur('shippingAddress.state')}
                      disabled={copyBilling}
                    />
                  </ValidationField>

                  <ValidationField
                    id="shippingAddress.postalCode"
                    label="ZIP / Postal Code *"
                    error={errors['shippingAddress.postalCode']}
                    isTouched={touched['shippingAddress.postalCode']}
                    isValid={isFieldValid('shippingAddress.postalCode')}
                  >
                    <InputErrorState
                      id="shippingAddress.postalCode"
                      type="text"
                      value={values.shippingAddress.postalCode}
                      onChange={(e) => handleChange('shippingAddress.postalCode', e.target.value)}
                      onBlur={() => handleBlur('shippingAddress.postalCode')}
                      disabled={copyBilling}
                    />
                  </ValidationField>

                  <ValidationField
                    id="shippingAddress.country"
                    label="Country *"
                    error={errors['shippingAddress.country']}
                    isTouched={touched['shippingAddress.country']}
                    isValid={isFieldValid('shippingAddress.country')}
                  >
                    <SelectErrorState
                      id="shippingAddress.country"
                      value={values.shippingAddress.country}
                      onChange={(e) => handleChange('shippingAddress.country', e.target.value)}
                      onBlur={() => handleBlur('shippingAddress.country')}
                      disabled={copyBilling}
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                    </SelectErrorState>
                  </ValidationField>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Submit & error messages */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleProcessPayment}
              disabled={isProcessing}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.25)]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Processing Payment...
                </>
              ) : (
                <>Process Payment</>
              )}
            </button>
            
            <ValidationMessage id="submit-error" error={errors.submit} />
          </div>
        </FormErrorWrapper>
      )}
    </div>
  );
}
