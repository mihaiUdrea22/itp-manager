'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulare delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Validare simplă
      if (!email || !password) {
        setError('Te rugăm să completezi toate câmpurile');
        setLoading(false);
        return;
      }

      const storedUsers = localStorage.getItem('users');
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      const existingUser = users.find((u: any) => u.email === email);

      if (existingUser) {
        if (existingUser.isActive === false) {
          setError('Contul este dezactivat. Contactează managerul.');
          setLoading(false);
          return;
        }

        if (existingUser.password && existingUser.password !== password) {
          setError('Email sau parolă incorecte.');
          setLoading(false);
          return;
        }

        login({
          email: existingUser.email,
          companyId: existingUser.companyId,
          companyName: existingUser.companyName || 'ITP Manager',
          role: existingUser.role || 'manager',
          stationId: existingUser.stationId || undefined,
        });
      } else {
        // Dacă nu există utilizatori salvați, permitem login demo ca manager
        login({
          email,
          companyId: '1',
          companyName: 'ITP Services SRL',
          role: 'manager',
        });
      }

      // Redirect la dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('A apărut o eroare. Te rugăm să încerci din nou.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ITP Manager
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Conectează-te la contul tău
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="nume@companie.ro"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Parolă
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se conectează...' : 'Conectează-te'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Nu ai cont?{' '}
            </span>
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Înregistrează-te
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
