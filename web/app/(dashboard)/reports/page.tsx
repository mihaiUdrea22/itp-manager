'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear, eachYearOfInterval } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Charts } from '@/components/dashboard/Charts';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type Inspection = {
  id: string;
  stationId: string;
  clientId: string;
  vehicleId: string;
  scheduledDate?: string;
  completedDate?: string;
  status: string;
  periodMonths?: number;
};

export default function ReportsPage() {
  const { user, userRole, stations, selectedStation } = useAuth();
  const [reportType, setReportType] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    format(new Date(), 'yyyy-MM')
  );
  const [allInspections, setAllInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('inspections');
    if (stored) {
      const parsed = JSON.parse(stored) as Inspection[];
      
      if (userRole === 'manager' && user?.companyId) {
        const companyStationIds = stations
          .filter((s) => s.companyId === user.companyId)
          .map((s) => s.id);
        setAllInspections(parsed.filter((i) => companyStationIds.includes(i.stationId)));
      } else if (userRole === 'engineer' && selectedStation) {
        setAllInspections(parsed.filter((i) => i.stationId === selectedStation.id));
      } else {
        setAllInspections(parsed);
      }
    }
  }, [user, userRole, stations, selectedStation]);

  const inspections = useMemo(() => {
    return allInspections;
  }, [allInspections]);

  const reportData = useMemo(() => {
    if (reportType === 'monthly') {
      const [year, month] = selectedPeriod.split('-').map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = endOfMonth(periodStart);

      const periodInspections = inspections.filter((i) => {
        const inspectionDate = new Date(i.completedDate || i.scheduledDate || '');
        return inspectionDate >= periodStart && inspectionDate <= periodEnd;
      });

      // Date pe zile
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dayStart = new Date(year, month - 1, day);
        const dayEnd = new Date(year, month - 1, day, 23, 59, 59);
        const dayInspections = periodInspections.filter((i) => {
          const inspectionDate = new Date(i.completedDate || i.scheduledDate || '');
          return inspectionDate >= dayStart && inspectionDate <= dayEnd;
        });
        return {
          name: `${day}`,
          completed: dayInspections.filter((i) => i.status === 'passed').length,
          failed: dayInspections.filter((i) => i.status === 'failed').length,
          scheduled: dayInspections.filter((i) => i.status === 'scheduled').length,
        };
      });

      // Date pe stații
      const stationData = stations
        .filter((s) => s.companyId === user?.companyId)
        .map((station) => {
          const stationInspections = periodInspections.filter(
            (i) => i.stationId === station.id
          );
          return {
            name: station.name,
            total: stationInspections.length,
            passed: stationInspections.filter((i) => i.status === 'passed').length,
            failed: stationInspections.filter((i) => i.status === 'failed').length,
          };
        })
        .filter((s) => s.total > 0);

      // Date pe status
      const statusData = [
        {
          name: 'Trecute',
          value: periodInspections.filter((i) => i.status === 'passed').length,
        },
        {
          name: 'Eșuate',
          value: periodInspections.filter((i) => i.status === 'failed').length,
        },
        {
          name: 'Programate',
          value: periodInspections.filter((i) => i.status === 'scheduled').length,
        },
        {
          name: 'În Progres',
          value: periodInspections.filter((i) => i.status === 'in_progress').length,
        },
      ].filter((s) => s.value > 0);

      return { dailyData, stationData, statusData, periodInspections };
    } else {
      const year = parseInt(selectedPeriod);
      const periodStart = startOfYear(new Date(year, 0, 1));
      const periodEnd = endOfYear(new Date(year, 0, 1));

      const periodInspections = inspections.filter((i) => {
        const inspectionDate = new Date(i.completedDate || i.scheduledDate || '');
        return inspectionDate >= periodStart && inspectionDate <= periodEnd;
      });

      // Date pe luni
      const months = eachMonthOfInterval({ start: periodStart, end: periodEnd });
      const monthlyData = months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthInspections = periodInspections.filter((i) => {
          const inspectionDate = new Date(i.completedDate || i.scheduledDate || '');
          return inspectionDate >= monthStart && inspectionDate <= monthEnd;
        });
        return {
          name: format(month, 'MMM', { locale: ro }),
          completed: monthInspections.filter((i) => i.status === 'passed').length,
          failed: monthInspections.filter((i) => i.status === 'failed').length,
          scheduled: monthInspections.filter((i) => i.status === 'scheduled').length,
        };
      });

      // Date pe stații
      const stationData = stations
        .filter((s) => s.companyId === user?.companyId)
        .map((station) => {
          const stationInspections = periodInspections.filter(
            (i) => i.stationId === station.id
          );
          return {
            name: station.name,
            total: stationInspections.length,
            passed: stationInspections.filter((i) => i.status === 'passed').length,
            failed: stationInspections.filter((i) => i.status === 'failed').length,
          };
        })
        .filter((s) => s.total > 0);

      // Date pe status
      const statusData = [
        {
          name: 'Trecute',
          value: periodInspections.filter((i) => i.status === 'passed').length,
        },
        {
          name: 'Eșuate',
          value: periodInspections.filter((i) => i.status === 'failed').length,
        },
        {
          name: 'Programate',
          value: periodInspections.filter((i) => i.status === 'scheduled').length,
        },
        {
          name: 'În Progres',
          value: periodInspections.filter((i) => i.status === 'in_progress').length,
        },
      ].filter((s) => s.value > 0);

      return { monthlyData, stationData, statusData, periodInspections };
    }
  }, [reportType, selectedPeriod, inspections, stations, user?.companyId]);

  const handleExport = () => {
    // Simulare export (în producție ar genera un PDF sau Excel)
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `raport-${reportType}-${selectedPeriod}.json`;
    link.click();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Rapoarte Periodice
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Rapoarte lunare și anuale cu analize detaliate
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as 'monthly' | 'annual');
              if (e.target.value === 'annual') {
                setSelectedPeriod(currentYear.toString());
              } else {
                setSelectedPeriod(format(new Date(), 'yyyy-MM'));
              }
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="monthly">Raport Lunar</option>
            <option value="annual">Raport Anual</option>
          </select>
          {reportType === 'monthly' ? (
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
          ) : (
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportă Raport</span>
            <span className="sm:hidden">Exportă</span>
          </button>
        </div>
      </div>

      {/* Statistici generale */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                Total ITP-uri
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {reportData.periodInspections.length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                Trecute
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-green-600">
                {reportData.statusData.find((s) => s.name === 'Trecute')?.value || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                Eșuate
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-red-600">
                {reportData.statusData.find((s) => s.name === 'Eșuate')?.value || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                Rata Succes
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {reportData.periodInspections.length > 0
                  ? Math.round(
                      ((reportData.statusData.find((s) => s.name === 'Trecute')?.value || 0) /
                        reportData.periodInspections.length) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Grafice și Analize Generale */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Grafice și Analize
        </h2>
        <Charts
          inspectionsByMonth={chartData.inspectionsByMonth}
          inspectionsByStation={chartData.inspectionsByStation}
          inspectionsByStatus={chartData.inspectionsByStatus}
          trendData={chartData.trendData}
        />
      </div>

      {/* Grafice pentru Perioada Selectată */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Raport {reportType === 'monthly' ? 'Lunar' : 'Anual'} - {selectedPeriod}
        </h2>
      </div>

      {/* Grafice și Analize Generale */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Grafice și Analize
        </h2>
        <Charts
          inspectionsByMonth={chartData.inspectionsByMonth}
          inspectionsByStation={chartData.inspectionsByStation}
          inspectionsByStatus={chartData.inspectionsByStatus}
          trendData={chartData.trendData}
        />
      </div>

      {/* Grafice pentru Perioada Selectată */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Raport {reportType === 'monthly' ? 'Lunar' : 'Anual'} - {selectedPeriod}
        </h2>
      </div>

      {/* Grafice */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grafic evoluție */}
        <Card className="p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Evoluție {reportType === 'monthly' ? 'Zilnică' : 'Lunară'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={reportType === 'monthly' ? reportData.dailyData : reportData.monthlyData}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                name="Trecute"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#ef4444"
                strokeWidth={2}
                name="Eșuate"
              />
              <Line
                type="monotone"
                dataKey="scheduled"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Programate"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Grafic pe stații */}
        <Card className="p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Comparație Stații
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.stationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="passed" fill="#10b981" name="Trecute" />
              <Bar dataKey="failed" fill="#ef4444" name="Eșuate" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Grafic pe status */}
        <Card className="p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Distribuție pe Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
