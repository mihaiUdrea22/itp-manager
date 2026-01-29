// Sistem de log-uri pentru acțiuni utilizatorilor

export type ActionType = 'create' | 'update' | 'delete' | 'view' | 'schedule' | 'complete';

export type EntityType = 'client' | 'vehicle' | 'inspection' | 'station' | 'user' | 'appointment';

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  details?: string;
  timestamp: string;
  stationId?: string;
  stationName?: string;
}

const ACTIVITY_LOGS_KEY = 'activity_logs';

export function logActivity(
  userId: string,
  userEmail: string,
  userRole: string,
  action: ActionType,
  entityType: EntityType,
  entityId: string,
  entityName: string,
  details?: string,
  stationId?: string,
  stationName?: string
): void {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    userEmail,
    userRole,
    action,
    entityType,
    entityId,
    entityName,
    details,
    timestamp: new Date().toISOString(),
    stationId,
    stationName,
  };

  const existingLogs = getActivityLogs();
  const updatedLogs = [log, ...existingLogs].slice(0, 1000); // Păstrează ultimele 1000 log-uri
  localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(updatedLogs));
}

export function getActivityLogs(companyId?: string, stationId?: string, limit?: number): ActivityLog[] {
  const stored = localStorage.getItem(ACTIVITY_LOGS_KEY);
  if (!stored) return [];

  let logs = JSON.parse(stored) as ActivityLog[];

  // Filtrare după companyId (dacă e necesar)
  if (companyId) {
    // Pentru moment, nu avem companyId în log-uri, dar putem filtra după stationId
    if (stationId) {
      logs = logs.filter(log => log.stationId === stationId);
    }
  }

  if (limit) {
    logs = logs.slice(0, limit);
  }

  return logs;
}

export function getActivityLogsByEntity(
  entityType: EntityType,
  entityId: string
): ActivityLog[] {
  const logs = getActivityLogs();
  return logs.filter(
    log => log.entityType === entityType && log.entityId === entityId
  );
}

export function getActivityLogsByUser(userId: string, limit?: number): ActivityLog[] {
  const logs = getActivityLogs();
  const userLogs = logs.filter(log => log.userId === userId);
  return limit ? userLogs.slice(0, limit) : userLogs;
}

export function getActivityLogsByDateRange(
  startDate: Date,
  endDate: Date,
  stationId?: string
): ActivityLog[] {
  const logs = getActivityLogs();
  const start = startDate.getTime();
  const end = endDate.getTime();

  return logs.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    const inRange = logTime >= start && logTime <= end;
    if (stationId) {
      return inRange && log.stationId === stationId;
    }
    return inRange;
  });
}
