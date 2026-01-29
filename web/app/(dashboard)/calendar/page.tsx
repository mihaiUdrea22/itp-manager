'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import roLocale from '@fullcalendar/core/locales/ro';
import type { DateSelectArg, EventDropArg, EventResizeDoneArg } from '@fullcalendar/core';


type Client = {
  id: string;
  type: 'individual' | 'fleet';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone: string;
};

type Vehicle = {
  id: string;
  clientId: string;
  licensePlate: string;
  make: string;
  model: string;
};

type Inspection = {
  id: string;
  stationId: string;
  clientId: string;
  vehicleId: string;
  scheduledDate: string;
  durationMinutes: number;
  periodMonths: 6 | 12 | 24;
  status: 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'cancelled';
  clientName: string;
  vehicleLicensePlate: string;
};

export default function CalendarPage() {
  const { selectedStation, user, userRole, stations } = useAuth();
  const [filterStationId, setFilterStationId] = useState<string>('all'); // 'all' sau ID-ul stației
  const [appointments, setAppointments] = useState<Inspection[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState<string>('');
  const [selectedEnd, setSelectedEnd] = useState<string>('');
  const [overlapWarning, setOverlapWarning] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [formData, setFormData] = useState({
    clientId: '',
    vehicleId: '',
    periodMonths: '12',
    durationMinutes: '30',
    status: 'scheduled',
  });
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);
  const [newClient, setNewClient] = useState({
    type: 'individual' as 'individual' | 'fleet',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
  });
  const [newVehicle, setNewVehicle] = useState({
    licensePlate: '',
    make: '',
    model: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedStation, user, userRole, stations, filterStationId]);

  const loadData = () => {
    const storedInspections = localStorage.getItem('inspections');
    const storedClients = localStorage.getItem('clients');
    const storedVehicles = localStorage.getItem('vehicles');

    if (storedClients) {
      const parsedClients = JSON.parse(storedClients) as any[];
      
      // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
      let currentCompanyId = user?.companyId;
      if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
        currentCompanyId = selectedStation.companyId;
      }
      
      // Filtrează doar clienții companiei curente (și exclude pe cei fără companyId)
      const filtered = currentCompanyId
        ? parsedClients.filter((c) => c.companyId && c.companyId === currentCompanyId)
        : [];
      setClients(filtered);
    } else {
      setClients([]);
    }

    if (storedVehicles) {
      const parsedVehicles = JSON.parse(storedVehicles) as any[];
      
      // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
      let currentCompanyId = user?.companyId;
      if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
        currentCompanyId = selectedStation.companyId;
      }
      
      // Filtrează doar mașinile companiei curente (și exclude pe cele fără companyId)
      const filtered = currentCompanyId
        ? parsedVehicles.filter((v) => v.companyId && v.companyId === currentCompanyId)
        : [];
      setVehicles(filtered);
    } else {
      setVehicles([]);
    }

    if (storedInspections) {
      const parsedInspections = JSON.parse(storedInspections) as Inspection[];
      
      // Managerii pot alege să vadă toate programările sau doar de la o stație
      // Inginerii văd doar programările de la stația lor asignată
      if (userRole === 'manager' && user?.companyId) {
        const companyStationIds = stations
          .filter((s) => s.companyId === user.companyId)
          .map((s) => s.id);
        
        let filteredAppointments;
        if (filterStationId === 'all') {
          // Toate programările de la toate stațiile
          filteredAppointments = parsedInspections.filter(
            (i) => companyStationIds.includes(i.stationId) && i.status === 'scheduled'
          );
        } else {
          // Doar programările de la stația selectată
          filteredAppointments = parsedInspections.filter(
            (i) => i.stationId === filterStationId && 
                   companyStationIds.includes(i.stationId) && 
                   i.status === 'scheduled'
          );
        }
        setAppointments(filteredAppointments);
      } else if (userRole === 'engineer' && selectedStation) {
        // Inginerii văd doar programările de la stația lor
        const stationInspections = parsedInspections.filter(
          (i) => i.stationId === selectedStation.id && i.status === 'scheduled'
        );
        setAppointments(stationInspections);
      } else {
        setAppointments([]);
      }
    } else {
      setAppointments([]);
    }
  };

  const getStatusColor = (status: Inspection['status']) => {
    switch (status) {
      case 'passed':
        return '#16a34a';
      case 'failed':
        return '#dc2626';
      case 'in_progress':
        return '#f59e0b';
      case 'cancelled':
        return '#6b7280';
      default:
        return '#2563eb';
    }
  };

  const getStationColor = (stationId: string) => {
    let hash = 0;
    for (let i = 0; i < stationId.length; i += 1) {
      hash = stationId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 70% 45%)`;
  };

  const calendarEvents = useMemo(() => {
    return appointments.map((i) => ({
      id: i.id,
      title: `${i.vehicleLicensePlate} • ${i.clientName}`,
      start: i.scheduledDate,
      end: new Date(
        new Date(i.scheduledDate).getTime() + i.durationMinutes * 60000
      ).toISOString(),
      backgroundColor: getStatusColor(i.status),
      borderColor: getStationColor(i.stationId),
      textColor: '#ffffff',
      extendedProps: {
        inspectionId: i.id,
      },
    }));
  }, [appointments]);

  const hasOverlap = (start: string, end: string, excludeId?: string) => {
    const newStart = new Date(start).getTime();
    const newEnd = new Date(end).getTime();
    return appointments.some((a) => {
      if (excludeId && a.id === excludeId) return false;
      const aStart = new Date(a.scheduledDate).getTime();
      const aEnd = aStart + a.durationMinutes * 60000;
      return newStart < aEnd && newEnd > aStart;
    });
  };

  const triggerOverlapWarning = (message: string) => {
    setOverlapWarning(message);
    setTimeout(() => setOverlapWarning(''), 2500);
  };

  const handleSelect = (info: DateSelectArg) => {
    setSelectedStart(info.startStr);
    setSelectedEnd(info.endStr || info.startStr);
    setFormData({
      clientId: '',
      vehicleId: '',
      periodMonths: '12',
      durationMinutes: '30',
      status: 'scheduled',
    });
    setShowNewClientForm(false);
    setShowNewVehicleForm(false);
    setClientSearch('');
    setOverlapWarning('');
    setIsModalOpen(true);
  };

  const handleEventDrop = (info: EventDropArg) => {
    const inspectionId = info.event.extendedProps.inspectionId as string;
    const newStart = info.event.startStr;
    const newEnd = info.event.endStr || info.event.startStr;
    if (hasOverlap(newStart, newEnd, inspectionId)) {
      info.revert();
      triggerOverlapWarning('Programarea se suprapune cu alta existentă.');
      return;
    }
    const updated = appointments.map((i) =>
      i.id === inspectionId ? { ...i, scheduledDate: newStart } : i
    );
    setAppointments(updated);
    localStorage.setItem('inspections', JSON.stringify(updated));
  };

  const handleEventResize = (info: EventResizeDoneArg) => {
    const inspectionId = info.event.extendedProps.inspectionId as string;
    if (hasOverlap(info.event.startStr, info.event.endStr!, inspectionId)) {
      info.revert();
      triggerOverlapWarning('Programarea se suprapune cu alta existentă.');
      return;
    }
    const durationMinutes = Math.max(
      15,
      Math.round(
        (info.event.end!.getTime() - info.event.start!.getTime()) / 60000
      )
    );
    const updated = appointments.map((i) =>
      i.id === inspectionId ? { ...i, durationMinutes } : i
    );
    setAppointments(updated);
    localStorage.setItem('inspections', JSON.stringify(updated));
  };

  const handleCreateAppointment = () => {
    // Pentru manageri, folosim stația selectată în filter
    // Pentru ingineri, folosim stația lor asignată
    let stationToUse = selectedStation;
    
    if (userRole === 'manager') {
      // Managerii trebuie să selecteze o stație specifică (nu "all")
      if (filterStationId === 'all') {
        alert('Te rugăm să selectezi o stație specifică pentru a crea programarea.');
        return;
      }
      stationToUse = stations.find(s => s.id === filterStationId) || null;
      if (!stationToUse) {
        alert('Stația selectată nu este validă.');
        return;
      }
    } else if (!selectedStation) {
      alert('Te rugăm să selectezi o stație pentru a crea programarea.');
      return;
    }
    if (!formData.clientId || !formData.vehicleId) return;
    if (!selectedStart) {
      alert('Te rugăm să selectezi o dată și oră pentru programare.');
      return;
    }
    
    const startDate = new Date(selectedStart);
    if (isNaN(startDate.getTime())) {
      alert('Data selectată nu este validă.');
      return;
    }
    
    const durationMinutes = parseInt(formData.durationMinutes, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      alert('Durata programării nu este validă.');
      return;
    }
    
    const endTime = new Date(
      startDate.getTime() + durationMinutes * 60000
    ).toISOString();
    
    if (hasOverlap(selectedStart, endTime)) {
      triggerOverlapWarning('Programarea se suprapune cu alta existentă.');
      return;
    }

    const client = clients.find((c) => c.id === formData.clientId);
    const vehicle = vehicles.find((v) => v.id === formData.vehicleId);
    if (!client || !vehicle) return;

    const clientName =
      client.type === 'individual'
        ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
        : client.companyName || 'Client';

    const newInspection: Inspection = {
      id: `inspection-${Date.now()}`,
      stationId: stationToUse!.id,
      clientId: client.id,
      vehicleId: vehicle.id,
      scheduledDate: selectedStart,
      durationMinutes: parseInt(formData.durationMinutes, 10),
      periodMonths: parseInt(formData.periodMonths, 10) as 6 | 12 | 24,
      status: formData.status as Inspection['status'],
      clientName,
      vehicleLicensePlate: vehicle.licensePlate,
      stationName: stationToUse!.name,
    };

    const storedInspections = localStorage.getItem('inspections');
    const existing = storedInspections ? JSON.parse(storedInspections) : [];
    const updated = [...existing, newInspection];
    localStorage.setItem('inspections', JSON.stringify(updated));

    // Log activity
    logActivity(
      user?.email || 'unknown',
      user?.email || 'unknown',
      userRole || 'unknown',
      'schedule',
      'appointment',
      newInspection.id,
      `Programare ${vehicle.licensePlate}`,
      `Programare creată: ${vehicle.licensePlate} pentru ${clientName}`,
      stationToUse!.id,
      stationToUse!.name
    );

    setAppointments(updated.filter((i: Inspection) => i.stationId === selectedStation.id));
    setIsModalOpen(false);
  };

  const availableVehicles = vehicles.filter(
    (v) => v.clientId === formData.clientId
  );

  const filteredClients = clientSearch
    ? clients.filter((client) => {
        const name =
          client.type === 'individual'
            ? `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase()
            : (client.companyName || '').toLowerCase();
        const phone = (client.phone || '').toLowerCase();
        const query = clientSearch.toLowerCase();
        return name.includes(query) || phone.includes(query);
      })
    : clients;

  const handleAddClient = () => {
    if (!newClient.phone) return;
    if (newClient.type === 'individual' && (!newClient.firstName || !newClient.lastName)) return;
    if (newClient.type === 'fleet' && !newClient.companyName) return;

    // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
    let currentCompanyId = user?.companyId;
    if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
      currentCompanyId = selectedStation.companyId;
    }
    
    if (!currentCompanyId) {
      alert('Eroare: Nu s-a putut identifica compania. Te rugăm să reîmprospătezi pagina.');
      return;
    }
    
    const newClientEntry = {
      id: `client-${Date.now()}`,
      companyId: currentCompanyId,
      type: newClient.type,
      firstName: newClient.type === 'individual' ? newClient.firstName : undefined,
      lastName: newClient.type === 'individual' ? newClient.lastName : undefined,
      companyName: newClient.type === 'fleet' ? newClient.companyName : undefined,
      phone: newClient.phone,
      email: newClient.email || undefined,
      address: newClient.address || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const storedClients = localStorage.getItem('clients');
    const existingClients = storedClients ? JSON.parse(storedClients) : [];
    const updatedClients = [...existingClients, newClientEntry];
    localStorage.setItem('clients', JSON.stringify(updatedClients));
    
    // Log activity
    const clientName = newClientEntry.type === 'individual'
      ? `${newClientEntry.firstName || ''} ${newClientEntry.lastName || ''}`.trim()
      : newClientEntry.companyName || 'Client';
    
    logActivity(
      user?.email || 'unknown',
      user?.email || 'unknown',
      userRole || 'unknown',
      'create',
      'client',
      newClientEntry.id,
      clientName,
      `Client creat din calendar: ${clientName}`,
      selectedStation?.id,
      selectedStation?.name
    );
    
    setClients(updatedClients.filter((c: any) => c.companyId === user?.companyId));
    setFormData({ ...formData, clientId: newClientEntry.id, vehicleId: '' });
    setNewClient({ type: 'individual', firstName: '', lastName: '', companyName: '', phone: '' });
    setShowNewClientForm(false);
  };

  const handleAddVehicle = () => {
    if (!formData.clientId) return;
    if (!newVehicle.licensePlate || !newVehicle.make || !newVehicle.model) return;

    // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
    let currentCompanyId = user?.companyId;
    if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
      currentCompanyId = selectedStation.companyId;
    }
    
    if (!currentCompanyId) {
      alert('Eroare: Nu s-a putut identifica compania. Te rugăm să reîmprospătezi pagina.');
      return;
    }
    
    const newVehicleEntry = {
      id: `vehicle-${Date.now()}`,
      clientId: formData.clientId,
      companyId: currentCompanyId,
      licensePlate: newVehicle.licensePlate,
      make: newVehicle.make,
      model: newVehicle.model,
    };

    const storedVehicles = localStorage.getItem('vehicles');
    const existingVehicles = storedVehicles ? JSON.parse(storedVehicles) : [];
    const updatedVehicles = [...existingVehicles, newVehicleEntry];
    localStorage.setItem('vehicles', JSON.stringify(updatedVehicles));
    setVehicles(updatedVehicles.filter((v: any) => v.companyId === user?.companyId));
    setFormData({ ...formData, vehicleId: newVehicleEntry.id });
    setNewVehicle({ licensePlate: '', make: '', model: '' });
    setShowNewVehicleForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Calendar Programări
          </h1>
          {userRole !== 'manager' && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {selectedStation
                ? `Programări pentru ${selectedStation.name}`
                : 'Selectează o stație pentru a vedea programările'}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {userRole === 'manager' && (
            <select
              value={filterStationId}
              onChange={(e) => setFilterStationId(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">Toate stațiile</option>
              {stations
                .filter((s) => s.companyId === user?.companyId)
                .map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
            </select>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={userRole === 'manager' && filterStationId === 'all'}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={userRole === 'manager' && filterStationId === 'all' ? 'Selectează o stație pentru a crea programare' : ''}
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Programează ITP</span>
            <span className="sm:hidden">Programează</span>
          </button>
        </div>
      </div>

      {!selectedStation ? (
        <Card className="p-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Selectează o Stație
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Selectează o stație ITP din header pentru a vedea programările.
          </p>
        </Card>
      ) : (
        <Card className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            height="auto"
            events={calendarEvents}
            editable={true}
            selectable={true}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            nowIndicator={true}
            locales={[roLocale]}
            locale="ro"
            select={handleSelect}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
          />
        </Card>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsModalOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-4 sm:p-6 shadow-2xl dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Programare ITP
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {selectedStart
                ? `Start: ${formatDateTime(selectedStart)}`
                : 'Selectează intervalul în calendar'}
            </p>
            {overlapWarning && (
              <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {overlapWarning}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Client
                </label>
                <input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Caută după nume sau telefon"
                  className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <select
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clientId: e.target.value,
                      vehicleId: '',
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Selectează client</option>
                  {filteredClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.type === 'individual'
                        ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
                        : client.companyName || 'Client'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewClientForm(!showNewClientForm)}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  + Adaugă client nou
                </button>
                {showNewClientForm && (
                  <div className="mt-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                      Client nou
                    </div>
                    <select
                      value={newClient.type}
                      onChange={(e) =>
                        setNewClient({ ...newClient, type: e.target.value as 'individual' | 'fleet' })
                      }
                      className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="individual">Individual</option>
                      <option value="fleet">Flotă</option>
                    </select>
                    {newClient.type === 'individual' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Prenume"
                          value={newClient.firstName}
                          onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <input
                          placeholder="Nume"
                          value={newClient.lastName}
                          onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    ) : (
                      <input
                        placeholder="Nume companie"
                        value={newClient.companyName}
                        onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    )}
                    <input
                      placeholder="Telefon"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={handleAddClient}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Salvează client
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mașină
                </label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleId: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  disabled={!formData.clientId}
                >
                  <option value="">Selectează mașina</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} • {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewVehicleForm(!showNewVehicleForm)}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                  disabled={!formData.clientId}
                >
                  + Adaugă mașină nouă
                </button>
                {showNewVehicleForm && (
                  <div className="mt-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                      Mașină nouă
                    </div>
                    <input
                      placeholder="Număr înmatriculare"
                      value={newVehicle.licensePlate}
                      onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
                      className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Marca"
                        value={newVehicle.make}
                        onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                      <input
                        placeholder="Model"
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={handleAddVehicle}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Salvează mașină
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Perioadă ITP
                  </label>
                  <select
                    value={formData.periodMonths}
                    onChange={(e) =>
                      setFormData({ ...formData, periodMonths: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="6">6 luni</option>
                    <option value="12">12 luni</option>
                    <option value="24">24 luni</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Durată
                  </label>
                  <select
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="scheduled">Programat</option>
                  <option value="in_progress">În progres</option>
                  <option value="passed">Trecut</option>
                  <option value="failed">Eșuat</option>
                  <option value="cancelled">Anulat</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Anulează
              </button>
              <button
                onClick={handleCreateAppointment}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
