import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Calendar,
  Layers,
  Flag,
  FileText,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Check,
  Link as LinkIcon,
  AlertCircle,
  Clock,
  CheckCircle2,
  Target,
  CalendarDays,
  SunMedium,
  Columns,
  ExternalLink,
} from 'lucide-react';
import { Task, Horizon, Priority, Tag, Subtask, KanbanColumn } from '../../types/domain';
import { useTasks } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import { getGoogleCalendarToken, authorizeGoogleCalendar } from '../../services/firebase';
import {
  syncTaskToGoogleCalendar,
  deleteGoogleCalendarEvent,
  buildGoogleCalendarTemplateUrl,
} from '../../services/googleCalendarService';
import { TagSelector } from './TagSelector';
import { SubtaskList } from './SubtaskList';
import { cn } from '../../utils/cn';
import { getTodayString, addDays } from '../../utils/dateUtils';
import { HORIZON_CONFIGS, PRIORITY_CONFIGS } from '../../constants/theme';

export interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  initialColumnId?: string;
  initialHorizon?: Horizon;
  onSave?: (taskData: Partial<Task> & { title: string; columnId: string }) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (taskId: string) => void;
  onCalendarSyncResult?: (result: { type: 'success' | 'error'; message: string }) => void;
}

// Simple, robust client-side Markdown parser producing safe React nodes
function renderMarkdown(content: string): React.ReactNode {
  if (!content || !content.trim()) {
    return <span className="italic text-slate-400">Sin descripción...</span>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let inList = false;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (inList && listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-slate-700 dark:text-slate-300">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="text-xs leading-relaxed">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
      inList = false;
    }
  };

  const flushCodeBlock = () => {
    if (inCodeBlock && codeBlockBuffer.length > 0) {
      elements.push(
        <pre
          key={`pre-${elements.length}`}
          className="p-3 my-2 text-xs font-mono rounded-xl bg-slate-900 text-slate-100 overflow-x-auto border border-slate-800"
        >
          <code>{codeBlockBuffer.join('\n')}</code>
        </pre>
      );
      codeBlockBuffer = [];
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={i} className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
          {parseInlineMarkdown(line.slice(2))}
        </h1>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2.5 mb-1">
          {parseInlineMarkdown(line.slice(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-2 mb-1">
          {parseInlineMarkdown(line.slice(4))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={i} className="pl-3 my-2 border-l-2 border-blue-500 italic text-xs text-slate-600 dark:text-slate-400">
          {parseInlineMarkdown(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      inList = true;
      listBuffer.push(line.trim().slice(2));
      continue;
    }

    if (line.trim() === '') {
      flushList();
      continue;
    }

    flushList();
    elements.push(
      <p key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  flushList();
  flushCodeBlock();

  return <div className="space-y-1">{elements}</div>;
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index} className="font-semibold text-slate-900 dark:text-slate-100">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1 py-0.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 font-mono text-blue-600 dark:text-blue-400">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const labelMatch = token.match(/\[(.*?)\]/);
      const urlMatch = token.match(/\((.*?)\)/);
      if (labelMatch && urlMatch) {
        parts.push(
          <a
            key={match.index}
            href={urlMatch[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
          >
            {labelMatch[1]}
          </a>
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  task,
  initialColumnId,
  initialHorizon,
  onSave,
  onDelete,
  onDuplicate,
  onCalendarSyncResult,
}) => {
  const { state, addTask, updateTask, deleteTask, duplicateTask, dispatch } = useTasks();
  const { user } = useAuth();
  const { columns, tags, tasks } = state;

  const isEditing = Boolean(task?.id);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState<Horizon>('daily');
  const [columnId, setColumnId] = useState('todo');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [parentTaskId, setParentTaskId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [syncWithGCal, setSyncWithGCal] = useState<boolean>(true);

  // UI state
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state when opening / switching task
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setHorizon(task.horizon || 'daily');
        setColumnId(task.columnId || (columns[0]?.id ?? 'todo'));
        setPriority(task.priority || 'medium');
        setDueDate(task.dueDate || '');
        setDueTime(task.dueTime || '');
        setParentTaskId(task.parentTaskId || '');
        setSelectedTagIds(task.tags || []);
        setSubtasks(task.subtasks || []);
        setSyncWithGCal(true);
      } else {
        setTitle('');
        setDescription('');
        setHorizon(initialHorizon || (state.selectedHorizon !== 'all' ? state.selectedHorizon : 'daily'));
        setColumnId(initialColumnId || (columns[0]?.id ?? 'todo'));
        setPriority('medium');
        setDueDate('');
        setDueTime('');
        setParentTaskId('');
        setSelectedTagIds([]);
        setSubtasks([]);
        setSyncWithGCal(true);
      }
      setDescTab('edit');
      setValidationError(null);
      setShowDeleteConfirm(false);
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen, task, initialColumnId, initialHorizon, columns, state.selectedHorizon]);

  // Adjust parent task eligibility when horizon changes
  useEffect(() => {
    if (horizon === 'monthly') {
      setParentTaskId('');
    } else if (horizon === 'weekly' && parentTaskId) {
      const parent = tasks.find((t) => t.id === parentTaskId);
      if (parent && parent.horizon !== 'monthly') {
        setParentTaskId('');
      }
    }
  }, [horizon, parentTaskId, tasks]);

  // Eligible parent tasks based on hierarchy rules:
  // - Monthly: none
  // - Weekly: only monthly tasks
  // - Daily: weekly or monthly tasks
  // - Cannot link to self
  const eligibleParents = useMemo(() => {
    if (horizon === 'monthly') return [];
    return tasks.filter((t) => {
      if (task && t.id === task.id) return false;
      if (horizon === 'weekly') return t.horizon === 'monthly';
      if (horizon === 'daily') return t.horizon === 'weekly' || t.horizon === 'monthly';
      return false;
    });
  }, [horizon, tasks, task]);

  // Keyboard shortcut for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setValidationError('El título de la tarea no puede estar vacío.');
      titleInputRef.current?.focus();
      return;
    }

    if (trimmedTitle.length > 250) {
      setValidationError('El título no puede superar los 250 caracteres.');
      return;
    }

    if (dueTime && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const resolvedDueDate = dueDate ? dueDate : (dueTime ? getTodayString() : null);
    const taskId = isEditing && task
      ? task.id
      : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    const taskPayload: Partial<Task> & { title: string; columnId: string } = {
      id: taskId,
      title: trimmedTitle,
      description,
      horizon,
      columnId,
      priority,
      dueDate: resolvedDueDate,
      dueTime: dueTime ? dueTime : null,
      parentTaskId: parentTaskId ? parentTaskId : null,
      tags: selectedTagIds,
      subtasks,
      googleCalendarEventId: task?.googleCalendarEventId ?? null,
    };

    if (onSave) {
      onSave(taskPayload);
      onClose();
      return;
    }

    if (isEditing && task) {
      updateTask(task.id, taskPayload);
    } else {
      addTask(taskPayload);
    }

    onClose();

    // Sincronizar con Google Calendar si la casilla está activa y tiene fecha u hora
    if (user && syncWithGCal && (resolvedDueDate || dueTime)) {
      try {
        let gcalToken = getGoogleCalendarToken();
        if (!gcalToken) {
          gcalToken = await authorizeGoogleCalendar(true);
        }
        if (gcalToken) {
          try {
            const eventId = await syncTaskToGoogleCalendar(taskPayload, gcalToken);
            if (eventId) {
              updateTask(taskId, { googleCalendarEventId: eventId });
              onCalendarSyncResult?.({
                type: 'success',
                message: `✅ "${trimmedTitle}" se agendó en tu Google Calendar (recibirás la alerta en tu celular en segundo plano).`,
              });
            }
          } catch (firstErr: any) {
            // Si el token había expirado o le faltaba el permiso de Calendar, solicitar consentimiento explícito y reintentar
            const refreshedToken = await authorizeGoogleCalendar(true);
            if (refreshedToken) {
              const eventId = await syncTaskToGoogleCalendar(taskPayload, refreshedToken);
              if (eventId) {
                updateTask(taskId, { googleCalendarEventId: eventId });
                onCalendarSyncResult?.({
                  type: 'success',
                  message: `✅ "${trimmedTitle}" se agendó en tu Google Calendar.`,
                });
              }
            } else {
              throw firstErr;
            }
          }
        }
      } catch (err: any) {
        console.warn('Error al sincronizar con Google Calendar:', err);
        onCalendarSyncResult?.({
          type: 'error',
          message: `La tarea se guardó, pero Google Calendar indicó: ${err?.message || 'Marca la casilla de permisos de Google Calendar al iniciar sesión.'}`,
        });
      }
    }
  };

  const handleDelete = () => {
    if (!task) return;
    const gcalToken = getGoogleCalendarToken();
    if (user && gcalToken && task.googleCalendarEventId) {
      deleteGoogleCalendarEvent(task.googleCalendarEventId, gcalToken).catch(() => {});
    }
    if (onDelete) {
      onDelete(task.id);
    } else {
      deleteTask(task.id);
    }
    onClose();
  };

  const handleDuplicate = () => {
    if (!task) return;
    if (onDuplicate) {
      onDuplicate(task.id);
    } else {
      duplicateTask(task.id);
    }
    onClose();
  };

  const handleAddTag = (newTag: Tag) => {
    dispatch({ type: 'ADD_TAG', payload: newTag } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative w-full max-w-xl bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-10 overflow-hidden transition-all duration-200 animate-in slide-in-from-right"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-lg border',
                HORIZON_CONFIGS[horizon].badgeClass
              )}
            >
              {HORIZON_CONFIGS[horizon].shortLabel}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  title="Duplicar tarea"
                  aria-label="Duplicar tarea"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Eliminar tarea"
                  aria-label="Eliminar tarea"
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Cerrar (Esc)"
              aria-label="Cerrar panel"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Banner */}
        {showDeleteConfirm && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>¿Confirmas la eliminación permanente de esta tarea?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Drawer Body (Scrollable) */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Title Input */}
          <div className="space-y-1.5">
            <label htmlFor="drawer-title" className="sr-only">
              Título de la tarea
            </label>
            <input
              id="drawer-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Escribe el título de la tarea..."
              maxLength={250}
              className="w-full text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 placeholder-slate-400 bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 pb-2 focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors"
            />
            {validationError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Quick Selectors Row: Horizon, Column & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Horizon Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Horizonte
              </label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value as Horizon)}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="monthly">Mensual (30 días)</option>
                <option value="weekly">Semanal (7 días)</option>
                <option value="daily">Diario (Hoy)</option>
              </select>
            </div>

            {/* Column Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Columna Kanban
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="high">Alta (Urgente)</option>
                <option value="medium">Media (Normal)</option>
                <option value="low">Baja (Secundaria)</option>
              </select>
            </div>
          </div>

          {/* Due Date & Due Time (Notification) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fecha Límite */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Fecha Límite</span>
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDueDate(getTodayString())}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDate(addDays(getTodayString(), 1))}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Mañana
                  </button>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      className="px-2 py-0.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Hora de Recordatorio / Notificación */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hora (Notificación)</span>
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 60 * 1000);
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      setDueTime(`${hh}:${mm}`);
                      if (!dueDate) setDueDate(getTodayString());
                      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission().catch(() => {});
                      }
                    }}
                    title="Programar en 1 minuto para probar"
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    +1 min
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 60 * 60 * 1000);
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      setDueTime(`${hh}:${mm}`);
                      if (!dueDate) setDueDate(getTodayString());
                      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission().catch(() => {});
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    +1h
                  </button>
                  {dueTime && (
                    <button
                      type="button"
                      onClick={() => setDueTime('')}
                      className="px-2 py-0.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>

              <input
                type="time"
                aria-label="Hora de la tarea"
                value={dueTime}
                onChange={(e) => {
                  setDueTime(e.target.value);
                  if (e.target.value && !dueDate) {
                    setDueDate(getTodayString());
                  }
                  if (e.target.value && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission().catch(() => {});
                  }
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sincronización con Google Calendar (visible cuando tiene fecha u hora) */}
          {(dueDate || dueTime) && (
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/25 border border-blue-200/70 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncWithGCal}
                  onChange={(e) => setSyncWithGCal(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  {task?.googleCalendarEventId
                    ? 'Actualizar evento vinculado en Google Calendar'
                    : 'Sincronizar automáticamente con Google Calendar'}
                </span>
              </label>

              <a
                href={buildGoogleCalendarTemplateUrl({
                  title: title.trim() || 'Nueva Tarea',
                  description,
                  dueDate: dueDate || getTodayString(),
                  dueTime: dueTime || null,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                <span>Abrir en Google Calendar</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Cross-Horizon Linking (Parent Task Selector) */}
          {horizon !== 'monthly' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <LinkIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Vincular a Tarea Superior (Alineación Estratégica)</span>
              </label>
              <select
                value={parentTaskId}
                onChange={(e) => setParentTaskId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Sin tarea superior (Independiente)</option>
                {eligibleParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    [{HORIZON_CONFIGS[parent.horizon].shortLabel}] {parent.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {horizon === 'weekly'
                  ? 'Las tareas semanales solo pueden vincularse a objetivos mensuales.'
                  : 'Las tareas diarias pueden vincularse a compromisos semanales o metas del mes.'}
              </p>
            </div>
          )}

          {/* Markdown Description with Edit / Preview Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <FileText className="w-3.5 h-3.5" />
                <span>Descripción (Markdown)</span>
              </label>

              {/* Edit vs Preview Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setDescTab('edit')}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all',
                    descTab === 'edit'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDescTab('preview')}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all',
                    descTab === 'preview'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <Eye className="w-3 h-3" />
                  <span>Vista previa</span>
                </button>
              </div>
            </div>

            {descTab === 'edit' ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe detalles en Markdown (# Título, - Lista, **negrita**, `código`)..."
                rows={5}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
              />
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[120px] max-h-72 overflow-y-auto">
                {renderMarkdown(description)}
              </div>
            )}
          </div>

          {/* Interactive Checklist (SubtaskList) */}
          <SubtaskList subtasks={subtasks} onChange={setSubtasks} />

          {/* Color-Coded Tags Selector */}
          <TagSelector
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            availableTags={tags}
            onAddTag={handleAddTag}
          />
        </form>

        {/* Drawer Footer Actions (centered to avoid bottom-right overlays) */}
        <div className="px-6 pt-4 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{isEditing ? 'Guardar Cambios' : 'Crear Tarea'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDrawer;
