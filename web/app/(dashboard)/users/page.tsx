'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Users, Plus, Mail, Building2, User, Shield, XCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'manager' | 'engineer';
  companyId: string;
  companyName?: string;
  stationId?: string;
  stationName?: string;
  password?: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { user, stations, userRole } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'engineer' as 'manager' | 'engineer',
    stationId: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'engineer' as 'manager' | 'engineer',
    stationId: '',
    isActive: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      const parsedUsers = JSON.parse(storedUsers);
      // Adaugă numele stației pentru ingineri
      const usersWithStationNames = parsedUsers.map((u: UserData) => {
        if (u.stationId) {
          const station = stations.find((s) => s.id === u.stationId);
          return { ...u, stationName: station?.name };
        }
        return u;
      });
      setUsers(usersWithStationNames);
    } else {
      // Dacă nu există utilizatori, adaugă managerul curent
      if (user) {
        const managerUser: UserData = {
          id: user.email,
          email: user.email,
          name: user.companyName || 'Manager',
          role: 'manager',
          companyId: user.companyId,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        setUsers([managerUser]);
        localStorage.setItem('users', JSON.stringify([managerUser]));
      }
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.name || !formData.password) {
      alert('Te rugăm să completezi toate câmpurile');
      return;
    }

    if (formData.role === 'engineer' && !formData.stationId) {
      alert('Te rugăm să selectezi o stație pentru inginer');
      return;
    }

    const newUser: UserData = {
      id: `user-${Date.now()}`,
      email: formData.email,
      name: formData.name,
      role: formData.role,
      companyId: user?.companyId || '',
      companyName: user?.companyName || 'ITP Manager',
      stationId: formData.role === 'engineer' ? formData.stationId : undefined,
      stationName: formData.role === 'engineer' 
        ? stations.find((s) => s.id === formData.stationId)?.name 
        : undefined,
      password: formData.password,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Reset form
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'engineer',
      stationId: '',
    });
    setShowAddForm(false);
  };

  const toggleUserStatus = (userId: string) => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    );
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
  };

  const startEditUser = (userItem: UserData) => {
    setEditingUserId(userItem.id);
    setEditFormData({
      name: userItem.name,
      role: userItem.role,
      stationId: userItem.stationId || '',
      isActive: userItem.isActive,
    });
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
  };

  const saveEditUser = () => {
    if (!editingUserId) return;
    if (editFormData.role === 'engineer' && !editFormData.stationId) {
      alert('Te rugăm să selectezi o stație pentru inginer');
      return;
    }

    const updatedUsers = users.map((u) => {
      if (u.id !== editingUserId) return u;
      const stationName =
        editFormData.role === 'engineer'
          ? stations.find((s) => s.id === editFormData.stationId)?.name
          : undefined;

      return {
        ...u,
        name: editFormData.name,
        role: editFormData.role,
        stationId: editFormData.role === 'engineer' ? editFormData.stationId : undefined,
        stationName,
        isActive: editFormData.isActive,
      };
    });

    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setEditingUserId(null);
  };

  const isManager = user && users.find((u) => u.email === user.email)?.role === 'manager';

  if (userRole !== 'manager') {
    return (
      <Card className="p-12 text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Acces restricționat
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Doar managerii pot gestiona utilizatorii.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Utilizatori
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gestionează utilizatorii și inginerii stațiilor ITP
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Adaugă Utilizator
          </button>
        )}
      </div>

      {/* Formular adăugare utilizator */}
      {showAddForm && isManager && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Adaugă Utilizator Nou
          </h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nume Complet *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="Ion Popescu"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="ion.popescu@companie.ro"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Parolă *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rol *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'manager' | 'engineer', stationId: '' })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  required
                >
                  <option value="engineer">Inginer</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              {formData.role === 'engineer' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stație ITP *
                  </label>
                  <select
                    value={formData.stationId}
                    onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Selectează stația</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name} ({station.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                Adaugă Utilizator
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista utilizatori */}
      <div className="grid gap-4">
        {users.map((userItem) => (
          <Card key={userItem.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`rounded-lg p-3 ${
                  userItem.role === 'manager' 
                    ? 'bg-purple-100 dark:bg-purple-900/20' 
                    : 'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  {userItem.role === 'manager' ? (
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {userItem.name}
                    </h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      userItem.role === 'manager'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {userItem.role === 'manager' ? 'Manager' : 'Inginer'}
                    </span>
                    {userItem.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span>{userItem.email}</span>
                  </div>
                  {userItem.role === 'engineer' && userItem.stationName && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Building2 className="h-4 w-4" />
                      <span>{userItem.stationName}</span>
                    </div>
                  )}
                </div>
              </div>
              {isManager && userItem.id !== user?.email && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEditUser(userItem)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Editează
                  </button>
                  <button
                    onClick={() => toggleUserStatus(userItem.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      userItem.isActive
                        ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {userItem.isActive ? 'Dezactivează' : 'Activează'}
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Editează Utilizator
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nume
                </label>
                <input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rol
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      role: e.target.value as 'manager' | 'engineer',
                      stationId: '',
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="engineer">Inginer</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              {editFormData.role === 'engineer' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stație ITP
                  </label>
                  <select
                    value={editFormData.stationId}
                    onChange={(e) => setEditFormData({ ...editFormData, stationId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Selectează stația</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name} ({station.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  id="user-active"
                  type="checkbox"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                />
                <label htmlFor="user-active" className="text-sm text-gray-700 dark:text-gray-300">
                  Activ
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={cancelEditUser}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Anulează
              </button>
              <button
                onClick={saveEditUser}
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
