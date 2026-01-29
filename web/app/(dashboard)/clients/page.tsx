'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Users, Plus, Building2, User, Phone, Mail, Car } from 'lucide-react';
import { ClientType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLog';

export default function ClientsPage() {
  const { user, selectedStation, userRole, stations } = useAuth();
  const [filterStationId, setFilterStationId] = useState<string>('all');
  const [clients, setClients] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'individual' as ClientType,
    firstName: '',
    lastName: '',
    cnp: '',
    companyName: '',
    cui: '',
    phone: '',
    email: '',
    address: '',
  });
  const [vehiclesDraft, setVehiclesDraft] = useState([
    { licensePlate: '', make: '', model: '', year: '', type: 'car', fuelType: 'petrol' },
  ]);

  useEffect(() => {
    loadClients();
  }, [filterStationId, user, userRole]);

  const loadClients = () => {
    const storedClients = localStorage.getItem('clients');
    const storedInspections = localStorage.getItem('inspections');
    
    if (storedClients) {
      const parsedClients = JSON.parse(storedClients);
      
      // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
      let currentCompanyId = user?.companyId;
      if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
        currentCompanyId = selectedStation.companyId;
      }
      
      // Filtrează doar clienții companiei curente (și exclude pe cei fără companyId)
      let companyClients = parsedClients.filter(
        (c: any) => c.companyId && currentCompanyId && c.companyId === currentCompanyId
      );
      
      // Dacă managerul a selectat o stație specifică, filtrează clienții care au inspecții la acea stație
      if (userRole === 'manager' && filterStationId !== 'all' && storedInspections) {
        const parsedInspections = JSON.parse(storedInspections);
        const stationClientIds = new Set(
          parsedInspections
            .filter((i: any) => i.stationId === filterStationId)
            .map((i: any) => i.clientId)
        );
        companyClients = companyClients.filter((c: any) => stationClientIds.has(c.id));
      }
      
      // Adaugă numărul de mașini pentru fiecare client
      const clientsWithVehicles = companyClients.map((client: any) => {
        const vehicles = getVehiclesForClient(client.id);
        return { ...client, vehiclesCount: vehicles.length };
      });
      setClients(clientsWithVehicles);
    }
  };

  const getVehiclesForClient = (clientId: string) => {
    const storedVehicles = localStorage.getItem('vehicles');
    if (storedVehicles) {
      const parsedVehicles = JSON.parse(storedVehicles);
      return parsedVehicles.filter((v: any) => v.clientId === clientId);
    }
    return [];
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone) {
      alert('Te rugăm să completezi cel puțin numărul de telefon');
      return;
    }

    if (formData.type === 'individual' && (!formData.firstName || !formData.lastName)) {
      alert('Te rugăm să completezi numele complet');
      return;
    }

    if (formData.type === 'fleet' && !formData.companyName) {
      alert('Te rugăm să completezi numele companiei');
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
    
    const newClient = {
      id: `client-${Date.now()}`,
      companyId: currentCompanyId,
      type: formData.type,
      firstName: formData.type === 'individual' ? formData.firstName : undefined,
      lastName: formData.type === 'individual' ? formData.lastName : undefined,
      cnp: formData.type === 'individual' ? formData.cnp : undefined,
      companyName: formData.type === 'fleet' ? formData.companyName : undefined,
      cui: formData.type === 'fleet' ? formData.cui : undefined,
      phone: formData.phone,
      email: formData.email || undefined,
      address: formData.address || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const storedClients = localStorage.getItem('clients');
    const existingClients = storedClients ? JSON.parse(storedClients) : [];
    const updatedClients = [...existingClients, newClient];
    localStorage.setItem('clients', JSON.stringify(updatedClients));

    // Salvează mașinile adăugate (dacă există)
    const validVehicles = vehiclesDraft.filter(
      (v) => v.licensePlate && v.make && v.model && v.year
    );
    if (validVehicles.length > 0) {
      const storedVehicles = localStorage.getItem('vehicles');
      const existingVehicles = storedVehicles ? JSON.parse(storedVehicles) : [];
        const newVehicles = validVehicles.map((v) => ({
        id: `vehicle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        companyId: currentCompanyId,
        clientId: newClient.id,
        licensePlate: v.licensePlate,
        make: v.make,
        model: v.model,
        year: parseInt(v.year, 10),
        type: v.type,
        fuelType: v.fuelType,
      }));
      localStorage.setItem('vehicles', JSON.stringify([...existingVehicles, ...newVehicles]));
      
      // Log activity pentru mașini
      newVehicles.forEach((vehicle) => {
        logActivity(
          user?.email || 'unknown',
          user?.email || 'unknown',
          userRole || 'unknown',
          'create',
          'vehicle',
          vehicle.id,
          vehicle.licensePlate,
          `Mașină creată: ${vehicle.licensePlate}`,
          selectedStation?.id,
          selectedStation?.name
        );
      });
    }

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
      `Client creat: ${clientName}`,
      selectedStation?.id,
      selectedStation?.name
    );

    // Reset form
    setFormData({
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
    setVehiclesDraft([{ licensePlate: '', make: '', model: '', year: '', type: 'car', fuelType: 'petrol' }]);
    setShowAddForm(false);
    loadClients();
  };

  const addVehicleRow = () => {
    setVehiclesDraft((prev) => [
      ...prev,
      { licensePlate: '', make: '', model: '', year: '', type: 'car', fuelType: 'petrol' },
    ]);
  };

  const removeVehicleRow = (index: number) => {
    setVehiclesDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVehicleRow = (index: number, field: string, value: string) => {
    setVehiclesDraft((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Clienți
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Clienții sunt comuni pentru toate stațiile ITP
          </p>
        </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Adaugă Client
          </button>
      </div>

      {/* Formular adăugare client */}
      {showAddForm && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Adaugă Client Nou
          </h2>
          <form onSubmit={handleAddClient} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tip Client *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ClientType })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="individual">Client Individual</option>
                <option value="fleet">Flotă Auto</option>
              </select>
            </div>

            {formData.type === 'individual' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Prenume *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nume *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    CNP
                  </label>
                  <input
                    type="text"
                    value={formData.cnp}
                    onChange={(e) => setFormData({ ...formData, cnp: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nume Companie *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    CUI
                  </label>
                  <input
                    type="text"
                    value={formData.cui}
                    onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefon *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Adresă
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Mașini (opțional) */}
            <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Adaugă mașini pentru client (opțional)
                </h3>
                <button
                  type="button"
                  onClick={addVehicleRow}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  + Adaugă mașină
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {vehiclesDraft.map((vehicle, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        placeholder="Număr înmatriculare"
                        value={vehicle.licensePlate}
                        onChange={(e) => updateVehicleRow(index, 'licensePlate', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <input
                        placeholder="An"
                        type="number"
                        value={vehicle.year}
                        onChange={(e) => updateVehicleRow(index, 'year', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <input
                        placeholder="Marcă"
                        value={vehicle.make}
                        onChange={(e) => updateVehicleRow(index, 'make', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <input
                        placeholder="Model"
                        value={vehicle.model}
                        onChange={(e) => updateVehicleRow(index, 'model', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <select
                        value={vehicle.type}
                        onChange={(e) => updateVehicleRow(index, 'type', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        <option value="car">Autoturism</option>
                        <option value="truck">Autocamion</option>
                        <option value="motorcycle">Motocicletă</option>
                        <option value="bus">Autobuz</option>
                        <option value="trailer">Remorcă</option>
                      </select>
                      <select
                        value={vehicle.fuelType}
                        onChange={(e) => updateVehicleRow(index, 'fuelType', e.target.value)}
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
                    {vehiclesDraft.length > 1 && (
                      <div className="mt-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeVehicleRow(index)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Șterge mașina
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Adaugă Client
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Filtre */}
      <div className="flex items-center gap-4">
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Toți
        </button>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <User className="mr-2 inline h-4 w-4" />
          Individuali
        </button>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <Building2 className="mr-2 inline h-4 w-4" />
          Flote Auto
        </button>
      </div>

      {/* Lista clienți */}
      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Nu există clienți
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Adaugă primul client pentru a începe.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
          <Card key={client.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/20">
                  {client.type === 'individual' ? (
                    <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {client.type === 'individual'
                        ? `${client.firstName} ${client.lastName}`
                        : client.companyName}
                    </h3>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      {client.type === 'individual' ? 'Individual' : 'Flotă Auto'}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="col-span-2 flex items-center gap-2">
                        <span>{client.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Car className="h-4 w-4" />
                      <span>{client.vehiclesCount} mașin{client.vehiclesCount !== 1 ? 'i' : 'ă'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Detalii
                </button>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Editează
                </button>
              </div>
            </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
