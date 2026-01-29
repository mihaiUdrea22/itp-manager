'use client';

import { Card } from '@/components/ui/Card';
import { Bell, AlertTriangle, Calendar, FileCheck, CheckCircle, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

// Date mock pentru demo
const mockNotifications = [
  {
    id: '1',
    type: 'inspection_expired' as const,
    title: 'ITP Expirat',
    message: 'Mașina B 789 DEF are ITP-ul expirat de pe 10 octombrie 2024',
    relatedEntityType: 'inspection' as const,
    relatedEntityId: '3',
    isRead: false,
    createdAt: new Date('2024-11-10T08:00:00'),
  },
  {
    id: '2',
    type: 'inspection_due' as const,
    title: 'ITP Expiră Curând',
    message: 'Mașina CJ 456 XYZ are ITP-ul care expiră pe 20 noiembrie 2024',
    relatedEntityType: 'inspection' as const,
    relatedEntityId: '2',
    isRead: false,
    createdAt: new Date('2024-11-12T09:00:00'),
  },
  {
    id: '3',
    type: 'inspection_scheduled' as const,
    title: 'ITP Programat',
    message: 'Nouă programare ITP pentru B 123 ABC pe 15 noiembrie 2024, ora 10:00',
    relatedEntityType: 'inspection' as const,
    relatedEntityId: '1',
    isRead: true,
    createdAt: new Date('2024-11-13T10:00:00'),
  },
  {
    id: '4',
    type: 'inspection_due' as const,
    title: 'ITP Expiră Curând',
    message: 'Mașina B 321 GHI are ITP-ul care expiră pe 25 noiembrie 2024',
    relatedEntityType: 'inspection' as const,
    relatedEntityId: '4',
    isRead: true,
    createdAt: new Date('2024-11-11T11:00:00'),
  },
];

export default function NotificationsPage() {
  const unreadCount = mockNotifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'inspection_expired':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'inspection_due':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'inspection_scheduled':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'inspection_expired':
        return 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800';
      case 'inspection_due':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800';
      case 'inspection_scheduled':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notificări
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {unreadCount > 0
              ? `${unreadCount} notificări necitite`
              : 'Toate notificările au fost citite'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Marchează toate ca citite
          </button>
        )}
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-4">
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Toate
        </button>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Necitite
        </button>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          ITP Expirate
        </button>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Expiră Curând
        </button>
      </div>

      {/* Lista notificări */}
      <div className="space-y-3">
        {mockNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`p-4 border-l-4 transition-all hover:shadow-md ${
              notification.isRead ? 'opacity-75' : ''
            } ${getNotificationColor(notification.type)}`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Vezi Detalii
                  </button>
                  {!notification.isRead && (
                    <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                      Marchează ca citită
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
