'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  FileCheck,
  Users,
  Car,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Building2,
  MessageCircle,
  Send,
  Eye,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DashboardStats } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatDateTime, formatTime } from '@/lib/utils';
import { VehicleHistoryModal } from '@/components/vehicles/VehicleHistoryModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { logActivity } from '@/lib/activityLog';
import { WidgetManager, Widget } from '@/components/dashboard/WidgetManager';
import { getActivityLogs } from '@/lib/activityLog';

type Client = {
  id: string;
  type: 'individual' | 'fleet';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
};

type Vehicle = {
  id: string;
  companyId: string;
  clientId: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
};

type Inspection = {
  id: string;
  stationId: string;
  clientId: string;
  vehicleId: string;
  scheduledDate?: string;
  completedDate?: string;
  status?: string;
  result?: string;
  nextInspectionDate?: string;
  expirationDate?: string;
  clientName?: string;
  vehicleLicensePlate?: string;
};

const PAGE_SIZE = 5;

export default function DashboardPage() {
  const { selectedStation, user, userRole, stations } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalInspections: 0,
    inspectionsThisMonth: 0,
    inspectionsToday: 0,
    upcomingInspections: 0,
    expiredInspections: 0,
    passedRate: 0,
    totalClients: 0,
    totalVehicles: 0,
    revenueThisMonth: 0,
  });
  const [stationInspections, setStationInspections] = useState<Inspection[]>([]);
  const [companyClients, setCompanyClients] = useState<Client[]>([]);
  const [companyVehicles, setCompanyVehicles] = useState<Vehicle[]>([]);
  const [expiringFilter, setExpiringFilter] = useState<'today' | 'week' | 'month'>('week');
  const [appointmentsFilter, setAppointmentsFilter] = useState<'today' | 'week' | 'month'>('week');
  const [clientsPage, setClientsPage] = useState(1);
  const [vehiclesPage, setVehiclesPage] = useState(1);
  
  // Modal states
  const [modalType, setModalType] = useState<'inspectionsToday' | 'inspectionsMonth' | 'clients' | 'vehicles' | 'expiring' | 'appointments' | null>(null);
  const [modalPage, setModalPage] = useState(1);
  const MODAL_PAGE_SIZE = 10;
  
  // Widget-uri personalizabile
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: 'stats', type: 'stats', title: 'Card-uri Statistici', enabled: true, order: 0 },
      { id: 'recent_activity', type: 'recent_activity', title: 'Activitate Recentă', enabled: true, order: 1 },
      { id: 'expiring_inspections', type: 'expiring_inspections', title: 'ITP-uri Expirate', enabled: true, order: 2 },
      { id: 'station_comparison', type: 'station_comparison', title: 'Comparație Stații', enabled: true, order: 3 },
      { id: 'trends', type: 'trends', title: 'Tendințe', enabled: true, order: 4 },
    ];
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentActivity();
  }, [selectedStation, user, userRole, stations]);
  
  useEffect(() => {
    localStorage.setItem('dashboard_widgets', JSON.stringify(widgets));
  }, [widgets]);
  
  const loadRecentActivity = () => {
    const logs = getActivityLogs(undefined, selectedStation?.id, 10);
    setRecentActivity(logs);
  };
  
  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);

  const loadStats = () => {
    const storedInspections = localStorage.getItem('inspections');
    const storedClients = localStorage.getItem('clients');
    const storedVehicles = localStorage.getItem('vehicles');

    let inspections: Inspection[] = [];
    let clients: Client[] = [];
    let vehicles: Vehicle[] = [];

    if (storedInspections) {
      const parsedInspections = JSON.parse(storedInspections) as Inspection[];
      
      // Managerii văd toate inspecțiile de la toate stațiile lor
      // Inginerii văd doar inspecțiile de la stația lor asignată
      if (userRole === 'manager' && user?.companyId) {
        // Filtrează inspecțiile pentru toate stațiile companiei
        const companyStationIds = stations
          .filter((s) => s.companyId === user.companyId)
          .map((s) => s.id);
        inspections = parsedInspections.filter((i) => companyStationIds.includes(i.stationId));
      } else if (userRole === 'engineer' && selectedStation) {
        // Inginerii văd doar inspecțiile de la stația lor
        inspections = parsedInspections.filter((i) => i.stationId === selectedStation.id);
      }
    }
    // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
    let currentCompanyId = user?.companyId;
    if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
      currentCompanyId = selectedStation.companyId;
    }
    
    if (storedClients) {
      const parsedClients = JSON.parse(storedClients) as Client[];
      // Filtrează doar clienții companiei curente (și exclude pe cei fără companyId)
      clients = currentCompanyId
        ? parsedClients.filter((c: any) => c.companyId && c.companyId === currentCompanyId)
        : [];
    }
    if (storedVehicles) {
      const parsedVehicles = JSON.parse(storedVehicles) as Vehicle[];
      // Filtrează doar mașinile companiei curente (și exclude pe cele fără companyId)
      vehicles = currentCompanyId
        ? parsedVehicles.filter((v: any) => v.companyId && v.companyId === currentCompanyId)
        : [];
    }

    setStationInspections(inspections);
    setCompanyClients(clients);
    setCompanyVehicles(vehicles);

    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    const completedInspections = inspections.filter(
      (i) => i.status === 'passed' || i.status === 'failed'
    );

    const inspectionsToday = completedInspections.filter((i) => {
      const inspectionDate = new Date(i.completedDate || i.scheduledDate || '');
      return (
        inspectionDate.getDate() === today.getDate() &&
        inspectionDate.getMonth() === today.getMonth() &&
        inspectionDate.getFullYear() === today.getFullYear()
      );
    }).length;

    const inspectionsThisMonth = completedInspections.filter((i) => {
      const inspectionDate = new Date(i.completedDate || i.scheduledDate || '');
      return (
        inspectionDate.getMonth() === thisMonth &&
        inspectionDate.getFullYear() === thisYear
      );
    }).length;

    const passedInspections = completedInspections.filter(
      (i) => i.result === 'passed'
    ).length;
    const passedRate =
      completedInspections.length > 0
        ? (passedInspections / completedInspections.length) * 100
        : 0;

    const upcomingInspections = inspections.filter((i) => {
      const exp = i.nextInspectionDate || i.expirationDate;
      if (!exp) return false;
      const nextDate = new Date(exp);
      const diffTime = nextDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    }).length;

    const expiredInspections = inspections.filter((i) => {
      const exp = i.nextInspectionDate || i.expirationDate;
      if (!exp) return false;
      const nextDate = new Date(exp);
      return nextDate.getTime() < today.getTime();
    }).length;

    setStats({
      totalInspections: inspections.length,
      inspectionsThisMonth,
      inspectionsToday,
      upcomingInspections,
      expiredInspections,
      passedRate: Math.round(passedRate * 10) / 10,
      totalClients: clients.length,
      totalVehicles: vehicles.length,
      revenueThisMonth: inspectionsThisMonth * 500,
    });
  };

  const displayStats = stats;

  const statCards = [
    {
      title: 'Inspecții Astăzi',
      value: displayStats.inspectionsToday,
      icon: FileCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Inspecții Luna Aceasta',
      value: displayStats.inspectionsThisMonth,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Clienți Total',
      value: displayStats.totalClients,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Mașini Înregistrate',
      value: displayStats.totalVehicles,
      icon: Car,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const today = new Date();
  const isInRange = (dateStr?: string, range: 'today' | 'week' | 'month' = 'today') => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (range === 'today') {
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }
    const days = range === 'week' ? 7 : 30;
    const diff = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  };

  const inspectionsCompletedToday = stationInspections.filter(
    (i) =>
      (i.status === 'passed' || i.status === 'failed') &&
      isInRange(i.completedDate || i.scheduledDate, 'today')
  );

  const inspectionsCompletedMonth = stationInspections.filter(
    (i) =>
      (i.status === 'passed' || i.status === 'failed') &&
      isInRange(i.completedDate || i.scheduledDate, 'month')
  );

  const expiringList = stationInspections.filter((i) =>
    isInRange(i.nextInspectionDate || i.expirationDate, expiringFilter)
  );

  const appointmentsList = stationInspections.filter(
    (i) =>
      i.status === 'scheduled' &&
      isInRange(i.scheduledDate, appointmentsFilter)
  );

  const paginatedClients = useMemo(() => {
    const start = (clientsPage - 1) * PAGE_SIZE;
    return companyClients.slice(start, start + PAGE_SIZE);
  }, [companyClients, clientsPage]);

  const paginatedVehicles = useMemo(() => {
    const start = (vehiclesPage - 1) * PAGE_SIZE;
    return companyVehicles.slice(start, start + PAGE_SIZE);
  }, [companyVehicles, vehiclesPage]);

  const totalClientPages = Math.max(1, Math.ceil(companyClients.length / PAGE_SIZE));
  const totalVehiclePages = Math.max(1, Math.ceil(companyVehicles.length / PAGE_SIZE));

  const getClientName = (clientId?: string) => {
    const client = companyClients.find((c) => c.id === clientId);
    if (!client) return 'Client';
    return client.type === 'individual'
      ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
      : client.companyName || 'Client';
  };

  const getClient = (clientId?: string) => {
    return companyClients.find((c) => c.id === clientId);
  };

  const generateWhatsAppMessage = (inspection: any) => {
    const client = getClient(inspection.clientId);
    const clientName = getClientName(inspection.clientId);
    const expirationDate = formatDate(inspection.nextInspectionDate || inspection.expirationDate || '');
    const vehiclePlate = inspection.vehicleLicensePlate || 'mașina dvs.';
    
    const message = `Bună ziua, ${clientName}!

Vă informăm că ITP-ul pentru mașina ${vehiclePlate} expiră pe ${expirationDate}.

Vă rugăm să ne contactați pentru a programa o inspecție tehnică periodică.

Mulțumim,
${selectedStation?.name || 'Echipa ITP'}`;

    return encodeURIComponent(message);
  };

  const getWhatsAppLink = (phone: string, message: string) => {
    // Elimină spațiile și caracterele speciale din număr
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    // Adaugă prefixul 40 dacă nu există
    const phoneNumber = cleanPhone.startsWith('40') ? cleanPhone : `40${cleanPhone}`;
    return `https://wa.me/${phoneNumber}?text=${message}`;
  };

  const handleSendWhatsApp = (inspection: any) => {
    const client = getClient(inspection.clientId);
    if (!client || !client.phone) {
      alert('Clientul nu are număr de telefon înregistrat.');
      return;
    }
    
    const message = generateWhatsAppMessage(inspection);
    const whatsappLink = getWhatsAppLink(client.phone, message);
    window.open(whatsappLink, '_blank');
  };

  const handleSendWhatsAppToAll = () => {
    if (expiringList.length === 0) {
      alert('Nu există ITP-uri care expiră în perioada selectată.');
      return;
    }

    const clientsWithPhone = expiringList
      .map((i) => {
        const client = getClient(i.clientId);
        return client && client.phone ? { inspection: i, client } : null;
      })
      .filter((item): item is { inspection: any; client: any } => item !== null);

    if (clientsWithPhone.length === 0) {
      alert('Niciun client din listă nu are număr de telefon înregistrat.');
      return;
    }

    // Deschide fiecare link WhatsApp într-un interval mic pentru a evita blocarea de către browser
    clientsWithPhone.forEach((item, index) => {
      setTimeout(() => {
        const message = generateWhatsAppMessage(item.inspection);
        const whatsappLink = getWhatsAppLink(item.client.phone, message);
        window.open(whatsappLink, '_blank');
      }, index * 500); // 500ms între fiecare deschidere
    });
  };

  const openModal = (type: typeof modalType) => {
    setModalType(type);
    setModalPage(1);
  };

  const closeModal = () => {
    setModalType(null);
    setModalPage(1);
  };

  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    item: any;
    type: string;
  }>({ isOpen: false, item: null, type: '' });
  
  const handleView = (item: any, type: string) => {
    if (type === 'vehicle') {
      // Deschide modal cu istoric ITP
      setSelectedVehicleForHistory(item);
    } else {
      // Navigate to detail page or show details
      console.log('View', type, item);
      alert(`Vizualizare detalii pentru ${type}`);
    }
  };

  const handleEdit = (item: any, type: string) => {
    // Navigate to edit page
    console.log('Edit', type, item);
    if (type === 'client') {
      window.location.href = '/clients';
    } else if (type === 'vehicle') {
      window.location.href = '/vehicles';
    } else if (type === 'inspection') {
      window.location.href = '/inspections';
    }
  };

  const handleDelete = (item: any, type: string) => {
    setDeleteConfirm({ isOpen: true, item, type });
  };

  const confirmDelete = () => {
    const { item, type } = deleteConfirm;
    if (!item || !type) return;

    const entityName = type === 'client'
      ? (item.type === 'individual' ? `${item.firstName || ''} ${item.lastName || ''}`.trim() : item.companyName || 'Client')
      : type === 'vehicle'
      ? item.licensePlate
      : `ITP ${item.vehicleLicensePlate || item.id}`;

    if (type === 'client') {
      const storedClients = localStorage.getItem('clients');
      if (storedClients) {
        const clients = JSON.parse(storedClients);
        const updated = clients.filter((c: any) => c.id !== item.id);
        localStorage.setItem('clients', JSON.stringify(updated));
        
        // Log activity
        logActivity(
          user?.email || 'unknown',
          user?.email || 'unknown',
          userRole || 'unknown',
          'delete',
          'client',
          item.id,
          entityName,
          `Client șters: ${entityName}`,
          selectedStation?.id,
          selectedStation?.name
        );
        
        loadStats();
        alert('Client șters cu succes!');
      }
    } else if (type === 'vehicle') {
      const storedVehicles = localStorage.getItem('vehicles');
      if (storedVehicles) {
        const vehicles = JSON.parse(storedVehicles);
        const updated = vehicles.filter((v: any) => v.id !== item.id);
        localStorage.setItem('vehicles', JSON.stringify(updated));
        
        // Log activity
        logActivity(
          user?.email || 'unknown',
          user?.email || 'unknown',
          userRole || 'unknown',
          'delete',
          'vehicle',
          item.id,
          entityName,
          `Mașină ștearsă: ${entityName}`,
          selectedStation?.id,
          selectedStation?.name
        );
        
        loadStats();
        alert('Mașină ștearsă cu succes!');
      }
    } else if (type === 'inspection') {
      const storedInspections = localStorage.getItem('inspections');
      if (storedInspections) {
        const inspections = JSON.parse(storedInspections);
        const updated = inspections.filter((i: any) => i.id !== item.id);
        localStorage.setItem('inspections', JSON.stringify(updated));
        
        // Log activity
        logActivity(
          user?.email || 'unknown',
          user?.email || 'unknown',
          userRole || 'unknown',
          'delete',
          'inspection',
          item.id,
          entityName,
          `Inspecție ștearsă: ${entityName}`,
          item.stationId,
          item.stationName
        );
        
        loadStats();
        alert('Inspecție ștearsă cu succes!');
      }
    }

    setDeleteConfirm({ isOpen: false, item: null, type: '' });
  };

  const getModalData = () => {
    switch (modalType) {
      case 'inspectionsToday':
        return {
          title: 'ITP-uri făcute astăzi',
          items: inspectionsCompletedToday,
          type: 'inspection',
        };
      case 'inspectionsMonth':
        return {
          title: 'ITP-uri făcute luna aceasta',
          items: inspectionsCompletedMonth,
          type: 'inspection',
        };
      case 'clients':
        return {
          title: 'Clienți totali',
          items: companyClients,
          type: 'client',
        };
      case 'vehicles':
        return {
          title: 'Mașini înregistrate',
          items: companyVehicles,
          type: 'vehicle',
        };
      case 'expiring':
        return {
          title: 'ITP-uri care expiră',
          items: expiringList,
          type: 'inspection',
        };
      case 'appointments':
        return {
          title: 'Programări',
          items: appointmentsList,
          type: 'inspection',
        };
      default:
        return { title: '', items: [], type: '' };
    }
  };

  const modalData = getModalData();
  const paginatedModalItems = useMemo(() => {
    const start = (modalPage - 1) * MODAL_PAGE_SIZE;
    return modalData.items.slice(start, start + MODAL_PAGE_SIZE);
  }, [modalData.items, modalPage]);
  const totalModalPages = Math.max(1, Math.ceil(modalData.items.length / MODAL_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Statistici
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {userRole === 'manager'
                ? `Prezentare generală pentru toate stațiile (${stations.length} stații)`
                : selectedStation
                ? `Prezentare generală pentru ${selectedStation.name}`
                : 'Prezentare generală a activității stațiilor ITP'}
            </p>
          </div>
          {selectedStation && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedStation.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedStation.code}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {userRole === 'engineer' && !selectedStation ? (
        <Card className="p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Selectează o Stație
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Selectează o stație ITP din header pentru a vedea dashboard-ul.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-full p-2 sm:p-3 ${stat.bgColor} dark:bg-gray-800`}>
                    <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color} dark:text-gray-300`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    ITP-uri făcute astăzi
                  </h2>
                </div>
                {inspectionsCompletedToday.length > 0 && (
                  <button
                    onClick={() => openModal('inspectionsToday')}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <Eye className="h-4 w-4" />
                    Vezi detalii
                  </button>
                )}
              </div>
              {inspectionsCompletedToday.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nu există ITP-uri finalizate astăzi.
                </p>
              ) : (
                <div className="space-y-3">
                  {inspectionsCompletedToday.map((i) => (
                    <div key={i.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {i.vehicleLicensePlate || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getClientName(i.clientId)}
                          </p>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {formatTime(i.completedDate || i.scheduledDate || '')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    ITP-uri făcute luna aceasta
                  </h2>
                </div>
                {inspectionsCompletedMonth.length > 0 && (
                  <button
                    onClick={() => openModal('inspectionsMonth')}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <Eye className="h-4 w-4" />
                    Vezi detalii
                  </button>
                )}
              </div>
              {inspectionsCompletedMonth.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nu există ITP-uri finalizate luna aceasta.
                </p>
              ) : (
                <div className="space-y-3">
                  {inspectionsCompletedMonth.slice(0, 5).map((i) => (
                    <div key={i.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {i.vehicleLicensePlate || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getClientName(i.clientId)}
                          </p>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {formatDate(i.completedDate || i.scheduledDate || '')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Clienți totali
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {companyClients.length} total
                  </span>
                  {companyClients.length > 0 && (
                    <button
                      onClick={() => openModal('clients')}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Eye className="h-4 w-4" />
                      Vezi detalii
                    </button>
                  )}
                </div>
              </div>
              {paginatedClients.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nu există clienți.
                </p>
              ) : (
                <div className="space-y-3">
                  {paginatedClients.map((c) => (
                    <div key={c.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {c.type === 'individual'
                          ? `${c.firstName || ''} ${c.lastName || ''}`.trim()
                          : c.companyName || 'Client'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {c.phone || 'Telefon n/a'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  onClick={() => setClientsPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700"
                >
                  Înapoi
                </button>
                <span className="text-gray-600 dark:text-gray-400">
                  {clientsPage} / {totalClientPages}
                </span>
                <button
                  onClick={() => setClientsPage((p) => Math.min(totalClientPages, p + 1))}
                  className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700"
                >
                  Înainte
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Mașini înregistrate
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {companyVehicles.length} total
                  </span>
                  {companyVehicles.length > 0 && (
                    <button
                      onClick={() => openModal('vehicles')}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Eye className="h-4 w-4" />
                      Vezi detalii
                    </button>
                  )}
                </div>
              </div>
              {paginatedVehicles.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nu există mașini.
                </p>
              ) : (
                <div className="space-y-3">
                  {paginatedVehicles.map((v) => (
                    <div key={v.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {v.licensePlate}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {v.make} {v.model} ({v.year})
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  onClick={() => setVehiclesPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700"
                >
                  Înapoi
                </button>
                <span className="text-gray-600 dark:text-gray-400">
                  {vehiclesPage} / {totalVehiclePages}
                </span>
                <button
                  onClick={() => setVehiclesPage((p) => Math.min(totalVehiclePages, p + 1))}
                  className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700"
                >
                  Înainte
                </button>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    ITP-uri care expiră
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {expiringList.length > 0 && (
                    <>
                      <button
                        onClick={() => openModal('expiring')}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <Eye className="h-4 w-4" />
                        Vezi detalii
                      </button>
                      <button
                        onClick={handleSendWhatsAppToAll}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                        title="Trimite mesaje WhatsApp tuturor clienților"
                      >
                        <Send className="h-4 w-4" />
                        Trimite tuturor
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="mb-3 flex gap-2 text-sm">
                <button
                  onClick={() => setExpiringFilter('today')}
                  className={`rounded-lg border px-3 py-1 ${expiringFilter === 'today' ? 'bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'}`}
                >
                  Azi
                </button>
                <button
                  onClick={() => setExpiringFilter('week')}
                  className={`rounded-lg border px-3 py-1 ${expiringFilter === 'week' ? 'bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'}`}
                >
                  Săptămâna
                </button>
                <button
                  onClick={() => setExpiringFilter('month')}
                  className={`rounded-lg border px-3 py-1 ${expiringFilter === 'month' ? 'bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'}`}
                >
                  Luna
                </button>
              </div>
              {expiringList.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nu există ITP-uri care expiră în perioada selectată.
                </p>
              ) : (
                <div className="space-y-3">
                  {expiringList.slice(0, 5).map((i) => {
                    const client = getClient(i.clientId);
                    const hasPhone = client && client.phone;
                    return (
                      <div key={i.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {i.vehicleLicensePlate || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {getClientName(i.clientId)} • Expiră:{' '}
                              {formatDate(i.nextInspectionDate || i.expirationDate || '')}
                            </p>
                          </div>
                          {hasPhone ? (
                            <button
                              onClick={() => handleSendWhatsApp(i)}
                              className="ml-3 flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                              title="Trimite mesaj WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </button>
                          ) : (
                            <span className="ml-3 text-xs text-gray-400" title="Clientul nu are număr de telefon">
                              Fără telefon
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Programări
                  </h2>
                </div>
                {appointmentsList.length > 0 && (
                  <button
                    onClick={() => openModal('appointments')}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <Eye className="h-4 w-4" />
                    Vezi detalii
                  </button>
                )}
              </div>
              <div className="mb-3 flex gap-2 text-sm">
                <button
                  onClick={() => setAppointmentsFilter('today')}
                  className={`rounded-lg border px-3 py-1 ${appointmentsFilter === 'today' ? 'bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'}`}
                >
                  Azi
                </button>
                <button
                  onClick={() => setAppointmentsFilter('week')}
                  className={`rounded-lg border px-3 py-1 ${appointmentsFilter === 'week' ? 'bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'}`}
                >
                  Săptămâna
                </button>
                <button
                  onClick={() => setAppointmentsFilter('month')}
                  className={`rounded-lg border px-3 py-1 ${appointmentsFilter === 'month' ? 'bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'}`}
                >
                  Luna
                </button>
              </div>
              {appointmentsList.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nu există programări în perioada selectată.
                </p>
              ) : (
                <div className="space-y-3">
                  {appointmentsList.slice(0, 5).map((i) => (
                    <div key={i.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {i.vehicleLicensePlate || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getClientName(i.clientId)} •{' '}
                        {formatDateTime(i.scheduledDate || '')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performanță
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Rata de Trecere
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {displayStats.passedRate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Venit Luna Aceasta
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {displayStats.revenueThisMonth.toLocaleString('ro-RO')} RON
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Inspecții Totale
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {displayStats.totalInspections}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Modal pentru detalii */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl dark:bg-gray-900 flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6 dark:border-gray-800">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate flex-1 pr-2">
                {modalData.title}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {paginatedModalItems.length === 0 ? (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  Nu există elemente de afișat.
                </p>
              ) : (
                <div className="space-y-3">
                  {paginatedModalItems.map((item: any) => {
                    if (modalData.type === 'client') {
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.type === 'individual'
                                ? `${item.firstName || ''} ${item.lastName || ''}`.trim()
                                : item.companyName || 'Client'}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                              {item.phone && <span>📞 {item.phone}</span>}
                              {item.email && <span>✉️ {item.email}</span>}
                              {item.address && <span>📍 {item.address}</span>}
                            </div>
                            <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                              {item.type === 'individual' ? 'Individual' : 'Flotă Auto'}
                            </span>
                          </div>
                          <div className="ml-4 flex gap-2">
                            <button
                              onClick={() => handleView(item, 'client')}
                              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              title="Vizualizează"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item, 'client')}
                              className="rounded-lg border border-blue-300 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                              title="Editează"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item, 'client')}
                              className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                              title="Șterge"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    } else if (modalData.type === 'vehicle') {
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.licensePlate}
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {item.make} {item.model} ({item.year})
                            </p>
                            {item.clientId && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                Client: {getClientName(item.clientId)}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex gap-2">
                            <button
                              onClick={() => handleView(item, 'vehicle')}
                              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              title="Vizualizează"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item, 'vehicle')}
                              className="rounded-lg border border-blue-300 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                              title="Editează"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item, 'vehicle')}
                              className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                              title="Șterge"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      // Inspection
                      const client = getClient(item.clientId);
                      const hasPhone = client && client.phone;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.vehicleLicensePlate || 'N/A'}
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {getClientName(item.clientId)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-500">
                              {item.scheduledDate && (
                                <span>
                                  Programat: {formatDateTime(item.scheduledDate)}
                                </span>
                              )}
                              {item.completedDate && (
                                <span>
                                  Finalizat: {formatDateTime(item.completedDate)}
                                </span>
                              )}
                              {item.nextInspectionDate && (
                                <span>
                                  Expiră: {formatDate(item.nextInspectionDate)}
                                </span>
                              )}
                              {item.status && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                                  {item.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex gap-2">
                            {hasPhone && (
                              <button
                                onClick={() => handleSendWhatsApp(item)}
                                className="rounded-lg border border-green-300 bg-green-50 p-2 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400"
                                title="Trimite WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleView(item, 'inspection')}
                              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              title="Vizualizează"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item, 'inspection')}
                              className="rounded-lg border border-blue-300 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                              title="Editează"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item, 'inspection')}
                              className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                              title="Șterge"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>

            {totalModalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 border-t border-gray-200 p-4 dark:border-gray-800">
                <button
                  onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                  disabled={modalPage === 1}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Înapoi
                </button>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Pagina {modalPage} din {totalModalPages}
                </span>
                <button
                  onClick={() => setModalPage((p) => Math.min(totalModalPages, p + 1))}
                  disabled={modalPage === totalModalPages}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Înainte
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Istoric ITP pentru mașini din dashboard */}
      {selectedVehicleForHistory && (
        <VehicleHistoryModal
          vehicleId={selectedVehicleForHistory.id}
          vehicle={selectedVehicleForHistory}
          onClose={() => setSelectedVehicleForHistory(null)}
        />
      )}
    </div>
  );
}
