'use client';

import { Card } from '@/components/ui/Card';
import { Building2, Users, Bell, CreditCard, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { userRole } = useAuth();

  if (userRole !== 'manager') {
    return (
      <Card className="p-12 text-center">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Acces restricționat
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Doar managerii pot accesa setările.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Setări
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Gestionează setările companiei și ale contului
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Informații Companie
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Gestionează datele companiei
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/20">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Utilizatori și Permisiuni
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Gestionează utilizatorii și rolurile
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20">
              <Bell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notificări
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Configurează notificările și alertele
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/20">
              <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Abonament și Facturare
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Gestionează abonamentul și facturarea
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/20">
              <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Securitate
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Setări de securitate și autentificare
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
