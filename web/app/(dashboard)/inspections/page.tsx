'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { FileCheck, Plus, Search, Filter, CheckCircle, XCircle, Clock, Calendar, X } from 'lucide-react';
import { InspectionStatus, InspectionResult } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLog';

type Client = {
  id: string;
  type: 'individual' | 'fleet';
  firstName?: string;
  lastName?: string;
  companyName?: string;
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
  vehicleId: string;
  clientId: string;
  scheduledDate: string;
  status: InspectionStatus;
  result?: InspectionResult;
  completedDate?: string;
  nextInspectionDate?: string;
  periodMonths: 6 | 12 | 24;
  vehicleLicensePlate: string;
  clientName: string;
  stationName: string;
};

export default function InspectionsPage() {
  const { selectedStation, user, userRole, stations } = useAuth();
  const [filterStationId, setFilterStationId] = useState<string>('all'); // 'all' sau ID-ul stației
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddNowForm, setShowAddNowForm] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    vehicleId: '',
    scheduledDate: '',
    timeSlot: '', // Format: "HH:MM" (ex: "09:00")
    periodMonths: '12',
  });
  const [nowFormData, setNowFormData] = useState({
    clientId: '',
    vehicleId: '',
    periodMonths: '12',
    result: 'passed' as InspectionResult,
  });
  
  // State pentru adăugare client nou în formularul "Adaugă ITP Acum"
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    type: 'individual' as 'individual' | 'fleet',
    firstName: '',
    lastName: '',
    cnp: '',
    companyName: '',
    cui: '',
    phone: '',
    email: '',
    address: '',
  });
  const [newVehicleData, setNewVehicleData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    type: 'car',
    fuelType: 'petrol',
  });

  // State pentru modalul de detalii
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadInspections();
    loadClients();
    loadVehicles();
  }, [selectedStation, user, userRole, stations, filterStationId]);

  const loadInspections = () => {
    const storedInspections = localStorage.getItem('inspections');
    if (!storedInspections) {
      setInspections([]);
      return;
    }

    const parsedInspections = JSON.parse(storedInspections);
    
    // Managerii pot alege să vadă toate stațiile sau o stație specifică
    // Inginerii văd doar inspecțiile de la stația lor asignată
    if (userRole === 'manager' && user?.companyId) {
      const companyStationIds = stations
        .filter((s) => s.companyId === user.companyId)
        .map((s) => s.id);
      
      let filteredInspections;
      if (filterStationId === 'all') {
        // Toate inspecțiile de la toate stațiile
        filteredInspections = parsedInspections.filter((i: any) => 
          companyStationIds.includes(i.stationId)
        );
      } else {
        // Doar inspecțiile de la stația selectată
        filteredInspections = parsedInspections.filter(
          (i: any) => i.stationId === filterStationId && companyStationIds.includes(i.stationId)
        );
      }
      setInspections(filteredInspections);
    } else if (userRole === 'engineer' && selectedStation) {
      // Inginerii văd doar inspecțiile de la stația lor
      const stationInspections = parsedInspections.filter(
        (i: any) => i.stationId === selectedStation.id
      );
      setInspections(stationInspections);
    } else {
      setInspections([]);
    }
  };

  const loadClients = () => {
    const storedClients = localStorage.getItem('clients');
    if (storedClients) {
      const parsed = JSON.parse(storedClients) as Client[];
      
      // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
      let currentCompanyId = user?.companyId;
      if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
        currentCompanyId = selectedStation.companyId;
      }
      
      // Filtrează doar clienții companiei curente (și exclude pe cei fără companyId)
      const filtered = currentCompanyId
        ? parsed.filter((c: any) => c.companyId && c.companyId === currentCompanyId)
        : [];
      setClients(filtered);
    } else {
      setClients([]);
    }
  };

  const loadVehicles = () => {
    const storedVehicles = localStorage.getItem('vehicles');
    if (storedVehicles) {
      const parsed = JSON.parse(storedVehicles) as Vehicle[];
      // Filtrează doar mașinile companiei curente (și exclude pe cele fără companyId)
      const filtered = user?.companyId
        ? parsed.filter((v: any) => v.companyId && v.companyId === user.companyId)
        : [];
      setVehicles(filtered);
    } else {
      setVehicles([]);
    }
  };

  const handleAddInspection = (e: React.FormEvent) => {
    e.preventDefault();
    // Pentru manageri, folosim stația selectată în formular sau filterStationId
    // Pentru ingineri, folosim stația lor asignată
    let stationToUse = selectedStation;
    
    if (userRole === 'manager') {
      // Managerii trebuie să selecteze o stație specifică (nu "all")
      if (filterStationId === 'all') {
        alert('Te rugăm să selectezi o stație specifică pentru a crea inspecția.');
        return;
      }
      stationToUse = stations.find(s => s.id === filterStationId) || null;
      if (!stationToUse) {
        alert('Stația selectată nu este validă.');
        return;
      }
    } else if (!selectedStation) {
      alert('Te rugăm să selectezi o stație pentru a crea inspecția.');
      return;
    }
    if (!formData.clientId || !formData.vehicleId || !formData.scheduledDate) return;

    const client = clients.find((c) => c.id === formData.clientId);
    const vehicle = vehicles.find((v) => v.id === formData.vehicleId);
    if (!client || !vehicle) return;

    // Verifică dacă data este validă pentru programare (după expirare - 30 zile)
    const dateValidation = isDateValidForScheduling(vehicle.id, formData.scheduledDate);
    if (!dateValidation.valid) {
      alert(dateValidation.message);
      return;
    }

    const clientName =
      client.type === 'individual'
        ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
        : client.companyName || 'Client';

    // Combine date and time slot
    if (!formData.timeSlot) {
      alert('Te rugăm să selectezi un slot orar disponibil.');
      return;
    }

    const scheduledDateTime = `${formData.scheduledDate}T${formData.timeSlot}:00`;

    const newInspection: Inspection = {
      id: `inspection-${Date.now()}`,
      stationId: stationToUse!.id,
      vehicleId: vehicle.id,
      clientId: client.id,
      scheduledDate: new Date(scheduledDateTime).toISOString(),
      status: 'scheduled',
      periodMonths: parseInt(formData.periodMonths, 10) as 6 | 12 | 24,
      vehicleLicensePlate: vehicle.licensePlate,
      clientName,
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
      'inspection',
      newInspection.id,
      `ITP ${vehicle.licensePlate}`,
      `ITP programat: ${vehicle.licensePlate} pentru ${clientName}`,
      stationToUse!.id,
      stationToUse!.name
    );
    
    // Reîncarcă toate inspecțiile (pentru manageri) sau doar cele de la stația selectată (pentru ingineri)
    loadInspections();

    setFormData({ clientId: '', vehicleId: '', scheduledDate: '', timeSlot: '', periodMonths: '12' });
    setShowAddForm(false);
  };

  // Generează toate sloturile disponibile pentru o zi (9:00-19:00, 45 min fiecare)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    let hour = 9;
    let minute = 0;
    
    // Generează sloturi până la 18:15 (ultimul slot valid: 18:15-19:00)
    while (hour < 18 || (hour === 18 && minute <= 15)) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotEnd = new Date(`2000-01-01T${timeStr}:00`);
      slotEnd.setMinutes(slotEnd.getMinutes() + 45);
      
      // Verifică dacă slotul se termină înainte sau la 19:00
      if (slotEnd.getHours() <= 19 && (slotEnd.getHours() < 19 || slotEnd.getMinutes() === 0)) {
        slots.push(timeStr);
      }
      
      minute += 45;
      if (minute >= 60) {
        hour += 1;
        minute -= 60;
      }
    }
    
    return slots;
  };

  // Verifică dacă un slot este disponibil pentru o dată și stație specifică
  const isSlotAvailable = (date: string, timeSlot: string, stationId: string): boolean => {
    if (!date || !timeSlot) return false;
    
    const slotStart = new Date(`${date}T${timeSlot}:00`);
    const slotEnd = new Date(slotStart.getTime() + 45 * 60000); // 45 minute
    
    // Verifică dacă data este în weekend (duminică = 0, sâmbătă = 6)
    const dayOfWeek = slotStart.getDay();
    if (dayOfWeek === 0) return false; // Duminică
    
    // Verifică suprapunerea cu programările existente
    const storedInspections = localStorage.getItem('inspections');
    if (!storedInspections) return true;
    
    const allInspections = JSON.parse(storedInspections) as Inspection[];
    const stationInspections = allInspections.filter(
      (i) => i.stationId === stationId && i.status === 'scheduled'
    );
    
    for (const inspection of stationInspections) {
      if (!inspection.scheduledDate) continue;
      
      const inspectionStart = new Date(inspection.scheduledDate);
      const inspectionEnd = new Date(inspectionStart.getTime() + 45 * 60000);
      
      // Verifică suprapunerea
      if (
        (slotStart >= inspectionStart && slotStart < inspectionEnd) ||
        (slotEnd > inspectionStart && slotEnd <= inspectionEnd) ||
        (slotStart <= inspectionStart && slotEnd >= inspectionEnd)
      ) {
        return false; // Slot ocupat
      }
    }
    
    return true; // Slot disponibil
  };

  // Obține sloturile disponibile pentru o dată selectată
  const getAvailableSlots = (date: string): string[] => {
    if (!date) return [];
    
    // Pentru manageri, folosim stația selectată în filter
    // Pentru ingineri, folosim stația lor asignată
    let stationToUse = selectedStation;
    
    if (userRole === 'manager') {
      if (filterStationId === 'all') return [];
      stationToUse = stations.find(s => s.id === filterStationId) || null;
    }
    
    if (!stationToUse) return [];
    
    const allSlots = generateTimeSlots();
    return allSlots.filter((slot) => isSlotAvailable(date, slot, stationToUse!.id));
  };

  // Verifică dacă o mașină are ITP valabil și returnează data de expirare
  const getValidInspectionExpiration = (vehicleId: string): Date | null => {
    const storedInspections = localStorage.getItem('inspections');
    if (!storedInspections) return null;
    
    const allInspections = JSON.parse(storedInspections) as Inspection[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Găsește toate inspecțiile pentru această mașină
    const vehicleInspections = allInspections.filter((i) => i.vehicleId === vehicleId);
    
    // Verifică dacă există un ITP valabil
    for (const inspection of vehicleInspections) {
      // ITP trecut (passed) - verifică nextInspectionDate
      if (inspection.status === 'passed' && inspection.nextInspectionDate) {
        const nextDate = new Date(inspection.nextInspectionDate);
        nextDate.setHours(0, 0, 0, 0);
        if (nextDate >= today) {
          return nextDate; // Returnează data de expirare
        }
      }
      
      // ITP programat (scheduled) - verifică expirationDate sau scheduledDate + periodMonths
      if (inspection.status === 'scheduled' && inspection.scheduledDate) {
        const scheduledDate = new Date(inspection.scheduledDate);
        const expirationDate = new Date(scheduledDate);
        expirationDate.setMonth(expirationDate.getMonth() + (inspection.periodMonths || 12));
        expirationDate.setHours(0, 0, 0, 0);
        if (expirationDate >= today) {
          return expirationDate; // Returnează data de expirare
        }
      }
    }
    
    return null; // Nu există ITP valabil
  };

  // Verifică dacă o mașină are ITP valabil
  const hasValidInspection = (vehicleId: string): boolean => {
    return getValidInspectionExpiration(vehicleId) !== null;
  };

  // Verifică dacă o dată este în intervalul permis pentru programare (după expirare - 30 zile)
  const isDateValidForScheduling = (vehicleId: string, selectedDate: string): { valid: boolean; message?: string } => {
    const expirationDate = getValidInspectionExpiration(vehicleId);
    
    if (!expirationDate) {
      return { valid: true }; // Nu există ITP valabil, se poate programa oricând
    }
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    // Calculează data minimă (expirare - 30 zile)
    const minDate = new Date(expirationDate);
    minDate.setDate(minDate.getDate() - 30);
    minDate.setHours(0, 0, 0, 0);
    
    // Data maximă este data de expirare
    const maxDate = new Date(expirationDate);
    maxDate.setHours(0, 0, 0, 0);
    
    if (selected < minDate) {
      return {
        valid: false,
        message: `Nu poți programa un ITP înainte de ${formatDate(minDate.toISOString())}. ITP-ul actual expiră la ${formatDate(expirationDate.toISOString())}.`
      };
    }
    
    if (selected > maxDate) {
      return {
        valid: false,
        message: `Nu poți programa un ITP după data de expirare (${formatDate(expirationDate.toISOString())}).`
      };
    }
    
    return { valid: true };
  };

  // Handler pentru vizualizarea detaliilor
  const handleViewDetails = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowDetailsModal(true);
  };

  // Handler pentru începerea inspecției
  const handleStartInspection = (inspection: Inspection) => {
    const storedInspections = localStorage.getItem('inspections');
    if (!storedInspections) return;
    
    const allInspections = JSON.parse(storedInspections) as Inspection[];
    const updated = allInspections.map((i) => 
      i.id === inspection.id ? { ...i, status: 'in_progress' as InspectionStatus } : i
    );
    localStorage.setItem('inspections', JSON.stringify(updated));
    
    // Log activity
    logActivity(
      user?.email || 'unknown',
      user?.email || 'unknown',
      userRole || 'unknown',
      'update',
      'inspection',
      inspection.id,
      `ITP ${inspection.vehicleLicensePlate}`,
      `ITP început: ${inspection.vehicleLicensePlate}`,
      inspection.stationId,
      inspection.stationName
    );
    
    loadInspections();
  };

  const handleAddInspectionNow = (e: React.FormEvent) => {
    e.preventDefault();
    // Pentru manageri, folosim stația selectată în filter
    // Pentru ingineri, folosim stația lor asignată
    let stationToUse = selectedStation;
    
    if (userRole === 'manager') {
      // Managerii trebuie să selecteze o stație specifică (nu "all")
      if (filterStationId === 'all') {
        alert('Te rugăm să selectezi o stație specifică pentru a crea inspecția.');
        return;
      }
      stationToUse = stations.find(s => s.id === filterStationId) || null;
      if (!stationToUse) {
        alert('Stația selectată nu este validă.');
        return;
      }
    } else if (!selectedStation) {
      alert('Te rugăm să selectezi o stație pentru a crea inspecția.');
      return;
    }
    if (!nowFormData.clientId || !nowFormData.vehicleId) return;

    const client = clients.find((c) => c.id === nowFormData.clientId);
    const vehicle = vehicles.find((v) => v.id === nowFormData.vehicleId);
    if (!client || !vehicle) return;

    // Verifică dacă mașina are ITP valabil
    if (hasValidInspection(vehicle.id)) {
      alert('Această mașină are deja un ITP valabil. Te rugăm să programezi un ITP nou în loc să adaugi unul direct.');
      return;
    }

    const clientName =
      client.type === 'individual'
        ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
        : client.companyName || 'Client';

    const now = new Date();
    const completedDate = now.toISOString();
    
    // Calculate next inspection date based on period
    const nextInspectionDate = new Date(now);
    nextInspectionDate.setMonth(nextInspectionDate.getMonth() + parseInt(nowFormData.periodMonths, 10));

    const newInspection: Inspection = {
      id: `inspection-${Date.now()}`,
      stationId: stationToUse!.id,
      vehicleId: vehicle.id,
      clientId: client.id,
      scheduledDate: completedDate,
      completedDate: completedDate,
      status: nowFormData.result === 'passed' ? 'passed' : 'failed',
      result: nowFormData.result,
      periodMonths: parseInt(nowFormData.periodMonths, 10) as 6 | 12 | 24,
      nextInspectionDate: nextInspectionDate.toISOString(),
      vehicleLicensePlate: vehicle.licensePlate,
      clientName,
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
      'complete',
      'inspection',
      newInspection.id,
      `ITP ${vehicle.licensePlate}`,
      `ITP ${nowFormData.result === 'passed' ? 'trecut' : 'eșuat'}: ${vehicle.licensePlate}`,
      stationToUse!.id,
      stationToUse!.name
    );
    
    // Reîncarcă toate inspecțiile (pentru manageri) sau doar cele de la stația selectată (pentru ingineri)
    loadInspections();

    setNowFormData({ clientId: '', vehicleId: '', periodMonths: '12', result: 'passed' });
    setShowAddNowForm(false);
  };

  const handleAddNewClientAndVehicle = () => {
    // Validare
    if (!newClientData.phone) {
      alert('Te rugăm să completezi cel puțin numărul de telefon');
      return;
    }

    if (newClientData.type === 'individual' && (!newClientData.firstName || !newClientData.lastName)) {
      alert('Te rugăm să completezi numele complet');
      return;
    }

    if (newClientData.type === 'fleet' && !newClientData.companyName) {
      alert('Te rugăm să completezi numele companiei');
      return;
    }

    if (!newVehicleData.licensePlate || !newVehicleData.make || !newVehicleData.model || !newVehicleData.year) {
      alert('Te rugăm să completezi toate câmpurile pentru mașină');
      return;
    }

    // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
    let currentCompanyId = user?.companyId;
    if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
      currentCompanyId = selectedStation.companyId;
    }
    
    if (!currentCompanyId) {
      alert('Eroare: Nu s-a putut identifica compania. Te rugăm să reîmprospătezi pagina.');
      return;
    }

    // Creează clientul
    const newClient = {
      id: `client-${Date.now()}`,
      companyId: currentCompanyId,
      type: newClientData.type,
      firstName: newClientData.type === 'individual' ? newClientData.firstName : undefined,
      lastName: newClientData.type === 'individual' ? newClientData.lastName : undefined,
      cnp: newClientData.type === 'individual' ? newClientData.cnp : undefined,
      companyName: newClientData.type === 'fleet' ? newClientData.companyName : undefined,
      cui: newClientData.type === 'fleet' ? newClientData.cui : undefined,
      phone: newClientData.phone,
      email: newClientData.email || undefined,
      address: newClientData.address || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Creează mașina
    const newVehicle = {
      id: `vehicle-${Date.now()}`,
      companyId: currentCompanyId,
      clientId: newClient.id,
      licensePlate: newVehicleData.licensePlate,
      make: newVehicleData.make,
      model: newVehicleData.model,
      year: parseInt(newVehicleData.year, 10),
      type: newVehicleData.type,
      fuelType: newVehicleData.fuelType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Salvează clientul
    const storedClients = localStorage.getItem('clients');
    const existingClients = storedClients ? JSON.parse(storedClients) : [];
    const updatedClients = [...existingClients, newClient];
    localStorage.setItem('clients', JSON.stringify(updatedClients));

    // Salvează mașina
    const storedVehicles = localStorage.getItem('vehicles');
    const existingVehicles = storedVehicles ? JSON.parse(storedVehicles) : [];
    const updatedVehicles = [...existingVehicles, newVehicle];
    localStorage.setItem('vehicles', JSON.stringify(updatedVehicles));

    // Log activity pentru client
    const clientName = newClient.type === 'individual'
      ? `${newClient.firstName || ''} ${newClient.lastName || ''}`.trim()
      : newClient.companyName || 'Client';
    
    logActivity(
      user?.email || 'unknown',
      user?.email || 'unknown',
      userRole || 'unknown',
      'create',
      'client',
      newClient.id,
      clientName,
      `Client creat din ITP: ${clientName}`,
      selectedStation?.id,
      selectedStation?.name
    );

    // Log activity pentru mașină
    logActivity(
      user?.email || 'unknown',
      user?.email || 'unknown',
      userRole || 'unknown',
      'create',
      'vehicle',
      newVehicle.id,
      newVehicle.licensePlate,
      `Mașină creată din ITP: ${newVehicle.licensePlate}`,
      selectedStation?.id,
      selectedStation?.name
    );

    // Reîncarcă datele
    loadClients();
    loadVehicles();

    // Setează clientul și mașina în formular
    setNowFormData({
      ...nowFormData,
      clientId: newClient.id,
      vehicleId: newVehicle.id,
    });

    // Reset formularul de adăugare
    setNewClientData({
      type: 'individual',
      firstName: '',
      lastName: '',
      cnp: '',
      companyName: '',
      cui: '',
      phone: '',
      email: '',
      address: '',
    });
    setNewVehicleData({
      licensePlate: '',
      make: '',
      model: '',
      year: '',
      type: 'car',
      fuelType: 'petrol',
    });
    setShowNewClientForm(false);
  };

  const availableVehicles = vehicles.filter((v) => v.clientId === formData.clientId);

  const displayedInspections = inspections;

  const getStatusBadge = (status: InspectionStatus, result?: InspectionResult) => {
    if (status === 'passed' || result === 'passed') {
      return (
        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          Trecut
        </span>
      );
    }
    if (status === 'failed' || result === 'failed') {
      return (
        <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          Eșuat
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <Clock className="h-3 w-3" />
          În Progres
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Calendar className="h-3 w-3" />
        Programat
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Inspecții ITP
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {userRole === 'manager'
              ? filterStationId === 'all'
                ? `Toate inspecțiile pentru toate stațiile (${stations.length} stații)`
                : `Inspecții pentru ${stations.find(s => s.id === filterStationId)?.name || 'stație selectată'}`
              : selectedStation
              ? `Inspecții pentru ${selectedStation.name}`
              : 'Selectează o stație pentru a vedea inspecțiile'}
          </p>
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
            onClick={() => {
              setShowAddNowForm(false);
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Programează ITP</span>
            <span className="sm:hidden">Programează</span>
          </button>
          <button
            onClick={() => {
              setShowAddForm(false);
              setShowAddNowForm(!showAddNowForm);
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-green-700"
          >
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Adaugă ITP Acum</span>
            <span className="sm:hidden">Adaugă Acum</span>
          </button>
        </div>
      </div>

      {showAddForm && (userRole === 'manager' ? filterStationId !== 'all' : selectedStation) && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Programează ITP
          </h2>
          <form onSubmit={handleAddInspection} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Client
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value, vehicleId: '' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                required
              >
                <option value="">Selectează client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.type === 'individual'
                      ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
                      : client.companyName || 'Client'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mașină
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                required
                disabled={!formData.clientId}
              >
                <option value="">Selectează mașina</option>
                {availableVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.licensePlate} • {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dată
                </label>
                <div 
                  className="relative cursor-pointer"
                  onClick={() => {
                    const dateInput = document.getElementById('hidden-date-input-inspections') as HTMLInputElement;
                    if (dateInput) {
                      dateInput.focus();
                      if (dateInput.showPicker) {
                        dateInput.showPicker();
                      } else {
                        dateInput.click();
                      }
                    }
                  }}
                >
                  <input
                    type="text"
                    readOnly
                    value={formData.scheduledDate ? formatDate(formData.scheduledDate) : ''}
                    placeholder="Selectează data"
                    className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white pointer-events-none"
                    required
                  />
                  <input
                    id="hidden-date-input-inspections"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => {
                      setFormData({ ...formData, scheduledDate: e.target.value, timeSlot: '' });
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="absolute left-0 top-0 cursor-pointer w-full h-full opacity-0"
                    style={{ 
                      zIndex: 10,
                      padding: 0,
                      margin: 0,
                      border: 'none',
                      background: 'transparent'
                    }}
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ zIndex: 0 }} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Slot Orar Disponibil (45 min)
                </label>
                <select
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  required
                  disabled={!formData.scheduledDate}
                >
                  <option value="">Selectează slot orar</option>
                  {formData.scheduledDate && getAvailableSlots(formData.scheduledDate).length === 0 && (
                    <option value="" disabled>
                      Nu sunt sloturi disponibile pentru această dată
                    </option>
                  )}
                  {formData.scheduledDate && getAvailableSlots(formData.scheduledDate).map((slot) => {
                    const [hours, minutes] = slot.split(':');
                    const slotStart = new Date(`${formData.scheduledDate}T${slot}:00`);
                    const slotEnd = new Date(slotStart.getTime() + 45 * 60000);
                    const endTime = `${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`;
                    return (
                      <option key={slot} value={slot}>
                        {slot} - {endTime}
                      </option>
                    );
                  })}
                </select>
                {formData.scheduledDate && getAvailableSlots(formData.scheduledDate).length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {getAvailableSlots(formData.scheduledDate).length} sloturi disponibile
                  </p>
                )}
                {formData.scheduledDate && getAvailableSlots(formData.scheduledDate).length === 0 && (
                  <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                    Nu sunt sloturi disponibile pentru această dată. Program: Luni-Sâmbătă, 9:00-19:00
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Perioadă
              </label>
              <select
                value={formData.periodMonths}
                onChange={(e) => setFormData({ ...formData, periodMonths: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="6">6 luni</option>
                <option value="12">12 luni</option>
                <option value="24">24 luni</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Programează
              </button>
            </div>
          </form>
        </Card>
      )}

      {showAddNowForm && (userRole === 'manager' ? filterStationId !== 'all' : selectedStation) && (
        <Card className="p-6 border-2 border-green-200 dark:border-green-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Adaugă ITP Acum (Fără Programare)
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Folosește acest formular când un client vine fără programare și vrei să înregistrezi ITP-ul direct.
          </p>
          {!showNewClientForm ? (
            <form onSubmit={handleAddInspectionNow} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Client
                </label>
                <div className="flex gap-2">
                  <select
                    value={nowFormData.clientId}
                    onChange={(e) => setNowFormData({ ...nowFormData, clientId: e.target.value, vehicleId: '' })}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Selectează client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.type === 'individual'
                          ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
                          : client.companyName || 'Client'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewClientForm(true)}
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    + Client Nou
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mașină
                </label>
                <select
                  value={nowFormData.vehicleId}
                  onChange={(e) => setNowFormData({ ...nowFormData, vehicleId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  required
                  disabled={!nowFormData.clientId}
                >
                  <option value="">Selectează mașina</option>
                  {vehicles
                    .filter((v) => v.clientId === nowFormData.clientId)
                    .map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.licensePlate} • {vehicle.make} {vehicle.model}
                        {hasValidInspection(vehicle.id) ? ' (ITP Valabil)' : ''}
                      </option>
                    ))}
                </select>
                {nowFormData.vehicleId && hasValidInspection(nowFormData.vehicleId) && (
                  <div className="mt-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                    <p className="font-medium">⚠️ Această mașină are deja un ITP valabil.</p>
                    <p className="mt-1">Nu poți adăuga un ITP nou direct. Te rugăm să folosești formularul de programare pentru a programa un ITP nou.</p>
                  </div>
                )}
              </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Perioadă
                </label>
                <select
                  value={nowFormData.periodMonths}
                  onChange={(e) => setNowFormData({ ...nowFormData, periodMonths: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="6">6 luni</option>
                  <option value="12">12 luni</option>
                  <option value="24">24 luni</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rezultat
                </label>
                <select
                  value={nowFormData.result}
                  onChange={(e) => setNowFormData({ ...nowFormData, result: e.target.value as InspectionResult })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="passed">Trecut</option>
                  <option value="failed">Eșuat</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddNowForm(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={nowFormData.vehicleId && hasValidInspection(nowFormData.vehicleId)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Adaugă ITP
              </button>
            </div>
          </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                  Adaugă Client și Mașină Nouă
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClientForm(false);
                    setNewClientData({
                      type: 'individual',
                      firstName: '',
                      lastName: '',
                      cnp: '',
                      companyName: '',
                      cui: '',
                      phone: '',
                      email: '',
                      address: '',
                    });
                    setNewVehicleData({
                      licensePlate: '',
                      make: '',
                      model: '',
                      year: '',
                      type: 'car',
                      fuelType: 'petrol',
                    });
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Înapoi
                </button>
              </div>

              {/* Formular Client */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Date Client
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Tip Client *
                    </label>
                    <select
                      value={newClientData.type}
                      onChange={(e) => setNewClientData({ ...newClientData, type: e.target.value as 'individual' | 'fleet' })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="individual">Individual</option>
                      <option value="fleet">Flotă Auto</option>
                    </select>
                  </div>

                  {newClientData.type === 'individual' ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Prenume *
                          </label>
                          <input
                            type="text"
                            value={newClientData.firstName}
                            onChange={(e) => setNewClientData({ ...newClientData, firstName: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Nume *
                          </label>
                          <input
                            type="text"
                            value={newClientData.lastName}
                            onChange={(e) => setNewClientData({ ...newClientData, lastName: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          CNP
                        </label>
                        <input
                          type="text"
                          value={newClientData.cnp}
                          onChange={(e) => setNewClientData({ ...newClientData, cnp: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Nume Companie *
                        </label>
                        <input
                          type="text"
                          value={newClientData.companyName}
                          onChange={(e) => setNewClientData({ ...newClientData, companyName: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          CUI
                        </label>
                        <input
                          type="text"
                          value={newClientData.cui}
                          onChange={(e) => setNewClientData({ ...newClientData, cui: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Telefon *
                      </label>
                      <input
                        type="tel"
                        value={newClientData.phone}
                        onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newClientData.email}
                        onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Adresă
                    </label>
                    <input
                      type="text"
                      value={newClientData.address}
                      onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Formular Mașină */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Date Mașină
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Număr înmatriculare *
                    </label>
                    <input
                      type="text"
                      value={newVehicleData.licensePlate}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, licensePlate: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Marcă *
                    </label>
                    <input
                      type="text"
                      value={newVehicleData.make}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, make: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={newVehicleData.model}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, model: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      An *
                    </label>
                    <input
                      type="number"
                      value={newVehicleData.year}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, year: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      required
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Tip
                    </label>
                    <select
                      value={newVehicleData.type}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, type: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="car">Autoturism</option>
                      <option value="truck">Autoutilitară</option>
                      <option value="motorcycle">Motocicletă</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Combustibil
                    </label>
                    <select
                      value={newVehicleData.fuelType}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, fuelType: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="petrol">Benzină</option>
                      <option value="diesel">Motorină</option>
                      <option value="hybrid">Hibrid</option>
                      <option value="electric">Electric</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClientForm(false);
                    setNewClientData({
                      type: 'individual',
                      firstName: '',
                      lastName: '',
                      cnp: '',
                      companyName: '',
                      cui: '',
                      phone: '',
                      email: '',
                      address: '',
                    });
                    setNewVehicleData({
                      licensePlate: '',
                      make: '',
                      model: '',
                      year: '',
                      type: 'car',
                      fuelType: 'petrol',
                    });
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  onClick={handleAddNewClientAndVehicle}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Adaugă Client și Mașină
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Căutare și filtre */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Caută după număr înmatriculare, client..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <Filter className="h-4 w-4" />
          Filtre
        </button>
      </div>

      {/* Statistici rapide */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Programate</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">12</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">În Progres</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">3</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Trecute</div>
          <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">89</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Eșuate</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">12</div>
        </Card>
      </div>

      {userRole === 'engineer' && !selectedStation ? (
        <Card className="p-12 text-center">
          <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Selectează o Stație
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Selectează o stație ITP din header pentru a vedea inspecțiile.
          </p>
        </Card>
      ) : (
        <>
          {/* Lista inspecții */}
          <div className="grid gap-4">
            {displayedInspections.map((inspection) => (
          <Card key={inspection.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
                  <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {inspection.vehicleLicensePlate}
                    </h3>
                    {getStatusBadge(inspection.status, inspection.result)}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {inspection.clientName}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Stație:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {inspection.stationName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {inspection.status === 'scheduled' || inspection.status === 'in_progress'
                          ? 'Programat pentru:'
                          : 'Efectuat la:'}
                      </span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatDateTime(
                          inspection.completedDate || inspection.scheduledDate
                        )}
                      </span>
                    </div>
                    {inspection.nextInspectionDate && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Următorul ITP:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {formatDate(inspection.nextInspectionDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleViewDetails(inspection)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Detalii
                </button>
                {inspection.status === 'scheduled' && (
                  <button 
                    onClick={() => handleStartInspection(inspection)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Începe Inspecția
                  </button>
                )}
              </div>
            </div>
          </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal pentru detalii inspecție */}
      {showDetailsModal && selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detalii Inspecție ITP
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedInspection(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Număr înmatriculare</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedInspection.vehicleLicensePlate}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Client</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedInspection.clientName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stație</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedInspection.stationName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedInspection.status, selectedInspection.result)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {selectedInspection.status === 'scheduled' ? 'Programat pentru' : 'Efectuat la'}
                  </p>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {formatDateTime(selectedInspection.completedDate || selectedInspection.scheduledDate)}
                  </p>
                </div>
                {selectedInspection.nextInspectionDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Următorul ITP</p>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {formatDate(selectedInspection.nextInspectionDate)}
                    </p>
                  </div>
                )}
                {selectedInspection.periodMonths && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Perioadă</p>
                    <p className="mt-1 text-gray-900 dark:text-white">{selectedInspection.periodMonths} luni</p>
                  </div>
                )}
                {selectedInspection.result && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rezultat</p>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {selectedInspection.result === 'passed' ? 'Trecut' : selectedInspection.result === 'failed' ? 'Eșuat' : 'Condiționat'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-800">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedInspection(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
