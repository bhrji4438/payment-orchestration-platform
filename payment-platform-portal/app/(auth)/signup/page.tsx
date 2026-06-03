'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Cpu, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function SignupPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [form, setForm] = useState({
    merchantName: '',
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKeyPlain, setApiKeyPlain] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKeyPlain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.signup(form);
      const { accessToken, refreshToken, user, merchant, apiKeyPlain: key } = res.data;

      setTokens(accessToken, refreshToken);
      setUser({ ...user, merchant, permissions: [] });

      // Show API key reveal before redirect
      setApiKeyPlain(key);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-50 text-lg leading-none">Antigravity</h1>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Payment Core</span>
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
    const p = form.password;
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-zinc-50 text-lg leading-none">Antigravity</h1>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Payment Core</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-50">Create your account</h2>
            <p className="text-sm text-zinc-400 mt-1">Get started with payment orchestration</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Business name</label>
              <input
                name="merchantName"
                type="text"
                value={form.merchantName}
                onChange={handleChange}
                placeholder="Acme Corp"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Your full name</label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Smith"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane@acmecorp.com"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2"
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
          </form>

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
