'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { customersApi } from '@/lib/api';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [form, setForm] = useState({
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
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!form.email) {
      setError('Email address is required.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      companyName: form.companyName,
      phone: form.phone,
      mobilePhone: form.mobilePhone,
      billingAddress: {
        line1: form.billingLine1,
        line2: form.billingLine2,
        city: form.billingCity,
        state: form.billingState,
        zip: form.billingZip,
        country: form.billingCountry
      },
      shippingAddress: sameAsBilling ? {
        line1: form.billingLine1,
        line2: form.billingLine2,
        city: form.billingCity,
        state: form.billingState,
        zip: form.billingZip,
        country: form.billingCountry
      } : {
        line1: form.shippingLine1,
        line2: form.shippingLine2,
        city: form.shippingCity,
        state: form.shippingState,
        zip: form.shippingZip,
        country: form.shippingCountry
      }
    };

    try {
      await customersApi.createCustomer(payload);
      router.push('/customers');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create customer');
      setLoading(false);
    }
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Name & Contact */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6">Name & Contact</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">First Name</label>
              <input type="text" name="firstName" value={form.firstName} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Last Name</label>
              <input type="text" name="lastName" value={form.lastName} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Company Name</label>
              <input type="text" name="companyName" value={form.companyName} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email Address <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Phone Number</label>
              <input type="text" name="phone" placeholder="(555) 555-5555" value={form.phone} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Mobile Phone</label>
              <input type="text" name="mobilePhone" placeholder="(555) 555-5555" value={form.mobilePhone} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6">Billing Address</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Address Line 1</label>
              <input type="text" name="billingLine1" value={form.billingLine1} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Address Line 2</label>
              <input type="text" name="billingLine2" value={form.billingLine2} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">City</label>
                <input type="text" name="billingCity" value={form.billingCity} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">State</label>
                <input type="text" name="billingState" value={form.billingState} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">ZIP Code</label>
                <input type="text" name="billingZip" value={form.billingZip} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Country</label>
                <select name="billingCountry" value={form.billingCountry} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors">
                  <option>United States of America</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Shipping Address</h3>
          </div>
          
          <div className="mb-6 flex items-center gap-2">
            <input 
              type="checkbox" 
              id="sameAsBilling"
              checked={sameAsBilling}
              onChange={(e) => setSameAsBilling(e.target.checked)}
              className="rounded bg-zinc-950 border-zinc-800 text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor="sameAsBilling" className="text-sm text-zinc-400">Same as Billing Address</label>
          </div>

          {!sameAsBilling && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Address Line 1</label>
                <input type="text" name="shippingLine1" value={form.shippingLine1} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Address Line 2</label>
                <input type="text" name="shippingLine2" value={form.shippingLine2} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">City</label>
                  <input type="text" name="shippingCity" value={form.shippingCity} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">State</label>
                  <input type="text" name="shippingState" value={form.shippingState} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">ZIP Code</label>
                  <input type="text" name="shippingZip" value={form.shippingZip} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Country</label>
                  <select name="shippingCountry" value={form.shippingCountry} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors">
                    <option>United States of America</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Link href="/customers" className="px-6 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancel
          </Link>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-70 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Customer
          </button>
        </div>
      </div>
    </div>
  );
}
