'use client';

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
import { Card } from '@/components/ui/Card';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ChartsProps {
  inspectionsByMonth: ChartData[];
  inspectionsByStation: ChartData[];
  inspectionsByStatus: ChartData[];
  trendData: ChartData[];
}

export function Charts({
  inspectionsByMonth,
  inspectionsByStation,
  inspectionsByStatus,
  trendData,
}: ChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Grafic ITP-uri pe luni */}
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          ITP-uri pe Luni
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={inspectionsByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              name="ITP-uri"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Grafic ITP-uri pe stații */}
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          ITP-uri pe Stații
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={inspectionsByStation}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#10b981" name="ITP-uri" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Grafic ITP-uri pe status */}
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          ITP-uri pe Status
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={inspectionsByStatus}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {inspectionsByStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Grafic tendințe */}
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Tendințe (Ultimele 6 Luni)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
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
              name="Finalizate"
            />
            <Line
              type="monotone"
              dataKey="scheduled"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Programate"
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              name="Eșuate"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
