/**
 * ============================================================================
 * TIMEZONE-SAFE DATE UTILITIES — PERSONAL DASHBOARD
 * ============================================================================
 * Provides robust, timezone-neutral calendar date manipulations,
 * relative human-friendly date labels in Spanish, and overdue checks.
 */

const MONTH_NAMES_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

/**
 * Normalizes input into a strict 'YYYY-MM-DD' calendar string.
 * Uses local calendar components when converting a Date object to avoid UTC drift.
 */
export function getTodayString(referenceDate?: Date | string): string {
  if (typeof referenceDate === 'string' && referenceDate.length >= 10) {
    return referenceDate.slice(0, 10);
  }
  const d = referenceDate instanceof Date ? referenceDate : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds (or subtracts) a number of days to a 'YYYY-MM-DD' string safely.
 */
export function addDays(dateString: string, days: number): string {
  const parts = dateString.slice(0, 10).split('-');
  if (parts.length !== 3) return dateString;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  d.setDate(d.getDate() + days);

  const resYear = d.getFullYear();
  const resMonth = String(d.getMonth() + 1).padStart(2, '0');
  const resDay = String(d.getDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Calculates calendar day difference between targetDate and baseDate.
 * (targetDate - baseDate in days)
 */
export function getDaysDifference(targetDate: string, baseDate?: string): number {
  const base = baseDate ? baseDate.slice(0, 10) : getTodayString();
  const target = targetDate.slice(0, 10);

  const [tY, tM, tD] = target.split('-').map(Number);
  const [bY, bM, bD] = base.split('-').map(Number);

  const targetUtc = Date.UTC(tY, tM - 1, tD);
  const baseUtc = Date.UTC(bY, bM - 1, bD);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((targetUtc - baseUtc) / msPerDay);
}

/**
 * Checks if a task due date is overdue.
 * Only returns true if task is not completed, has a dueDate, and dueDate is strictly before today.
 */
export function isOverdue(
  dueDate: string | null | undefined,
  isCompleted = false,
  referenceDate?: string | Date
): boolean {
  if (isCompleted || !dueDate) return false;
  const todayStr = getTodayString(referenceDate);
  const dueStr = dueDate.slice(0, 10);
  return dueStr < todayStr;
}

/**
 * Checks if a task due date is due today.
 */
export function isDueToday(
  dueDate: string | null | undefined,
  referenceDate?: string | Date
): boolean {
  if (!dueDate) return false;
  const todayStr = getTodayString(referenceDate);
  return dueDate.slice(0, 10) === todayStr;
}

/**
 * Checks if a task due date is due tomorrow.
 */
export function isDueTomorrow(
  dueDate: string | null | undefined,
  referenceDate?: string | Date
): boolean {
  if (!dueDate) return false;
  const todayStr = getTodayString(referenceDate);
  const tomorrowStr = addDays(todayStr, 1);
  return dueDate.slice(0, 10) === tomorrowStr;
}

/**
 * Formats a 'YYYY-MM-DD' date into 'DD/MM/YYYY'.
 */
export function formatDate(dueDate: string | null | undefined): string {
  if (!dueDate) return '';
  const parts = dueDate.slice(0, 10).split('-');
  if (parts.length !== 3) return dueDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formats a 'YYYY-MM-DD' date into short Spanish text, e.g. '12 Oct'.
 */
export function formatDateShort(dueDate: string | null | undefined): string {
  if (!dueDate) return '';
  const parts = dueDate.slice(0, 10).split('-');
  if (parts.length !== 3) return dueDate;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = MONTH_NAMES_SHORT_ES[monthIdx] || parts[1];
  return `${day} ${monthName}`;
}

/**
 * Returns a human-friendly relative date label in Spanish:
 * "Hoy", "Mañana", "Ayer", "Vencida", or "DD/MM/YYYY".
 */
export function getRelativeDateLabel(
  dueDate: string | null | undefined,
  referenceDate?: string | Date
): string {
  if (!dueDate) return '';
  const todayStr = getTodayString(referenceDate);
  const dueStr = dueDate.slice(0, 10);

  const diff = getDaysDifference(dueStr, todayStr);

  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff < -1) return 'Vencida';

  return formatDate(dueStr);
}
