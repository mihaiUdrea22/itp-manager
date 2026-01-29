'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, User, Building2, ChevronDown, Plus, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { GlobalSearch } from '@/components/search/GlobalSearch';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, stations, selectedStation, setSelectedStation, userRole } = useAuth();
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 sm:gap-4 border-b border-gray-200 bg-white px-3 sm:px-6 dark:border-gray-800 dark:bg-gray-900">
      {/* Hamburger menu pentru mobile */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <div className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
        {/* Selector Stație ITP */}
        {stations.length > 0 && userRole === 'manager' && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsStationDropdownOpen(!isStationDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate max-w-[120px] md:max-w-none">
                {selectedStation?.name || 'Selectează Stație'}
              </span>
              <span className="sm:hidden">
                {selectedStation?.code || 'Stație'}
              </span>
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </button>

            {isStationDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="p-2">
                  {stations.map((station) => (
                    <button
                      key={station.id}
                      onClick={() => {
                        setSelectedStation(station);
                        setIsStationDropdownOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedStation?.id === station.id
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium">{station.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {station.code}
                      </div>
                    </button>
                  ))}
                  <Link
                    href="/stations"
                    className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                    onClick={() => setIsStationDropdownOpen(false)}
                  >
                    <Plus className="h-4 w-4" />
                    Adaugă Stație Nouă
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inginer - doar afișare stație */}
        {stations.length > 0 && userRole === 'engineer' && selectedStation && (
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate max-w-[100px] sm:max-w-none">{selectedStation.name}</span>
          </div>
        )}

        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button>
        <button className="flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
          <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="hidden sm:inline truncate max-w-[100px] md:max-w-none">{user?.email || 'Utilizator'}</span>
        </button>
      </div>
    </header>
  );
}
