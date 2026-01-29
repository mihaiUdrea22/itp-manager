import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatează data pentru afișare în format "ziua luna anul" (ex: "15 ianuarie 2024")
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Data invalidă';
  
  const day = d.getDate();
  const monthNames = [
    'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}

// Formatează data și ora în format "ziua luna anul, ora:minut" (ex: "15 ianuarie 2024, 14:30")
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Data invalidă';
  
  const day = d.getDate();
  const monthNames = [
    'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

// Formatează doar ora în format "ora:minut" (ex: "14:30")
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Ora invalidă';
  
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

// Calculează data următoarei inspecții (ITP-ul este valabil 1 an pentru mașini, 6 luni pentru unele vehicule)
export function calculateNextInspectionDate(
  currentDate: Date,
  vehicleType: string
): Date {
  const nextDate = new Date(currentDate);
  // Pentru simplitate, toate vehiculele au ITP anual
  // În realitate, unele vehicule (taxi, transport public) au ITP la 6 luni
  nextDate.setFullYear(nextDate.getFullYear() + 1);
  return nextDate;
}

// Verifică dacă un ITP este expirat sau expiră în curând
export function getInspectionStatus(
  nextInspectionDate: Date | undefined,
  daysWarning: number = 30
): 'valid' | 'expiring_soon' | 'expired' {
  if (!nextInspectionDate) return 'valid';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inspectionDate = new Date(nextInspectionDate);
  inspectionDate.setHours(0, 0, 0, 0);
  
  const diffTime = inspectionDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= daysWarning) return 'expiring_soon';
  return 'valid';
}
