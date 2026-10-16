import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TaskProvider, useTasks } from './context/TaskContext';
import { DataManagementModal } from './components/settings/DataManagementModal';
import { HorizonNav } from './components/layout/HorizonNav';
import { HorizonView } from './components/horizons/HorizonView';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { TaskDrawer } from './components/task/TaskDrawer';
import { Task, Horizon } from './types/domain';
import { getTodayString } from './utils/dateUtils';
import {
  getGoogleCalendarToken,
  authorizeGoogleCalendar,
} from './services/firebase';
import {
  syncTaskToGoogleCalendar,
  fetchUpcomingGoogleCalendarEvents,
  parseGoogleEventDateTime,
} from './services/googleCalendarService';
import {
  Sun,
  Moon,
  Layers,
  Search,
  Plus,
  Database,
  Cloud,
  Loader2,
  LogOut,
  X,
  AlertCircle,
  Bell,
  Clock,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';

// Sonido de notificación sintetizado con Web Audio API (sin depender de archivos externos)
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(587.33, now, 0.22); // D5
    playNote(880, now + 0.18, 0.45); // A5
  } catch {
    // Ignorar si el navegador bloquea el audio antes de interacción
  }
}

interface DashboardHeaderProps {
  onOpenDataModal: () => void;
  onOpenNewTask: () => void;
  onSyncGoogleCalendar: () => void;
  isSyncingCalendar: boolean;
}

function GoogleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function DashboardHeader({
  onOpenDataModal,
  onOpenNewTask,
  onSyncGoogleCalendar,
  isSyncingCalendar,
}: DashboardHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isConfigured, syncStatus, login, logout } = useAuth();
  const { state, setSearch } = useTasks();
  const { searchQuery } = state;
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
              Personal Dashboard
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {syncStatus === 'synced' && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Cloud className="w-3 h-3" />
                  <span className="hidden sm:inline">Nube Sincronizada</span>
                </span>
              )}
              {syncStatus === 'syncing' && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="hidden sm:inline">Guardando...</span>
                </span>
              )}
              {syncStatus === 'local' && (
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span className="hidden sm:inline">Modo Local</span>
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="flex items-center gap-1 text-rose-500">
                  <AlertCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Error de sincronización</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Temporal Horizon Selector Navigation (Desktop) */}
        <HorizonNav className="hidden md:inline-flex" />

        {/* Right tools: Search, Google Auth, Google Calendar Sync, New Task, Backup & Theme */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Desktop Search input */}
          <div className="relative hidden sm:block w-40 md:w-48 lg:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tareas..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Mobile search toggle button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            aria-label="Buscar tareas"
            className="sm:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Google Calendar Sync Button */}
          {user && (
            <button
              type="button"
              onClick={onSyncGoogleCalendar}
              disabled={isSyncingCalendar}
              title="Sincronizar con Google Calendar (Importar y Exportar)"
              aria-label="Sincronizar con Google Calendar"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSyncingCalendar ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span className="hidden lg:inline">
                {isSyncingCalendar ? 'Sincronizando...' : 'Calendar'}
              </span>
            </button>
          )}

          {/* Google Auth / User Profile */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
              <div
                className="flex items-center gap-2"
                title={`Sesión iniciada como ${user.email}`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuario'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-blue-500/40 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden xl:inline text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {user.displayName?.split(' ')[0] || 'Mi Perfil'}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isConfigured ? (
            <button
              type="button"
              onClick={login}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm transition-all cursor-pointer"
            >
              <GoogleIcon />
              <span className="hidden sm:inline">Conectar</span>
            </button>
          ) : null}

          {/* New Task Button (Desktop) */}
          <button
            type="button"
            onClick={onOpenNewTask}
            aria-label="Crear nueva tarea"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva</span>
          </button>

          {/* Data Backup button */}
          <button
            type="button"
            onClick={onOpenDataModal}
            aria-label="Gestión de datos y copias de seguridad"
            title="Gestión de datos y copias de seguridad"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Theme Switcher button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Dropdown Bar */}
      {isMobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 animate-in slide-in-from-top-1">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en todo el tablero..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
      )}
    </header>
  );
}

