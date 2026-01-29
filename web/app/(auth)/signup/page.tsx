'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Date organizație, 2: Prima stație ITP
  const [formData, setFormData] = useState({
    // Date organizație
    companyName: '',
    cui: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    // Date prima stație
    stationName: '',
    stationCode: '',
    stationAddress: '',
    stationPhone: '',
    stationEmail: '',
    inspectorName: '',
    inspectorLicense: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validare
    if (
      !formData.companyName ||
      !formData.cui ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.phone
    ) {
      setError('Te rugăm să completezi toate câmpurile obligatorii');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }

    if (formData.password.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validare
    if (
      !formData.stationName ||
      !formData.stationCode ||
      !formData.stationAddress ||
      !formData.inspectorName ||
      !formData.inspectorLicense
    ) {
      setError('Te rugăm să completezi toate câmpurile obligatorii');
      setLoading(false);
      return;
    }

    try {
      // Simulare delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock: salvează în localStorage
      const companyId = Date.now().toString();
      localStorage.setItem('company', JSON.stringify({
        id: companyId,
        name: formData.companyName,
        cui: formData.cui,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      }));

      // Salvează prima stație
      const stationId = `station-${Date.now()}`;
      const stations = [{
        id: stationId,
        companyId,
        name: formData.stationName,
        code: formData.stationCode,
        address: formData.stationAddress,
        phone: formData.stationPhone || formData.phone,
        email: formData.stationEmail || formData.email,
        inspectorName: formData.inspectorName,
        inspectorLicense: formData.inspectorLicense,
        isActive: true,
      }];
      localStorage.setItem('stations', JSON.stringify(stations));
      localStorage.setItem('selectedStationId', stationId);

      // Salvează managerul în users
      const managerUser = {
        id: `user-${Date.now()}`,
        email: formData.email,
        name: formData.companyName || 'Manager',
        role: 'manager',
        companyId,
        companyName: formData.companyName,
        password: formData.password,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('users', JSON.stringify([managerUser]));

      login({
        email: formData.email,
        companyId,
        companyName: formData.companyName,
        role: 'manager',
      });

      // Redirect la dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('A apărut o eroare. Te rugăm să încerci din nou.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Creează Cont Organizație
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {step === 1
              ? 'Pasul 1: Date organizație'
              : 'Pasul 2: Adaugă prima stație ITP'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step >= 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date Organizație
                </span>
              </div>
              <div className="h-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mx-4"></div>
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step >= 2
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prima Stație ITP
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="companyName"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Nume Organizație *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="ITP Services SRL"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cui"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    CUI *
                  </label>
                  <input
                    id="cui"
                    type="text"
                    value={formData.cui}
                    onChange={(e) => handleInputChange('cui', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder="RO12345678"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder="contact@companie.ro"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Parolă *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Confirmă Parola *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Telefon *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="021-123-4567"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Adresă
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="București, Str. Exemplu nr. 1"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Continuă
              </button>
            </form>
          ) : (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="stationName"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Nume Stație ITP *
                  </label>
                  <input
                    id="stationName"
                    type="text"
                    value={formData.stationName}
                    onChange={(e) => handleInputChange('stationName', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder="Stația ITP Centrală"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="stationCode"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Cod Stație *
                  </label>
                  <input
                    id="stationCode"
                    type="text"
                    value={formData.stationCode}
                    onChange={(e) => handleInputChange('stationCode', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder="ITP-001"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="stationAddress"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Adresă Stație *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="stationAddress"
                    type="text"
                    value={formData.stationAddress}
                    onChange={(e) => handleInputChange('stationAddress', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder="București, Str. Principală nr. 123"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="stationPhone"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Telefon Stație
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="stationPhone"
                      type="tel"
                      value={formData.stationPhone}
                      onChange={(e) => handleInputChange('stationPhone', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="021-123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="stationEmail"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email Stație
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="stationEmail"
                      type="email"
                      value={formData.stationEmail}
                      onChange={(e) => handleInputChange('stationEmail', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="station@companie.ro"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="inspectorName"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Nume Inspector Autorizat *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="inspectorName"
                      type="text"
                      value={formData.inspectorName}
                      onChange={(e) => handleInputChange('inspectorName', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="Ion Popescu"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="inspectorLicense"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Număr Licență Inspector *
                  </label>
                  <input
                    id="inspectorLicense"
                    type="text"
                    value={formData.inspectorLicense}
                    onChange={(e) => handleInputChange('inspectorLicense', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder="INS-2023-001"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Înapoi
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Se creează contul...' : 'Finalizează Înregistrarea'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Ai deja cont?{' '}
            </span>
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Conectează-te
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
