import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TaskProvider, useTasks } from './context/TaskContext';
import { DataManagementModal } from './components/settings/DataManagementModal';
import { HorizonNav } from './components/layout/HorizonNav';
import { HorizonView } from './components/horizons/HorizonView';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { TaskDrawer } from './components/task/TaskDrawer';
import { Task, Horizon } from './types/domain';
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
} from 'lucide-react';

interface DashboardHeaderProps {
  onOpenDataModal: () => void;
  onOpenNewTask: () => void;
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

function DashboardHeader({ onOpenDataModal, onOpenNewTask }: DashboardHeaderProps) {
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

        {/* Right tools: Search, Google Auth, New Task, Backup & Theme */}
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

          {/* Google Auth / User Profile */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
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
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerInitialColumn, setDrawerInitialColumn] = useState<string | undefined>(undefined);
  const [drawerInitialHorizon, setDrawerInitialHorizon] = useState<Horizon | undefined>(undefined);

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
      />

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
