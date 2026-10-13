// src/components/settings/DataManagementModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useTasks } from '../../context/TaskContext';
import { exportJSON, importJSON, resetToSeed, saveState } from '../../services/storageService';
import { DashboardAppState } from '../../types/domain';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  AlertCircle,
  Database,
} from 'lucide-react';

export interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useTasks();

  const [previewState, setPreviewState] = useState<DashboardAppState | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset internal states when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setPreviewState(null);
      setImportError(null);
      setFeedbackMessage(null);
      setShowResetConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Export JSON handler
  const handleExport = () => {
    try {
      const jsonString = exportJSON(state);
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `personal-dashboard-backup-${todayStr}.json`;

      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedbackMessage({
        type: 'success',
        text: `Copia de seguridad "${filename}" descargada con éxito.`,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Error al exportar los datos: ${err?.message || 'Error desconocido'}`,
      });
    }
  };

  // 2. File selection & JSON parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setPreviewState(null);
    setFeedbackMessage(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importJSON(content);

      if (result.success && result.state) {
        setPreviewState(result.state);
        setImportError(null);
      } else {
        setImportError(result.error || 'El archivo seleccionado no es válido.');
        setPreviewState(null);
      }
    };

    reader.onerror = () => {
      setImportError('No se pudo leer el archivo seleccionado.');
    };

    reader.readAsText(file);
    // Reset file input value so re-selecting same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 3. Confirm and Replace state with imported backup
  const handleConfirmImport = () => {
    if (!previewState) return;

    try {
      saveState(previewState);
      dispatch({ type: 'LOAD_STATE', payload: { state: previewState } });
      setFeedbackMessage({
        type: 'success',
        text: `Tablero restaurado correctamente (${previewState.tasks.length} tareas, ${previewState.columns.length} columnas).`,
      });
      setPreviewState(null);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Error al aplicar la copia de seguridad: ${err?.message || ''}`,
      });
    }
  };

  // 4. Reset to Seed handler
  const handleConfirmReset = () => {
    try {
      const seedState = resetToSeed();
      dispatch({ type: 'RESET_TO_SEED', payload: { seedState } });
      setShowResetConfirm(false);
      setFeedbackMessage({
        type: 'success',
        text: 'Datos restablecidos exitosamente a los valores de ejemplo.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Error al restablecer los datos: ${err?.message || ''}`,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-management-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 transition-all text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/60">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 id="data-management-modal-title" className="text-lg font-bold tracking-tight">
                Gestión de Datos y Copias de Seguridad
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exporta, restaura o reinicia la información de tu tablero personal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {/* 1. Export Section */}
          <section className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 dark:text-slate-200">
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Exportar Copia de Seguridad</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                Descarga un archivo JSON estructurado con tus {state.tasks.length} tareas, {state.columns.length} columnas y etiquetas para salvaguardar tu progreso.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <Download className="w-4 h-4" />
              Descargar JSON
            </button>
          </section>

          {/* 2. Import Section */}
          <section className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 dark:text-slate-200">
                  <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Importar Copia de Seguridad</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Carga un archivo JSON de respaldo para sustituir o restaurar los datos de tu tablero.
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="json-file-input"
                />
                <label
                  htmlFor="json-file-input"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer shadow-sm transition-all flex-shrink-0"
                >
                  <FileText className="w-4 h-4" />
                  Seleccionar Archivo JSON
                </label>
              </div>
            </div>

            {/* Import Validation Error */}
            {importError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Error de validación: </strong>
                  <span>{importError}</span>
                </div>
              </div>
            )}

            {/* Import Preview & Confirmation */}
            {previewState && (
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Vista previa de la copia de seguridad:
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                    Esquema v{previewState.version}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900">
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {previewState.tasks.length}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Tareas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900">
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {previewState.columns.length}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Columnas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900">
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {previewState.tags.length}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Etiquetas</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPreviewState(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar y Reemplazar Datos
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 3. Reset to Seed Section */}
          <section className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 dark:text-slate-200">
                  <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Restablecer Datos de Ejemplo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Restaura el conjunto inicial curado de tareas, columnas y etiquetas. Útil para reiniciar o explorar el flujo recomendado.
                </p>
              </div>

              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-xl border border-rose-300 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex-shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restablecer Datos
                </button>
              ) : null}
            </div>

            {/* Destructive Confirmation Box */}
            {showResetConfirm && (
              <div className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <p className="font-semibold">
                      ¿Estás seguro de restablecer todos los datos a los valores de ejemplo?
                    </p>
                    <p className="text-rose-700 dark:text-rose-300 text-[11px]">
                      Esta acción reemplazará permanentemente todas tus tareas y columnas personalizadas. Te sugerimos exportar una copia de seguridad antes de continuar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Sí, restablecer todo
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
