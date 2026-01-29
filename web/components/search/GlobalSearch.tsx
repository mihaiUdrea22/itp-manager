'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, User, Car, FileCheck, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type SearchResult = {
  type: 'client' | 'vehicle' | 'inspection';
  id: string;
  title: string;
  subtitle: string;
  metadata?: string;
  url: string;
};

type SearchFilters = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  stationId?: string;
};

export function GlobalSearch() {
  const { user, userRole, stations, selectedStation } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Încarcă istoricul căutărilor
    const stored = localStorage.getItem('searchHistory');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      performSearch(query, filters);
    } else {
      setResults([]);
    }
  }, [query, filters, user, userRole, stations, selectedStation]);

  const performSearch = (searchQuery: string, searchFilters: SearchFilters) => {
    const queryLower = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Obține companyId - pentru ingineri, îl luăm din stația asignată dacă nu e setat direct
    let currentCompanyId = user?.companyId;
    if (!currentCompanyId && userRole === 'engineer' && selectedStation) {
      currentCompanyId = selectedStation.companyId;
    }
    
    // Căutare clienți
    const storedClients = localStorage.getItem('clients');
    if (storedClients) {
      const clients = JSON.parse(storedClients);
      // Filtrează doar clienții companiei curente (și exclude pe cei fără companyId)
      const companyClients = clients.filter((c: any) => c.companyId && currentCompanyId && c.companyId === currentCompanyId);
      
      companyClients.forEach((client: any) => {
        const name = client.type === 'individual'
          ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
          : client.companyName || '';
        const phone = (client.phone || '').toLowerCase();
        const cnp = (client.cnp || '').toLowerCase();
        const cui = (client.cui || '').toLowerCase();
        const email = (client.email || '').toLowerCase();
        
        if (
          name.toLowerCase().includes(queryLower) ||
          phone.includes(queryLower) ||
          cnp.includes(queryLower) ||
          cui.includes(queryLower) ||
          email.includes(queryLower)
        ) {
          results.push({
            type: 'client',
            id: client.id,
            title: name || 'Client fără nume',
            subtitle: client.type === 'individual' 
              ? `CNP: ${client.cnp || 'N/A'} • Tel: ${client.phone || 'N/A'}`
              : `CUI: ${client.cui || 'N/A'} • Tel: ${client.phone || 'N/A'}`,
            metadata: client.type,
            url: `/clients`,
          });
        }
      });
    }

    // Căutare mașini
    const storedVehicles = localStorage.getItem('vehicles');
    if (storedVehicles) {
      const vehicles = JSON.parse(storedVehicles);
      const companyVehicles = vehicles.filter((v: any) => v.companyId && currentCompanyId && v.companyId === currentCompanyId);
      
      companyVehicles.forEach((vehicle: any) => {
        const licensePlate = (vehicle.licensePlate || '').toLowerCase();
        const make = (vehicle.make || '').toLowerCase();
        const model = (vehicle.model || '').toLowerCase();
        
        if (
          licensePlate.includes(queryLower) ||
          make.includes(queryLower) ||
          model.includes(queryLower) ||
          `${make} ${model}`.includes(queryLower)
        ) {
          results.push({
            type: 'vehicle',
            id: vehicle.id,
            title: vehicle.licensePlate || 'Fără număr',
            subtitle: `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.year || 'N/A'})`,
            metadata: vehicle.clientId,
            url: `/vehicles`,
          });
        }
      });
    }

    // Căutare inspecții
    const storedInspections = localStorage.getItem('inspections');
    if (storedInspections) {
      const inspections = JSON.parse(storedInspections);
      
      // Filtrare după companie și stație
      let filteredInspections = inspections;
      if (userRole === 'manager' && user?.companyId) {
        const companyStationIds = stations
          .filter((s) => s.companyId === user.companyId)
          .map((s) => s.id);
        filteredInspections = inspections.filter((i: any) => 
          companyStationIds.includes(i.stationId)
        );
      } else if (userRole === 'engineer' && selectedStation) {
        filteredInspections = inspections.filter((i: any) => 
          i.stationId === selectedStation.id
        );
      }

      // Aplică filtre
      if (searchFilters.status) {
        filteredInspections = filteredInspections.filter((i: any) => 
          i.status === searchFilters.status
        );
      }
      if (searchFilters.stationId) {
        filteredInspections = filteredInspections.filter((i: any) => 
          i.stationId === searchFilters.stationId
        );
      }
      if (searchFilters.dateFrom || searchFilters.dateTo) {
        filteredInspections = filteredInspections.filter((i: any) => {
          const date = new Date(i.scheduledDate || i.completedDate || '');
          if (searchFilters.dateFrom) {
            const fromDate = new Date(searchFilters.dateFrom);
            if (date < fromDate) return false;
          }
          if (searchFilters.dateTo) {
            const toDate = new Date(searchFilters.dateTo);
            toDate.setHours(23, 59, 59);
            if (date > toDate) return false;
          }
          return true;
        });
      }

      filteredInspections.forEach((inspection: any) => {
        const vehiclePlate = (inspection.vehicleLicensePlate || '').toLowerCase();
        const clientName = (inspection.clientName || '').toLowerCase();
        
        if (
          vehiclePlate.includes(queryLower) ||
          clientName.includes(queryLower) ||
          inspection.id.toLowerCase().includes(queryLower)
        ) {
          results.push({
            type: 'inspection',
            id: inspection.id,
            title: inspection.vehicleLicensePlate || 'Fără număr',
            subtitle: `${inspection.clientName || 'Client'} • ${inspection.status || 'N/A'}`,
            metadata: inspection.stationId,
            url: `/inspections`,
          });
        }
      });
    }

    // Limitează la 10 rezultate
    setResults(results.slice(0, 10));
  };

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim().length >= 2) {
      // Salvează în istoric
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      
      performSearch(searchQuery, filters);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Salvează căutarea în istoric
    if (query.trim().length >= 2) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('searchHistory', JSON.stringify(updated));
    }
    
    setIsOpen(false);
    router.push(result.url);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <User className="h-4 w-4" />;
      case 'vehicle':
        return <Car className="h-4 w-4" />;
      case 'inspection':
        return <FileCheck className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'text-purple-600 dark:text-purple-400';
      case 'vehicle':
        return 'text-orange-600 dark:text-orange-400';
      case 'inspection':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="relative flex-1 max-w-2xl min-w-0" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-2 sm:left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          onFocus={() => {
            if (query.trim().length >= 2 || recentSearches.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Caută clienți, mașini, ITP-uri..."
          className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-8 sm:pl-10 pr-16 sm:pr-20 text-xs sm:text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-900"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>

      {/* Dropdown cu rezultate */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {/* Filtre */}
          {showFilters && (
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filtre</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  Ascunde
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Dată de la
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Dată până la
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="">Toate</option>
                    <option value="scheduled">Programat</option>
                    <option value="in_progress">În progres</option>
                    <option value="passed">Trecut</option>
                    <option value="failed">Eșuat</option>
                    <option value="cancelled">Anulat</option>
                  </select>
                </div>
                {userRole === 'manager' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Stație
                    </label>
                    <select
                      value={filters.stationId || ''}
                      onChange={(e) => setFilters({ ...filters, stationId: e.target.value || undefined })}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                    >
                      <option value="">Toate</option>
                      {stations
                        .filter((s) => s.companyId === user?.companyId)
                        .map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setFilters({});
                  if (query.trim().length >= 2) {
                    performSearch(query, {});
                  }
                }}
                className="mt-3 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Șterge filtrele
              </button>
            </div>
          )}

          {/* Rezultate sau istoric */}
          <div className="max-h-96 overflow-y-auto">
            {results.length > 0 ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {results.length} rezultat{results.length !== 1 ? 'e' : ''}
                  </span>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {showFilters ? 'Ascunde filtre' : 'Filtre avansate'}
                  </button>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${getResultColor(result.type)}`}>
                          {getResultIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {result.title}
                            </p>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              {result.type === 'client' ? 'Client' : result.type === 'vehicle' ? 'Mașină' : 'ITP'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {result.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : query.trim().length >= 2 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nu s-au găsit rezultate pentru "{query}"
                </p>
              </div>
            ) : recentSearches.length > 0 ? (
              <>
                <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Căutări recente
                  </span>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{search}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
