'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Building2, Plus, MapPin, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Station } from '@/types';

export default function StationsPage() {
  const { stations, user, userRole, setStationsForCompany } = useAuth();
  const [localStations, setLocalStations] = useState<Station[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    inspectorName: '',
    inspectorLicense: '',
  });

  useEffect(() => {
    // Încarcă stațiile din localStorage
    const storedStations = localStorage.getItem('stations');
    if (storedStations) {
      setLocalStations(JSON.parse(storedStations));
    }
  }, [stations]);

  const handleAddStation = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.code ||
      !formData.address ||
      !formData.inspectorName ||
      !formData.inspectorLicense
    ) {
      alert('Te rugăm să completezi toate câmpurile obligatorii');
      return;
    }

    const newStation: Station = {
      id: `station-${Date.now()}`,
      companyId: user?.companyId || '',
      name: formData.name,
      code: formData.code,
      address: formData.address,
      phone: formData.phone || '',
      email: formData.email || '',
      inspectorName: formData.inspectorName,
      inspectorLicense: formData.inspectorLicense,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedStations = [...localStations, newStation];
    setLocalStations(updatedStations);
    setStationsForCompany(updatedStations);

    // Reset form
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      inspectorName: '',
      inspectorLicense: '',
    });
    setShowAddForm(false);
  };

  const displayedStationsRaw = localStations.length > 0 ? localStations : stations;
  const displayedStations =
    userRole === 'engineer' && user?.stationId
      ? displayedStationsRaw.filter((s) => s.id === user.stationId)
      : displayedStationsRaw;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Stații ITP
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gestionează stațiile ITP ale companiei
          </p>
        </div>
        {userRole === 'manager' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Adaugă Stație
          </button>
        )}
      </div>

      {/* Formular adăugare stație */}
      {showAddForm && userRole === 'manager' && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Adaugă Stație ITP Nouă
          </h2>
          <form onSubmit={handleAddStation} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nume Stație *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="Stația ITP Nord"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cod Stație *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="ITP-002"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Adresă *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="București, Str. Exemplu nr. 45"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="021-234-5678"
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
                  placeholder="station@companie.ro"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nume Inspector Autorizat *
                </label>
                <input
                  type="text"
                  value={formData.inspectorName}
                  onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="Ion Popescu"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Număr Licență Inspector *
                </label>
                <input
                  type="text"
                  value={formData.inspectorLicense}
                  onChange={(e) => setFormData({ ...formData, inspectorLicense: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="INS-2023-002"
                  required
                />
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
                Adaugă Stație
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista stații */}
      {displayedStations.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Nu există stații ITP
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Adaugă prima ta stație ITP pentru a începe.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedStations.map((station) => (
            <Card key={station.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {station.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {station.code}
                    </p>
                  </div>
                </div>
                {station.isActive ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{station.address}</span>
                </div>
                {station.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4" />
                    <span>{station.phone}</span>
                  </div>
                )}
                {station.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span>{station.email}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Inspector: {station.inspectorName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Licență: {station.inspectorLicense}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/stations/${station.id}`}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Detalii
                </Link>
                <button className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Editează
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
