'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Car, Plus, Search, Filter, AlertTriangle, CheckCircle, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatDateTime } from '@/lib/utils';
import { getInspectionStatus } from '@/lib/utils';
import { VehicleHistoryModal } from '@/components/vehicles/VehicleHistoryModal';
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
  companyId: string;
  clientId: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  type: string;
  fuelType: string;
  nextInspectionDate?: string;
};

export default function VehiclesPage() {
  const { user, userRole, stations, selectedStation } = useAuth();
  const [filterStationId, setFilterStationId] = useState<string>('all');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    type: 'car',
    fuelType: 'petrol',
  });

  useEffect(() => {
    loadVehicles();
    loadClients();
  }, [user, filterStationId, userRole]);

  const loadVehicles = () => {
    const storedVehicles = localStorage.getItem('vehicles');
    const storedInspections = localStorage.getItem('inspections');
    
    if (storedVehicles) {
      const parsed = JSON.parse(storedVehicles) as Vehicle[];
      let filtered = user?.companyId
        ? parsed.filter((v) => v.companyId === user.companyId)
        : parsed;
      
      // Dacă managerul a selectat o stație specifică, filtrează mașinile care au inspecții la acea stație
      if (userRole === 'manager' && filterStationId !== 'all' && storedInspections) {
        const parsedInspections = JSON.parse(storedInspections);
        const stationVehicleIds = new Set(
          parsedInspections
            .filter((i: any) => i.stationId === filterStationId)
            .map((i: any) => i.vehicleId)
        );
        filtered = filtered.filter((v) => stationVehicleIds.has(v.id));
      }
      
      setVehicles(filtered);
    } else {
      setVehicles([]);
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

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.licensePlate || !formData.make || !formData.model || !formData.year) {
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

    const newVehicle: Vehicle = {
      id: `vehicle-${Date.now()}`,
      companyId: currentCompanyId,
      clientId: formData.clientId,
      licensePlate: formData.licensePlate,
      make: formData.make,
      model: formData.model,
      year: parseInt(formData.year, 10),
      type: formData.type,
      fuelType: formData.fuelType,
    };

    const stored = localStorage.getItem('vehicles');
    const existing = stored ? JSON.parse(stored) : [];
    const updated = [...existing, newVehicle];
    localStorage.setItem('vehicles', JSON.stringify(updated));
    
    // Log activity
    logActivity(
      user?.email || 'unknown',
      user?.email || 'unknown',
      userRole || 'unknown',
      'create',
      'vehicle',
      newVehicle.id,
      newVehicle.licensePlate,
      `Mașină creată: ${newVehicle.licensePlate}`,
      selectedStation?.id,
      selectedStation?.name
    );
    
    setVehicles(updated.filter((v: Vehicle) => v.companyId === user?.companyId));
    setShowAddForm(false);
    setFormData({
      clientId: '',
      licensePlate: '',
      make: '',
      model: '',
      year: '',
      type: 'car',
      fuelType: 'petrol',
    });
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Mașini
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {userRole === 'manager' && filterStationId !== 'all'
              ? `Mașini cu inspecții la ${stations.find(s => s.id === filterStationId)?.name || 'stație selectată'}`
              : 'Mașinile sunt comune pentru toate stațiile'}
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
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Adaugă Mașină
          </button>
        </div>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Adaugă Mașină Nouă
          </h2>
          <form onSubmit={handleAddVehicle} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Client *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Număr înmatriculare *
                </label>
                <input
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  An *
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Marcă *
                </label>
                <input
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Model *
                </label>
                <input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tip
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="car">Autoturism</option>
                  <option value="truck">Autocamion</option>
                  <option value="motorcycle">Motocicletă</option>
                  <option value="bus">Autobuz</option>
                  <option value="trailer">Remorcă</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Combustibil
                </label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="petrol">Benzină</option>
                  <option value="diesel">Diesel</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="electric">Electric</option>
                  <option value="lpg">LPG</option>
                  <option value="cng">CNG</option>
                </select>
              </div>
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
                Adaugă Mașină
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {vehicles.map((vehicle) => {
          const status = getInspectionStatus(vehicle.nextInspectionDate ? new Date(vehicle.nextInspectionDate) : undefined);
          const statusColors = {
            valid: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
            expiring_soon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
            expired: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
          };
          const statusIcons = {
            valid: CheckCircle,
            expiring_soon: AlertTriangle,
            expired: AlertTriangle,
          };
          const StatusIcon = statusIcons[status];
          const client = clients.find((c) => c.id === vehicle.clientId);
          const clientName =
            client?.type === 'individual'
              ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
              : client?.companyName || 'Client';

          return (
            <Card key={vehicle.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-900/20">
                    <Car className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {vehicle.licensePlate}
                      </h3>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status === 'valid' ? 'Valid' : status === 'expiring_soon' ? 'Expiră Curând' : 'Expirat'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Proprietar:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {clientName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Tip:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                          {vehicle.type}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Combustibil:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                          {vehicle.fuelType}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Următorul ITP:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {vehicle.nextInspectionDate
                            ? formatDate(vehicle.nextInspectionDate)
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <History className="h-4 w-4" />
                    Istoric ITP
                  </button>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Programează ITP
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Istoric ITP */}
      {selectedVehicleId && selectedVehicle && (
        <VehicleHistoryModal
          vehicleId={selectedVehicleId}
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicleId(null)}
        />
      )}
    </div>
  );
}
