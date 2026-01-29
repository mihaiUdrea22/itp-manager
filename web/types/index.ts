// Tipuri principale pentru aplicația SaaS ITP

export type UserRole = 'manager' | 'engineer'; // Manager = proprietar organizație, Engineer = inginer pe stație

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  stationId?: string; // Pentru ingineri - stația la care lucrează
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  cui: string; // Cod Unic de Înregistrare
  address: string;
  phone: string;
  email: string;
  subscriptionPlan: 'basic' | 'professional' | 'enterprise';
  subscriptionStatus: 'active' | 'suspended' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Station {
  id: string;
  companyId: string;
  name: string;
  code: string; // Cod unic al stației
  address: string;
  phone: string;
  email: string;
  inspectorName: string; // Numele inspectorului autorizat
  inspectorLicense: string; // Număr licență inspector
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ClientType = 'individual' | 'fleet';

export interface Client {
  id: string;
  companyId: string; // Clienții sunt la nivel de companie (shared între toate stațiile)
  type: ClientType;
  // Pentru clienți individuali
  firstName?: string;
  lastName?: string;
  cnp?: string; // Cod Numeric Personal
  // Pentru flote auto
  companyName?: string;
  cui?: string;
  // Contact comun
  email?: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleType = 'car' | 'truck' | 'motorcycle' | 'bus' | 'trailer';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'cng';

export interface Vehicle {
  id: string;
  clientId: string;
  companyId: string; // Vehiculele sunt la nivel de companie (shared)
  licensePlate: string; // Număr înmatriculare
  vin: string; // Vehicle Identification Number
  make: string; // Marcă
  model: string;
  year: number;
  type: VehicleType;
  fuelType: FuelType;
  color?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type InspectionStatus = 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'cancelled';
export type InspectionResult = 'passed' | 'failed' | 'conditional';

export interface Inspection {
  id: string;
  stationId: string;
  vehicleId: string;
  clientId: string;
  inspectorId: string; // ID-ul utilizatorului care efectuează inspecția
  scheduledDate: Date;
  completedDate?: Date;
  status: InspectionStatus;
  result?: InspectionResult;
  nextInspectionDate?: Date; // Data următoarei inspecții (calculată automat)
  mileage?: number; // Kilometraj la momentul inspecției
  notes?: string;
  // Detalii inspecție
  emissionsTest?: boolean;
  emissionsResult?: 'passed' | 'failed';
  brakeTest?: boolean;
  brakeResult?: 'passed' | 'failed';
  lightsTest?: boolean;
  lightsResult?: 'passed' | 'failed';
  // Documente
  certificateNumber?: string;
  certificateFileUrl?: string;
  photos?: string[]; // URL-uri către fotografii
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  companyId: string;
  stationId?: string;
  userId?: string; // Pentru notificări personale
  type: 'inspection_due' | 'inspection_expired' | 'inspection_scheduled' | 'system';
  title: string;
  message: string;
  relatedEntityType?: 'inspection' | 'vehicle' | 'client';
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: Date;
}

// Statistici pentru dashboard
export interface DashboardStats {
  totalInspections: number;
  inspectionsThisMonth: number;
  inspectionsToday: number;
  upcomingInspections: number; // În următoarele 7 zile
  expiredInspections: number;
  passedRate: number; // Procentaj trecere
  totalClients: number;
  totalVehicles: number;
  revenueThisMonth: number;
}
