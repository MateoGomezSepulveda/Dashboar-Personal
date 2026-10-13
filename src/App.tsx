import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TaskProvider, useTasks } from './context/TaskContext';
import { DataManagementModal } from './components/settings/DataManagementModal';
import { HorizonNav } from './components/layout/HorizonNav';
import { QuickStats } from './components/layout/QuickStats';
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
} from 'lucide-react';

interface DashboardHeaderProps {
  onOpenDataModal: () => void;
  onOpenNewTask: () => void;
}

function DashboardHeader({ onOpenDataModal, onOpenNewTask }: DashboardHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { state, setSearch } = useTasks();
  const { searchQuery } = state;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              Dashboard Mateo Gomez
            </h1>
          </div>
        </div>

        {/* Temporal Horizon Selector Navigation */}
        <HorizonNav className="hidden md:inline-flex" />

        {/* Right tools: Search, New Task, Data Backup & Theme Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block w-44 lg:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tareas..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* New Task CTA */}
          <button
            type="button"
            onClick={onOpenNewTask}
            aria-label="Crear nueva tarea"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:cursor-pointer text-white bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva</span>
          </button>

          {/* Data Management button */}
          <button
            type="button"
            onClick={onOpenDataModal}
            aria-label="Gestión de datos y copias de seguridad"
            title="Gestión de datos y copias de seguridad"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="hidden lg:inline">Datos</span>
          </button>

          {/* Theme Switcher button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
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

  const handleOpenNewTask = (defaultHorizon?: Horizon, parentTaskId?: string) => {
    setSelectedTask(null);
    setDrawerInitialColumn('todo');
    setDrawerInitialHorizon(defaultHorizon);
    setIsTaskDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors">
      <DashboardHeader
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onOpenNewTask={() => handleOpenNewTask()}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Horizon Navigation */}
        <div className="md:hidden mb-4 flex justify-center">
          <HorizonNav />
        </div>

        <QuickStats />

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
      <TaskProvider>
        <MainDashboard />
      </TaskProvider>
    </ThemeProvider>
  );
}
