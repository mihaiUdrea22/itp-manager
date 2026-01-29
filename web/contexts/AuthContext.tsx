'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  email: string;
  companyId: string;
  companyName: string;
  role: 'manager' | 'engineer';
  stationId?: string;
}

interface Station {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  inspectorName: string;
  inspectorLicense: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  userRole: 'manager' | 'engineer' | null;
  stations: Station[];
  selectedStation: Station | null;
  setSelectedStation: (station: Station | null) => void;
  setStationsForCompany: (stations: Station[]) => void;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'manager' | 'engineer' | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadAuthData = () => {
    try {
      const userData = localStorage.getItem('user');
      const stationsData = localStorage.getItem('stations');
      const selectedStationId = localStorage.getItem('selectedStationId');

      if (userData) {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);
        setUserRole(parsedUser.role);
      } else {
        setUser(null);
        setUserRole(null);
      }

      if (stationsData) {
        const parsedStations = JSON.parse(stationsData);
        const currentUser = userData ? (JSON.parse(userData) as User) : null;

        // Inginerii văd doar stația asignată
        if (currentUser?.role === 'engineer' && currentUser.stationId) {
          const assignedStation = parsedStations.find(
            (s: Station) => s.id === currentUser.stationId
          );
          const filteredStations = assignedStation ? [assignedStation] : [];
          setStations(filteredStations);
          setSelectedStation(assignedStation || null);
          if (assignedStation) {
            localStorage.setItem('selectedStationId', assignedStation.id);
          }
          return;
        }

        setStations(parsedStations);

        // Setează stația selectată
        if (selectedStationId) {
          const station = parsedStations.find(
            (s: Station) => s.id === selectedStationId
          );
          if (station) {
            setSelectedStation(station);
          } else if (parsedStations.length > 0) {
            // Dacă stația selectată nu există, selectează prima
            setSelectedStation(parsedStations[0]);
            localStorage.setItem('selectedStationId', parsedStations[0].id);
          }
        } else if (parsedStations.length > 0) {
          // Dacă nu există stație selectată, selectează prima
          setSelectedStation(parsedStations[0]);
          localStorage.setItem('selectedStationId', parsedStations[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Verifică autentificarea la mount
    loadAuthData();

    // Ascultă pentru schimbări în localStorage (pentru sincronizare între tab-uri)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'stations' || e.key === 'selectedStationId') {
        loadAuthData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sincronizează stațiile când se schimbă în localStorage (același tab)
  useEffect(() => {
    const handleStorageSync = () => {
      const stationsData = localStorage.getItem('stations');
      if (stationsData) {
        const parsedStations = JSON.parse(stationsData);
        const currentStationsStr = JSON.stringify(stations);
        const newStationsStr = JSON.stringify(parsedStations);
        if (currentStationsStr !== newStationsStr) {
          loadAuthData();
        }
      }
    };

    const interval = setInterval(handleStorageSync, 1000);
    return () => clearInterval(interval);
  }, [stations]);

  const handleSetSelectedStation = (station: Station | null) => {
    setSelectedStation(station);
    if (station) {
      localStorage.setItem('selectedStationId', station.id);
    } else {
      localStorage.removeItem('selectedStationId');
    }
  };

  const setStationsForCompany = (nextStations: Station[]) => {
    localStorage.setItem('stations', JSON.stringify(nextStations));
    setStations(nextStations);
    if (user?.role === 'engineer' && user.stationId) {
      const assigned = nextStations.find((s) => s.id === user.stationId) || null;
      setSelectedStation(assigned);
      if (assigned) {
        localStorage.setItem('selectedStationId', assigned.id);
      }
    }
  };

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.role === 'engineer' && userData.stationId) {
      localStorage.setItem('selectedStationId', userData.stationId);
    }
    loadAuthData();
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('selectedStationId');
    setUser(null);
    setUserRole(null);
    setSelectedStation(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        stations,
        selectedStation,
        setSelectedStation: handleSetSelectedStation,
        setStationsForCompany,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
