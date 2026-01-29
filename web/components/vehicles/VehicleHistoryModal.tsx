'use client';

import { useEffect, useState } from 'react';
import { X, FileCheck, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type Vehicle = {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  clientId: string;
};

type Client = {
  id: string;
  type: 'individual' | 'fleet';
  firstName?: string;
  lastName?: string;
  companyName?: string;
};

type Inspection = {
  id: string;
  vehicleId: string;
  clientId: string;
  stationId: string;
  scheduledDate?: string;
  completedDate?: string;
  status: string;
  result?: string;
  periodMonths?: number;
  nextInspectionDate?: string;
  durationMinutes?: number;
  clientName?: string;
  vehicleLicensePlate?: string;
  stationName?: string;
};

interface VehicleHistoryModalProps {
  vehicleId: string | null;
  vehicle: Vehicle | null;
  onClose: () => void;
}

export function VehicleHistoryModal({ vehicleId, vehicle, onClose }: VehicleHistoryModalProps) {
  const { stations } = useAuth();
  const [vehicleHistory, setVehicleHistory] = useState<Inspection[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    if (vehicleId) {
      loadVehicleHistory();
      loadClients();
    }
  }, [vehicleId]);

  const loadVehicleHistory = () => {
    if (!vehicleId) return;
    
    const storedInspections = localStorage.getItem('inspections');
    if (storedInspections) {
      const allInspections = JSON.parse(storedInspections);
      const vehicleInspections = allInspections
        .filter((i: Inspection) => i.vehicleId === vehicleId)
        .sort((a: Inspection, b: Inspection) => {
          // Sortează după dată (cel mai recent primul)
          const dateA = new Date(a.completedDate || a.scheduledDate || 0).getTime();
          const dateB = new Date(b.completedDate || b.scheduledDate || 0).getTime();
          return dateB - dateA;
        });
      setVehicleHistory(vehicleInspections);
    }
  };

  const loadClients = () => {
    const storedClients = localStorage.getItem('clients');
    if (storedClients) {
      const parsed = JSON.parse(storedClients) as Client[];
      setClients(parsed);
    }
  };

  const getStatusBadge = (status: string, result?: string) => {
    if (status === 'passed' || result === 'passed') {
      return (
        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
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

  if (!vehicleId || !vehicle) return null;

  const vehicleClient = clients.find(c => c.id === vehicle.clientId);
  const clientName = vehicleClient
    ? vehicleClient.type === 'individual'
      ? `${vehicleClient.firstName || ''} ${vehicleClient.lastName || ''}`.trim()
      : vehicleClient.companyName || 'Client'
    : 'Client necunoscut';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl dark:bg-gray-900 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6 dark:border-gray-800">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
              Istoric ITP - {vehicle.licensePlate}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
              {vehicle.make} {vehicle.model} ({vehicle.year}) • {clientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {vehicleHistory.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Nu există ITP-uri înregistrate
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Această mașină nu are încă ITP-uri în sistem.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {/* Linie verticală */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                
                {vehicleHistory.map((inspection, index) => {
                  const inspectionDate = inspection.completedDate || inspection.scheduledDate;
                  const station = stations.find(s => s.id === inspection.stationId);
                  
                  return (
                    <div key={inspection.id} className="relative flex gap-4 pb-6">
                      {/* Bullet point */}
                      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                        <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      
                      {/* Conținut */}
                      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusBadge(inspection.status, inspection.result)}
                              {station && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Stație: {station.name}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {inspection.completedDate 
                                    ? `Finalizat: ${formatDateTime(inspection.completedDate)}`
                                    : inspection.scheduledDate
                                    ? `Programat: ${formatDateTime(inspection.scheduledDate)}`
                                    : 'Dată necunoscută'}
                                </span>
                              </div>
                              
                              {inspection.clientName && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Client: <span className="font-medium text-gray-900 dark:text-white">{inspection.clientName}</span>
                                  </span>
                                </div>
                              )}
                              
                              {inspection.periodMonths && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Perioadă: <span className="font-medium text-gray-900 dark:text-white">{inspection.periodMonths} luni</span>
                                  </span>
                                </div>
                              )}
                              
                              {inspection.nextInspectionDate && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Următorul ITP: <span className="font-medium text-gray-900 dark:text-white">{formatDate(inspection.nextInspectionDate)}</span>
                                  </span>
                                </div>
                              )}
                              
                              {inspection.durationMinutes && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Durată: {inspection.durationMinutes} minute
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-4 text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              #{vehicleHistory.length - index}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Total: {vehicleHistory.length} ITP{vehicleHistory.length !== 1 ? '-uri' : ''}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Închide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
