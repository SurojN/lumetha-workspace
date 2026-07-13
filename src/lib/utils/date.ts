import { formatDistanceToNow, format } from "date-fns";

export function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(
  date: Date,
  formatStr: string = "MMM dd, yyyy",
): string {
  return format(new Date(date), formatStr);
}

export function formatDateTime(
  date: Date,
  formatStr: string = "MMM dd, yyyy HH:mm",
): string {
  return format(new Date(date), formatStr);
}

export function isToday(date: Date): boolean {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
}

export function isOverdue(date: Date): boolean {
  return new Date(date) < new Date();
}
