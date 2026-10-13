/**
 * ============================================================================
 * THEME & UI CONSTANTS — PERSONAL DASHBOARD
 * ============================================================================
 * Design tokens, horizon badges, priority classes, and color palettes
 * based on UI/UX Pro Max standards (Swiss Minimalist + Bento Grid).
 */

import { Horizon, Priority } from '../types/domain';

export const THEME_STORAGE_KEY = 'personal_dashboard_theme';

export interface HorizonConfig {
  id: Horizon;
  label: string;
  shortLabel: string;
  description: string;
  accentColor: string; // Hex color
  badgeClass: string; // Tailwind class set for light and dark
  iconName: string;
}

export const HORIZON_CONFIGS: Record<Horizon, HorizonConfig> = {
  monthly: {
    id: 'monthly',
    label: 'Horizonte Mensual',
    shortLabel: 'Mensual',
    description: 'Metas macro y objetivos estratégicos a 30 días',
    accentColor: '#7C3AED', // Vivid Purple
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
    iconName: 'Target',
  },
  weekly: {
    id: 'weekly',
    label: 'Horizonte Semanal',
    shortLabel: 'Semanal',
    description: 'Compromisos tácticos y entregables del sprint a 7 días',
    accentColor: '#2563EB', // Royal Blue
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
    iconName: 'CalendarDays',
  },
  daily: {
    id: 'daily',
    label: 'Horizonte Diario',
    shortLabel: 'Diario',
    description: 'Foco de ejecución táctica para hoy (24 horas)',
    accentColor: '#D97706', // Solar Amber
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    iconName: 'SunMedium',
  },
};

export interface PriorityConfig {
  id: Priority;
  label: string;
  accentColor: string;
  badgeClass: string;
  iconName: string;
}

export const PRIORITY_CONFIGS: Record<Priority, PriorityConfig> = {
  high: {
    id: 'high',
    label: 'Alta',
    accentColor: '#E11D48', // Rose 600
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    iconName: 'AlertCircle',
  },
  medium: {
    id: 'medium',
    label: 'Media',
    accentColor: '#D97706', // Amber 600
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    iconName: 'Clock',
  },
  low: {
    id: 'low',
    label: 'Baja',
    accentColor: '#059669', // Emerald 600
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    iconName: 'CheckCircle2',
  },
};

export const BRAND_COLORS = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  darkBg: '#020617',
  darkSurface: '#0F172A',
  lightBg: '#F8FAFC',
  lightSurface: '#FFFFFF',
} as const;
