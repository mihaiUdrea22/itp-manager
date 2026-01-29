'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  Car,
  FileCheck,
  Calendar,
  Bell,
  Settings,
  LogOut,
  X,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const managerNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Stații ITP', href: '/stations', icon: Building2 },
  { name: 'Clienți', href: '/clients', icon: Users },
  { name: 'Mașini', href: '/vehicles', icon: Car },
  { name: 'Inspecții', href: '/inspections', icon: FileCheck },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Rapoarte', href: '/reports', icon: FileText },
  { name: 'Notificări', href: '/notifications', icon: Bell },
  { name: 'Utilizatori', href: '/users', icon: Users },
  { name: 'Setări', href: '/settings', icon: Settings },
];

const engineerNavigation = [
  { name: 'Statistici', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clienți', href: '/clients', icon: Users },
  { name: 'Mașini', href: '/vehicles', icon: Car },
  { name: 'Inspecții', href: '/inspections', icon: FileCheck },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Notificări', href: '/notifications', icon: Bell },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userRole } = useAuth();

  const filteredNavigation =
    userRole === 'engineer' ? engineerNavigation : managerNavigation;

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          ITP Manager
        </h1>
        {/* Buton închidere pentru mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <LogoutButton />
      </div>
    </div>
  );
}

function LogoutButton() {
  const { logout, user } = useAuth();
  
  return (
    <button
      onClick={logout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <LogOut className="h-5 w-5" />
      Deconectare
    </button>
  );
}