function MainDashboard() {
  const { state, addTask, updateTask } = useTasks();
  const { tasks, columns } = state;
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerInitialColumn, setDrawerInitialColumn] = useState<string | undefined>(undefined);
  const [drawerInitialHorizon, setDrawerInitialHorizon] = useState<Horizon | undefined>(undefined);

  // Estado para sincronización bidireccional con Google Calendar
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Estado de notificaciones activas en pantalla cuando llega la hora de una tarea
  const [dueAlerts, setDueAlerts] = useState<Task[]>([]);
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  const handleSyncGoogleCalendar = async () => {
    setIsSyncingCalendar(true);
    setCalendarNotice(null);

    const runSyncWithToken = async (activeToken: string) => {
      // 1. Exportar o actualizar tareas programadas del Dashboard hacia Google Calendar
      let exportedCount = 0;
      const scheduledTasks = tasks.filter((t) => {
        const col = columns.find((c) => c.id === t.columnId);
        const isDone = Boolean(col?.isCompletedColumn || t.columnId === 'done' || t.completedAt);
        return !isDone && (t.dueDate || t.dueTime);
      });

      for (const task of scheduledTasks) {
        const eventId = await syncTaskToGoogleCalendar(task, activeToken);
        if (eventId && eventId !== task.googleCalendarEventId) {
          updateTask(task.id, { googleCalendarEventId: eventId });
          exportedCount++;
        } else if (eventId) {
          exportedCount++;
        }
      }

      // 2. Importar eventos próximos desde Google Calendar hacia el Dashboard
      const remoteEvents = await fetchUpcomingGoogleCalendarEvents(activeToken);
      const todayStr = getTodayString();
      let importedCount = 0;

      for (const ev of remoteEvents) {
        const alreadyExists = tasks.some(
          (t) =>
            t.googleCalendarEventId === ev.id ||
            (ev.summary &&
              t.title.replace(/^📌\s*/, '').trim().toLowerCase() ===
                ev.summary.replace(/^📌\s*/, '').trim().toLowerCase())
        );

        if (!alreadyExists && ev.summary) {
          const { dueDate, dueTime } = parseGoogleEventDateTime(ev);
          const cleanTitle = ev.summary.replace(/^📌\s*/, '').trim();
          const horizon: Horizon = dueDate === todayStr ? 'daily' : 'weekly';

          addTask({
            title: cleanTitle,
            description: ev.description || 'Evento importado desde Google Calendar',
            horizon,
            columnId: columns[0]?.id || 'todo',
            priority: 'medium',
            dueDate,
            dueTime,
            googleCalendarEventId: ev.id,
          });
          importedCount++;
        }
      }

      return { exportedCount, importedCount };
    };

    try {
      let token = getGoogleCalendarToken();
      if (!token) {
        token = await authorizeGoogleCalendar(true);
      }
      if (!token) {
        throw new Error('No se otorgó permiso de acceso a Google Calendar.');
      }

      let counts: { exportedCount: number; importedCount: number };
      try {
        counts = await runSyncWithToken(token);
      } catch {
        // Si el token expiró o no tenía el permiso de Calendar marcado, pedir consentimiento explícito
        const freshToken = await authorizeGoogleCalendar(true);
        if (!freshToken) {
          throw new Error('Debes aceptar el permiso de Google Calendar en la ventana emergente.');
        }
        counts = await runSyncWithToken(freshToken);
      }

      setCalendarNotice({
        type: 'success',
        message: `✅ Google Calendar sincronizado: ${counts.exportedCount} tarea(s) en tu calendario y ${counts.importedCount} evento(s) nuevo(s) importado(s).`,
      });
      setTimeout(() => setCalendarNotice(null), 7000);
    } catch (err: any) {
      console.error('Error sincronizando con Google Calendar:', err);
      setCalendarNotice({
        type: 'error',
        message:
          err?.message ||
          'No se pudo sincronizar con Google Calendar. Asegúrate de marcar la casilla de permisos de Google Calendar al iniciar sesión.',
      });
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Reloj vigilante de tareas programadas con hora (revisa cada 5 segundos)
  useEffect(() => {
    const triggerNativeNotification = async (task: Task) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const title = '⏰ ¡Es hora de cumplir tu tarea!';
      const body = `${task.title} (${task.dueTime})`;

      // 1. En celulares (Android Chrome / iOS PWA), usar Service Worker obligatoriamente
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              body,
              icon: '/icon.svg',
              badge: '/icon.svg',
              tag: `task-${task.id}-${task.dueTime}`,
              requireInteraction: true,
              vibrate: [300, 100, 300, 100, 500],
            } as NotificationOptions);
            return;
          }
        } catch {
          // Si falla Service Worker, continuar con fallback de escritorio
        }
      }

      // 2. Fallback para navegadores de escritorio
      try {
        new Notification(title, {
          body,
          icon: '/icon.svg',
        });
      } catch {
        // Fallback cubierto por el banner visual en pantalla
      }
    };

    const checkScheduledTasks = () => {
      const now = new Date();
      const todayStr = getTodayString(now);
      const currentHH = String(now.getHours()).padStart(2, '0');
      const currentMM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHH}:${currentMM}`;

      tasks.forEach((task) => {
        if (!task.dueTime) return;

        // Ignorar si la tarea ya está en una columna de completado
        const col = columns.find((c) => c.id === task.columnId);
        const isDone = Boolean(col?.isCompletedColumn || task.columnId === 'done' || task.completedAt);
        if (isDone) return;

        // Si tiene fecha asignada debe coincidir con hoy; si no tiene fecha se asume hoy
        const targetDate = task.dueDate || todayStr;
        if (targetDate !== todayStr) return;

        if (task.dueTime === currentTimeStr) {
          const notificationKey = `${task.id}-${targetDate}-${task.dueTime}`;
          if (!notifiedKeysRef.current.has(notificationKey)) {
            notifiedKeysRef.current.add(notificationKey);

            // 1. Reproducir sonido de alerta
            playNotificationChime();

            // 2. Mostrar alerta visual dentro de la aplicación
            setDueAlerts((prev) => {
              if (prev.some((t) => t.id === task.id)) return prev;
              return [task, ...prev];
            });

            // 3. Disparar notificación nativa (Service Worker en celular / Notification API en PC)
            triggerNativeNotification(task);
          }
        }
      });
    };

    checkScheduledTasks();
    const intervalId = setInterval(checkScheduledTasks, 5000);
    return () => clearInterval(intervalId);
  }, [tasks, columns]);

  const handleDismissAlert = (taskId: string) => {
    setDueAlerts((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleCompleteFromAlert = (task: Task) => {
    const doneCol = columns.find((c) => c.isCompletedColumn)?.id || 'done';
    updateTask(task.id, { columnId: doneCol, completedAt: new Date().toISOString() });
    handleDismissAlert(task.id);
  };

  const handleOpenEditTask = (task: Task) => {
    setSelectedTask(task);
    setDrawerInitialColumn(task.columnId);
    setDrawerInitialHorizon(task.horizon);
    setIsTaskDrawerOpen(true);
  };

  const handleOpenNewTask = (defaultHorizon?: Horizon, _parentTaskId?: string) => {
    setSelectedTask(null);
    setDrawerInitialColumn('todo');
    setDrawerInitialHorizon(defaultHorizon);
    setIsTaskDrawerOpen(true);
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors relative">
      <DashboardHeader
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onOpenNewTask={() => handleOpenNewTask()}
        onSyncGoogleCalendar={handleSyncGoogleCalendar}
        isSyncingCalendar={isSyncingCalendar}
      />

      {/* Aviso de estado de sincronización con Google Calendar */}
      {calendarNotice && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
              calendarNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>{calendarNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setCalendarNotice(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Alertas flotantes cuando llega la hora de una tarea */}
      {dueAlerts.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md space-y-2 pointer-events-auto"
        >
          {dueAlerts.map((alertTask) => (
            <div
              key={alertTask.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-500 shadow-2xl shadow-amber-500/20 flex flex-col gap-3 animate-in slide-in-from-top-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
                    <Bell className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        ¡Hora de cumplir tu tarea!
                      </span>
                      {alertTask.dueTime && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          <Clock className="w-3 h-3" />
                          {alertTask.dueTime}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate mt-0.5">
                      {alertTask.title}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismissAlert(alertTask.id)}
                  aria-label="Cerrar notificación"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleDismissAlert(alertTask.id);
                    handleOpenEditTask(alertTask);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Ver tarea
                </button>
                <button
                  type="button"
                  onClick={() => handleCompleteFromAlert(alertTask)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marcar Completada</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full min-w-0 overflow-x-hidden mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-24 md:pb-6">
        {/* Mobile Horizon Navigation */}
        <div className="md:hidden mb-4 w-full">
          <HorizonNav />
        </div>

        <HorizonView
          onAddTask={handleOpenNewTask}
          kanbanBoardNode={
            <KanbanBoard
              onOpenDrawerWithTask={handleOpenEditTask}
              onOpenDrawerForNew={(columnId) => {
                setSelectedTask(null);
                setDrawerInitialColumn(columnId || 'todo');
                setIsTaskDrawerOpen(true);
              }}
            />
          }
        />
      </main>

      {/* Mobile Floating Action Button (FAB) centered to avoid bottom-right overlays */}
      <button
        type="button"
        onClick={() => handleOpenNewTask()}
        aria-label="Crear nueva tarea"
        title="Crear nueva tarea"
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 h-12 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xl shadow-blue-600/35 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>Nueva Tarea</span>
      </button>

      {/* Persistent Modals & Drawers */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
      />

      <TaskDrawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        task={selectedTask}
        initialColumnId={drawerInitialColumn}
        initialHorizon={drawerInitialHorizon}
        onCalendarSyncResult={(res) => {
          setCalendarNotice(res);
          if (res.type === 'success') {
            setTimeout(() => setCalendarNotice(null), 6000);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TaskProvider>
          <MainDashboard />
        </TaskProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
