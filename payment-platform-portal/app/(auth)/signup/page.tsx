'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
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

const SignupSchema = z.object({
  merchantName: z.string().min(1, 'Business name is required'),
  name: z.string().min(1, 'Your full name is required'),
  email: z.string().min(1, 'Email address is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export default function SignupPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKeyPlain, setApiKeyPlain] = useState('');
  const [copied, setCopied] = useState(false);

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
      merchantName: '',
      name: '',
      email: '',
      password: ''
    },
    validationSchema: SignupSchema,
    onSubmit: async (formValues) => {
      setLoading(true);
      try {
        const res = await authApi.signup(formValues);
        const { accessToken, refreshToken, user, merchant, apiKeyPlain: key } = res.data;

        setTokens(accessToken, refreshToken);
        setUser({ ...user, merchant, permissions: [] });

        // Show API key reveal before redirect
        setApiKeyPlain(key);
      } catch (err: any) {
        setFieldError('submit', err.response?.data?.error || 'Sign up failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  });

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKeyPlain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinueToDashboard = () => {
    router.push('/dashboard');
  };

  // API key reveal screen
  if (apiKeyPlain) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <img src="/logo.png" alt="Logo" width={40} height={40} className="rounded-lg shadow-lg shadow-indigo-500/15" />
            <div>
              <h1 className="font-bold text-zinc-50 text-lg leading-none">{BRAND.NAME}</h1>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{BRAND.CORE_SUBTITLE}</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-zinc-50">Account Created!</h2>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-5">
              <p className="text-xs text-amber-300 font-semibold mb-1">⚠️ Save your API key now</p>
              <p className="text-xs text-amber-400">
                This is the <strong>only time</strong> your secret API key will be shown. Copy it and store it securely.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-5">
              <p className="text-[10px] font-semibold text-zinc-500 mb-1.5">SECRET API KEY</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs text-emerald-400 font-mono break-all">{apiKeyPlain}</code>
                <button
                  type="button"
                  onClick={copyApiKey}
                  className="shrink-0 text-xs px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 font-medium transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={handleContinueToDashboard}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
            >
              Continue to Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const passwordStrength = () => {
    const p = values.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'text-red-400', 'text-amber-400', 'text-yellow-400', 'text-emerald-400'];
    return { label: levels[score], color: colors[score], score };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <img src="/logo.png" alt="Logo" width={40} height={40} className="rounded-lg shadow-lg shadow-indigo-500/15" />
          <div>
            <h1 className="font-bold text-zinc-50 text-lg leading-none">{BRAND.NAME}</h1>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{BRAND.CORE_SUBTITLE}</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-50">Create your account</h2>
            <p className="text-sm text-zinc-400 mt-1">Get started with payment orchestration</p>
          </div>

          <FormErrorWrapper onSubmit={handleSubmit} className="space-y-4">
            <ValidationField id="merchantName" label="Business name" error={errors.merchantName} isTouched={touched.merchantName} isValid={isFieldValid('merchantName')}>
              <InputErrorState
                name="merchantName"
                type="text"
                value={values.merchantName}
                onChange={(e) => handleChange('merchantName', e.target.value)}
                onBlur={() => handleBlur('merchantName')}
                placeholder="Acme Corp"
              />
            </ValidationField>

            <ValidationField id="name" label="Your full name" error={errors.name} isTouched={touched.name} isValid={isFieldValid('name')}>
              <InputErrorState
                name="name"
                type="text"
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="Jane Smith"
              />
            </ValidationField>

            <ValidationField id="email" label="Email address" error={errors.email} isTouched={touched.email} isValid={isFieldValid('email')}>
              <InputErrorState
                name="email"
                type="email"
                value={values.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="jane@acmecorp.com"
              />
            </ValidationField>

            <ValidationField id="password" label="Password" error={errors.password} isTouched={touched.password} isValid={isFieldValid('password')}>
              <div className="relative">
                <InputErrorState
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {strength && strength.label && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 w-6 rounded-full transition-all ${
                          i <= strength.score
                            ? strength.score <= 1
                              ? 'bg-red-500'
                              : strength.score === 2
                              ? 'bg-amber-500'
                              : strength.score === 3
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
                            : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-medium ${strength.color}`}>{strength.label}</span>
                </div>
              )}
            </ValidationField>

            <ValidationMessage id="signup-submit-error" error={errors.submit} />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </FormErrorWrapper>

          <p className="text-center text-xs text-zinc-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
