'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { BRAND } from '@shared/constants/brand.constants';

import { z } from 'zod';
import {
  useFormValidation,
  ValidationField,
  InputErrorState,
  ValidationMessage,
  FormErrorWrapper
} from '@components/validation';

const LoginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldError,
    isFieldValid
  } = useFormValidation({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: LoginSchema,
    onSubmit: async (formValues) => {
      setLoading(true);
      try {
        const res = await authApi.login({ email: formValues.email, password: formValues.password });
        const { accessToken, refreshToken, user, merchant } = res.data;
        setTokens(accessToken, refreshToken);
        setUser({ ...user, merchant, permissions: [] });

        // Fetch full profile to get permissions
        try {
          const meRes = await authApi.me();
          setUser(meRes.data);
        } catch {}

        router.push('/dashboard');
      } catch (err: any) {
        setFieldError('submit', err.response?.data?.error || 'Login failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <img src="/logo.png" alt="Logo" width={40} height={40} className="rounded-lg shadow-lg shadow-indigo-500/15" />
          <div>
            <h1 className="font-bold text-zinc-50 text-lg leading-none">{BRAND.NAME}</h1>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{BRAND.CORE_SUBTITLE}</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-50">Welcome back</h2>
            <p className="text-sm text-zinc-400 mt-1">Sign in to your merchant account</p>
          </div>

          <FormErrorWrapper onSubmit={handleSubmit} className="space-y-4">
            <ValidationField id="email" label="Email address" error={errors.email} isTouched={touched.email} isValid={isFieldValid('email')}>
              <InputErrorState
                name="email"
                type="email"
                value={values.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="you@company.com"
              />
            </ValidationField>

            <ValidationField id="password" label="Password" error={errors.password} isTouched={touched.password} isValid={isFieldValid('password')}>
              <div className="flex items-center justify-between mb-1.5 absolute right-0 -top-6">
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <InputErrorState
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </ValidationField>

            <ValidationMessage id="login-submit-error" error={errors.submit} />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </FormErrorWrapper>

          <p className="text-center text-xs text-zinc-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
