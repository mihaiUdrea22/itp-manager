'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { GripVertical, X, Settings } from 'lucide-react';

export type WidgetType = 
  | 'stats'
  | 'charts'
  | 'recent_activity'
  | 'expiring_inspections'
  | 'station_comparison'
  | 'trends';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  enabled: boolean;
  order: number;
}

interface WidgetManagerProps {
  widgets: Widget[];
  onUpdateWidgets: (widgets: Widget[]) => void;
}

export function WidgetManager({ widgets, onUpdateWidgets }: WidgetManagerProps) {
  const [isEditing, setIsEditing] = useState(false);

  const toggleWidget = (widgetId: string) => {
    const updated = widgets.map((w) =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    onUpdateWidgets(updated);
  };

  const moveWidget = (fromIndex: number, toIndex: number) => {
    const updated = [...widgets];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    // Update order
    updated.forEach((w, index) => {
      w.order = index;
    });
    onUpdateWidgets(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Widget-uri Dashboard
        </h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <Settings className="h-4 w-4" />
          {isEditing ? 'Finalizează' : 'Personalizează'}
        </button>
      </div>

      {isEditing && (
        <Card className="p-4 sm:p-6">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Activează sau dezactivează widget-urile și reordonează-le
          </p>
          <div className="space-y-2">
            {widgets.map((widget, index) => (
              <div
                key={widget.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                <label className="flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widget.enabled}
                    onChange={() => toggleWidget(widget.id)}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {widget.title}
                  </span>
                </label>
                {index > 0 && (
                  <button
                    onClick={() => moveWidget(index, index - 1)}
                    className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Mută sus"
                  >
                    ↑
                  </button>
                )}
                {index < widgets.length - 1 && (
                  <button
                    onClick={() => moveWidget(index, index + 1)}
                    className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Mută jos"
                  >
                    ↓
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
