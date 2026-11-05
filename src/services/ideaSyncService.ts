import { DashboardAppState, Priority, Subtask, Tag, Task } from '../types/domain';

export const IDEAVAULT_STORAGE_KEY = 'ideavault_state_v2';
export const IDEAVAULT_PROFILE_PREFIX = 'ideavault_profile_v2_';
export const BRIDGE_STORAGE_KEY = 'ideavault_bridge_real_ideas_v1';
export const BRIDGE_CHANNEL_NAME = 'ideavault_dashboard_sync_v1';

export const IDEA_TAG: Tag = {
  id: 'tag-ideas',
  name: 'Proyecto / Idea',
  color: '#0D9488', // Teal 600
};

const SEED_IDEA_IDS = new Set(['idea-seed-1', 'idea-seed-2', 'idea-seed-3']);

export interface IdeaValidationStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface IdeaRoadmapPhase {
  id: string;
  phase: string;
  duration: string;
  objective: string;
  deliverables?: string[];
  tasks?: string[];
}

export interface IdeaRecord {
  id: string;
  title: string;
  summary?: string;
  problem?: string;
  hypothesis?: string;
  category?: string;
  stage?: string;
  energy?: string;
  ice?: { impact: number; confidence: number; ease: number };
  tags?: string[];
  validationSteps?: IdeaValidationStep[];
  roadmap?: IdeaRoadmapPhase[];
  isPinned?: boolean;
  reviewDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function isSeedIdea(idea: Partial<IdeaRecord> | null | undefined): boolean {
  if (!idea || typeof idea.id !== 'string' || typeof idea.title !== 'string') {
    return true;
  }
  if (SEED_IDEA_IDS.has(idea.id)) return true;
  const trimmed = idea.title.trim();
  if (
    trimmed.startsWith('Ejemplo 1:') ||
    trimmed.startsWith('Ejemplo 2:') ||
    trimmed.startsWith('Ejemplo 3:')
  ) {
    return true;
  }
  return false;
}

function isSeedGeneratedTaskId(taskId: string): boolean {
  for (const seedId of SEED_IDEA_IDS) {
    if (taskId.includes(seedId)) return true;
  }
  return false;
}

export function isGeneratedIdeaTaskId(taskId: string): boolean {
  return (
    taskId.startsWith('idea-project-') ||
    taskId.startsWith('idea-task-') ||
    taskId.startsWith('idea-phase-') ||
    taskId.startsWith('idea-step-') ||
    taskId.startsWith('idea-next-')
  );
}

/**
 * Suma `days` días a una fecha base ISO/YYYY-MM-DD y retorna `YYYY-MM-DD`.
 */
export function addDaysToIsoDate(baseIso: string | undefined, daysToAdd: number): string {
  const cleanBase =
    typeof baseIso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(baseIso)
      ? baseIso.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  const [y, m, d] = cleanBase.split('-').map(Number);
  const dateObj = new Date(y || 2026, (m || 1) - 1, d || 1);
  dateObj.setDate(dateObj.getDate() + Math.max(0, Math.round(daysToAdd)));

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula la ventana `[startDay, endDay]` en días a partir del texto de duración de una fase del Roadmap
 * (ej. "Semanas 1 - 2", "Semana 3", "Días 1-5", "Mes 1").
 */
export function parsePhaseWindowDays(
  durationText: string | undefined,
  phaseIndex: number,
  previousEndDay: number
): { startDay: number; endDay: number } {
  const raw = (durationText || '').toLowerCase();
  const numbers = (raw.match(/\d+/g) || [])
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  const isMonth = /mes|month/.test(raw);
  const isDay = /d[ií]a|day/.test(raw);
  const unitDays = isDay ? 1 : isMonth ? 30 : 7;

  if (numbers.length >= 2) {
    const first = numbers[0];
    const second = numbers[1];
    const startDay = Math.max(previousEndDay, (first - 1) * unitDays);
    const endDay = Math.max(startDay + unitDays, second * unitDays);
    return { startDay, endDay };
  }

  if (numbers.length === 1) {
    const n = numbers[0];
    const isOrdinal = /^(semana|mes|d[ií]a|fase)\s+\d+/.test(raw.trim());
    if (isOrdinal) {
      const startDay = Math.max(previousEndDay, (n - 1) * unitDays);
      return { startDay, endDay: startDay + unitDays };
    }
    return {
      startDay: previousEndDay,
      endDay: previousEndDay + n * unitDays,
    };
  }

  const defaultSpan = 14;
  const startDay = previousEndDay > 0 ? previousEndDay : phaseIndex * defaultSpan;
  return {
    startDay,
    endDay: startDay + defaultSpan,
  };
}

function mapIdeaPriority(idea: IdeaRecord): Priority {
  if (idea.isPinned) return 'high';
  if (idea.ice) {
    const avg =
      ((idea.ice.impact || 5) + (idea.ice.confidence || 5) + (idea.ice.ease || 5)) / 3;
    if (avg >= 7.5) return 'high';
    if (avg >= 5) return 'medium';
    return 'low';
  }
  return 'medium';
}

function mapIdeaColumn(idea: IdeaRecord): string {
  if (idea.stage === 'launched') return 'done';
  const steps = Array.isArray(idea.validationSteps) ? idea.validationSteps : [];
  const allStepsDone = steps.length > 0 && steps.every((s) => s.completed);
  if (allStepsDone) return 'done';
  if (
    idea.stage === 'building' ||
    idea.stage === 'validating' ||
    idea.stage === 'exploring' ||
    steps.some((s) => s.completed)
  ) {
    return 'in-progress';
  }
  return 'todo';
}

/**
 * Si una idea no tiene fases de Roadmap explícitas pero tiene pasos,
 * genera un cronograma semanal automático en 2 bloques (Semana 1 y Semana 2).
 */
function ensureEffectiveRoadmap(
  idea: IdeaRecord,
  steps: IdeaValidationStep[]
): IdeaRoadmapPhase[] {
  const existing = Array.isArray(idea.roadmap) ? idea.roadmap : [];
  if (existing.length > 0) return existing;

  if (steps.length === 0) {
    return [
      {
        id: 'auto-week-1',
        phase: 'Semana 1: Definición y Ejecución Base',
        duration: 'Semana 1',
        objective: `Estructurar e iniciar el desarrollo de ${idea.title}.`,
        tasks: [],
        deliverables: ['Definición inicial'],
      },
    ];
  }

  const mid = Math.max(1, Math.ceil(steps.length / 2));
  const firstHalf = steps.slice(0, mid);
  const secondHalf = steps.slice(mid);

  const phases: IdeaRoadmapPhase[] = [
    {
      id: 'auto-week-1',
      phase: 'Semana 1: Planificación, Diseño y Base',
      duration: 'Semana 1',
      objective: `Completar la definición inicial y primeros pasos de ${idea.title}.`,
      tasks: firstHalf.map((s) => s.text),
      deliverables: ['Diseño y estructura inicial'],
    },
  ];

  if (secondHalf.length > 0) {
    phases.push({
      id: 'auto-week-2',
      phase: 'Semana 2: Construcción del MVP y Validación',
      duration: 'Semana 2',
      objective: `Desarrollar y probar las funcionalidades clave de ${idea.title}.`,
      tasks: secondHalf.map((s) => s.text),
      deliverables: ['MVP funcional validado'],
    });
  }

  return phases;
}

/**
 * Organiza cada idea real en los 3 horizontes del Dashboard sin duplicar pasos en Diario:
 * 1. MENSUAL (1 tarjeta por Proyecto): Visión global del proyecto con su fecha de cierre final.
 * 2. SEMANAL (Fases / Semanas de desarrollo): Cómo se va a desarrollar el proyecto por semanas,
 *    con fechas escalonadas por fase y los pasos de esa semana adentro como subtareas.
 * 3. DIARIO (Solo 1 tarea activa por Proyecto): Únicamente el próximo paso pendiente de cada idea
 *    para que ningún proyecto se repita varias veces en la vista Diaria.
 */
export function buildTasksFromIdeas(ideas: IdeaRecord[]): Task[] {
  const realIdeas = (ideas || []).filter((i) => !isSeedIdea(i));
  const generated: Task[] = [];

  realIdeas.forEach((idea, ideaIdx) => {
    const baseDate = idea.createdAt || new Date().toISOString();
    const updatedAt = idea.updatedAt || baseDate;
    const priority = mapIdeaPriority(idea);
    const projectColumn = mapIdeaColumn(idea);
    const steps = Array.isArray(idea.validationSteps) ? idea.validationSteps : [];
    const effectiveRoadmap = ensureEffectiveRoadmap(idea, steps);

    // 1. Calcular fechas exactas (`startDate` y `dueDate`) para cada bloque de Semanas / Fase
    let runningEndDay = 0;
    const phaseSchedule = effectiveRoadmap.map((phase, idx) => {
      const { startDay, endDay } = parsePhaseWindowDays(
        phase.duration,
        idx,
        runningEndDay
      );
      runningEndDay = Math.max(runningEndDay, endDay);
      return {
        phase,
        idx,
        startDay,
        endDay,
        startDate: addDaysToIsoDate(baseDate, startDay),
        dueDate: addDaysToIsoDate(baseDate, endDay),
      };
    });

    const totalProjectDays = Math.max(7, runningEndDay);
    const projectDueDate =
      typeof idea.reviewDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(idea.reviewDate)
        ? idea.reviewDate.slice(0, 10)
        : addDaysToIsoDate(baseDate, totalProjectDays);

    const projectTaskId = `idea-project-${idea.id}`;

    // Distribuir los pasos de validación entre las fases/semanas del proyecto
    const stepsByPhaseIdx = new Map<number, { step: IdeaValidationStep; stepIdx: number; stepDueDate: string }[]>();
    phaseSchedule.forEach((_, idx) => stepsByPhaseIdx.set(idx, []));

    steps.forEach((step, stepIdx) => {
      const targetPhaseIdx = Math.min(
        phaseSchedule.length - 1,
        Math.floor((stepIdx / Math.max(1, steps.length)) * phaseSchedule.length)
      );
      const targetPhase = phaseSchedule[targetPhaseIdx];
      const span = Math.max(1, targetPhase.endDay - targetPhase.startDay);
      const stepOffset = Math.max(
        1,
        Math.round(((stepIdx + 1) / Math.max(1, steps.length)) * span)
      );
      const stepDueDate = addDaysToIsoDate(
        baseDate,
        Math.min(targetPhase.endDay, targetPhase.startDay + stepOffset)
      );
      stepsByPhaseIdx.get(targetPhaseIdx)?.push({ step, stepIdx, stepDueDate });
    });

    // Subtareas del Proyecto Mensual (todos los pasos con su fecha programada)
    const monthlySubtasks: Subtask[] = steps.map((st, sIdx) => {
      const targetPhaseIdx = Math.min(
        phaseSchedule.length - 1,
        Math.floor((sIdx / Math.max(1, steps.length)) * phaseSchedule.length)
      );
      const targetPhase = phaseSchedule[targetPhaseIdx];
      return {
        id: `sub-proj-${idea.id}-${st.id}`,
        title: `${st.text} (${targetPhase.phase.duration} · Vence: ${targetPhase.dueDate})`,
        completed: Boolean(st.completed),
        order: sIdx,
        createdAt: baseDate,
      };
    });

    const descLines: string[] = [];
    if (idea.summary) {
      descLines.push(`## Resumen del Proyecto\n${idea.summary}`);
    }
    if (idea.problem) {
      descLines.push(`### Problema\n${idea.problem}`);
    }
    if (idea.hypothesis) {
      descLines.push(`### Hipótesis\n${idea.hypothesis}`);
    }
    if (phaseSchedule.length > 0) {
      const roadmapMd = phaseSchedule
        .map(
          (ps) =>
            `- **${ps.phase.phase}** (${ps.phase.duration} · Del \`${ps.startDate}\` al \`${ps.dueDate}\`): ${ps.phase.objective}`
        )
        .join('\n');
      descLines.push(`### Cronograma por Semanas (Roadmap)\n${roadmapMd}`);
    }

    // A) TAREA MENSUAL: 1 sola tarjeta por Proyecto con la fecha final del Roadmap
    generated.push({
      id: projectTaskId,
      title: `💡 Proyecto: ${idea.title}`,
      description:
        descLines.join('\n\n') || `Proyecto sincronizado desde tu Organizador de Ideas.`,
      horizon: 'monthly',
      columnId: projectColumn,
      priority,
      dueDate: projectDueDate,
      dueTime: null,
      tags: [IDEA_TAG.id],
      subtasks: monthlySubtasks,
      parentTaskId: null,
      order: ideaIdx,
      createdAt: baseDate,
      updatedAt,
      completedAt: projectColumn === 'done' ? updatedAt : null,
    });

    // B) TAREAS SEMANALES: Cómo se va a desarrollar el proyecto por semanas/fases con sus fechas
    phaseSchedule.forEach((ps) => {
      const phaseId = ps.phase.id || `p-${ps.idx}`;
      const weeklyTaskId = `idea-phase-${idea.id}-${phaseId}`;
      const assignedSteps = stepsByPhaseIdx.get(ps.idx) || [];

      const phaseSubtasks: Subtask[] =
        assignedSteps.length > 0
          ? assignedSteps.map((item, idx) => ({
              id: `sub-wk-${idea.id}-${phaseId}-${item.step.id}`,
              title: `${item.step.text} (Plazo: ${item.stepDueDate})`,
              completed: Boolean(item.step.completed),
              order: idx,
              createdAt: baseDate,
            }))
          : (ps.phase.tasks || []).map((t, tIdx) => ({
              id: `sub-wktask-${idea.id}-${phaseId}-${tIdx}`,
              title: t,
              completed: projectColumn === 'done',
              order: tIdx,
              createdAt: baseDate,
            }));

      const allPhaseStepsDone =
        assignedSteps.length > 0 && assignedSteps.every((item) => item.step.completed);
      const anyPhaseStepDone = assignedSteps.some((item) => item.step.completed);

      const phaseColumn =
        projectColumn === 'done' || allPhaseStepsDone
          ? 'done'
          : anyPhaseStepDone || (ps.idx === 0 && projectColumn === 'in-progress')
          ? 'in-progress'
          : 'todo';

      generated.push({
        id: weeklyTaskId,
        title: `🗓️ [${idea.title}] ${ps.phase.phase}`,
        description: `## ${ps.phase.phase} (${ps.phase.duration})\n**Proyecto:** ${idea.title}\n**Ventana de desarrollo:** \`${ps.startDate}\` → \`${ps.dueDate}\`\n**Objetivo:** ${ps.phase.objective}`,
        horizon: 'weekly',
        columnId: phaseColumn,
        priority,
        dueDate: ps.dueDate,
        dueTime: null,
        tags: [IDEA_TAG.id],
        subtasks: phaseSubtasks,
        parentTaskId: projectTaskId,
        order: ps.idx,
        createdAt: baseDate,
        updatedAt,
        completedAt: phaseColumn === 'done' ? updatedAt : null,
      });
    });

    // C) TAREA DIARIA: ESTRICTAMENTE 1 SOLA TAREA ACTIVA POR PROYECTO (el próximo paso pendiente)
    // Así nunca se repite el mismo proyecto 4 o 13 veces en la pestaña Diario
    if (steps.length > 0) {
      const firstIncompleteIdx = steps.findIndex((s) => !s.completed);
      const activeIdx = firstIncompleteIdx !== -1 ? firstIncompleteIdx : steps.length - 1;
      const activeStep = steps[activeIdx];

      const activePhaseIdx = Math.min(
        phaseSchedule.length - 1,
        Math.floor((activeIdx / Math.max(1, steps.length)) * phaseSchedule.length)
      );
      const activePhase = phaseSchedule[activePhaseIdx];
      const activePhaseId = activePhase.phase.id || `p-${activePhase.idx}`;
      const parentWeeklyId = `idea-phase-${idea.id}-${activePhaseId}`;

      const span = Math.max(1, activePhase.endDay - activePhase.startDay);
      const offsetInPhase = Math.max(
        1,
        Math.round(((activeIdx + 1) / Math.max(1, steps.length)) * span)
      );
      const activeStepDueDate = addDaysToIsoDate(
        baseDate,
        Math.min(activePhase.endDay, activePhase.startDay + offsetInPhase)
      );

      const dailyColumn = activeStep.completed
        ? 'done'
        : projectColumn === 'in-progress'
        ? 'in-progress'
        : 'todo';

      generated.push({
        id: `idea-next-${idea.id}`,
        title: `📌 [${idea.title}] Paso ${activeIdx + 1}/${steps.length}: ${activeStep.text}`,
        description: `## Siguiente Acción del Proyecto: ${idea.title}\n**Paso actual (${activeIdx + 1} de ${steps.length}):** ${activeStep.text}\n**Etapa / Semana:** ${activePhase.phase.phase} (${activePhase.phase.duration})\n**Fecha límite de este paso:** \`${activeStepDueDate}\`\n\n> 💡 *En la vista Diaria solo aparece el paso activo actual de cada proyecto para evitar duplicados. El resto de pasos están organizados por semanas en la pestaña **Semanal** y el proyecto completo en **Mensual**.*`,
        horizon: 'daily',
        columnId: dailyColumn,
        priority,
        dueDate: activeStepDueDate,
        dueTime: null,
        tags: [IDEA_TAG.id],
        subtasks: steps.map((st, sIdx) => ({
          id: `sub-daily-${idea.id}-${st.id}`,
          title: `Paso ${sIdx + 1}: ${st.text}`,
          completed: Boolean(st.completed),
          order: sIdx,
          createdAt: baseDate,
        })),
        parentTaskId: parentWeeklyId,
        order: ideaIdx,
        createdAt: baseDate,
        updatedAt,
        completedAt: activeStep.completed ? updatedAt : null,
      });
    }
  });

  return generated;
}

/**
 * Extrae todas las ideas reales guardadas en localStorage por el Organizador de Ideas.
 */
export function readRealIdeasFromLocalStorage(): IdeaRecord[] {
  if (typeof window === 'undefined') return [];

  const byId = new Map<string, IdeaRecord>();

  const collectFromList = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (item && typeof item === 'object' && !isSeedIdea(item as IdeaRecord)) {
        const idea = item as IdeaRecord;
        const existing = byId.get(idea.id);
        if (
          !existing ||
          (idea.updatedAt || '') >= (existing.updatedAt || '')
        ) {
          byId.set(idea.id, idea);
        }
      }
    }
  };

  try {
    const bridgeRaw = window.localStorage.getItem(BRIDGE_STORAGE_KEY);
    if (bridgeRaw) {
      collectFromList(JSON.parse(bridgeRaw));
    }

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(IDEAVAULT_PROFILE_PREFIX)) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.ideas)) {
            collectFromList(parsed.ideas);
          }
        }
      }
    }

    const baseRaw = window.localStorage.getItem(IDEAVAULT_STORAGE_KEY);
    if (baseRaw) {
      const parsed = JSON.parse(baseRaw);
      if (parsed && Array.isArray(parsed.ideas)) {
        collectFromList(parsed.ideas);
      }
    }
  } catch {
    // Ignorar JSON corrupto externo
  }

  return Array.from(byId.values());
}

/**
 * Fusiona las tareas de ideas reales en el Dashboard manteniendo intactas las tareas
 * propias del usuario y eliminando las antiguas tareas sueltas (`idea-step-*`).
 */
export function mergeIdeasIntoDashboardState(
  state: DashboardAppState,
  ideas: IdeaRecord[]
): { nextState: DashboardAppState; hasChanges: boolean } {
  const realIdeas = (ideas || []).filter((i) => !isSeedIdea(i));

  // Limpiar semillas y antiguos pasos diarios sueltos (`idea-step-*`)
  const cleanedExistingTasks = state.tasks.filter(
    (t) =>
      !isSeedGeneratedTaskId(t.id) &&
      !t.id.startsWith('idea-step-') &&
      !t.id.startsWith('idea-task-')
  );
  const removedLegacyTasks = cleanedExistingTasks.length !== state.tasks.length;

  if (realIdeas.length === 0) {
    if (!removedLegacyTasks) {
      return { nextState: state, hasChanges: false };
    }
    return {
      nextState: {
        ...state,
        tasks: cleanedExistingTasks,
        lastUpdated: new Date().toISOString(),
      },
      hasChanges: true,
    };
  }

  const incomingIdeaTasks = buildTasksFromIdeas(realIdeas);
  const existingById = new Map<string, Task>();
  cleanedExistingTasks.forEach((t) => existingById.set(t.id, t));

  let changed = removedLegacyTasks;
  const mergedGeneratedTasks: Task[] = incomingIdeaTasks.map((incoming) => {
    const prev = existingById.get(incoming.id);
    if (!prev) {
      changed = true;
      return incoming;
    }

    const ideaIsNewer = (incoming.updatedAt || '') > (prev.updatedAt || '');
    const nextTask: Task = {
      ...prev,
      title: incoming.title,
      description: incoming.description,
      priority: incoming.priority,
      horizon: incoming.horizon,
      parentTaskId: incoming.parentTaskId,
      dueDate: prev.dueDate || incoming.dueDate,
      columnId: ideaIsNewer ? incoming.columnId : prev.columnId,
      subtasks: ideaIsNewer ? incoming.subtasks : prev.subtasks,
      updatedAt: ideaIsNewer ? incoming.updatedAt : prev.updatedAt,
      completedAt:
        (ideaIsNewer ? incoming.columnId : prev.columnId) === 'done'
          ? prev.completedAt || incoming.completedAt || new Date().toISOString()
          : null,
    };

    if (
      nextTask.title !== prev.title ||
      nextTask.horizon !== prev.horizon ||
      nextTask.parentTaskId !== prev.parentTaskId ||
      nextTask.description !== prev.description ||
      nextTask.dueDate !== prev.dueDate ||
      nextTask.columnId !== prev.columnId ||
      JSON.stringify(nextTask.subtasks) !== JSON.stringify(prev.subtasks)
    ) {
      changed = true;
      return nextTask;
    }

    return prev;
  });

  const incomingIds = new Set(incomingIdeaTasks.map((t) => t.id));
  const nonIdeaUserTasks = cleanedExistingTasks.filter(
    (t) => !isGeneratedIdeaTaskId(t.id)
  );

  const previousIdeaTasksCount = cleanedExistingTasks.filter((t) =>
    isGeneratedIdeaTaskId(t.id)
  ).length;
  if (previousIdeaTasksCount !== incomingIds.size) {
    changed = true;
  }

  const hasIdeaTag = state.tags.some((tag) => tag.id === IDEA_TAG.id);
  const nextTags = hasIdeaTag ? state.tags : [...state.tags, IDEA_TAG];
  if (!hasIdeaTag) {
    changed = true;
  }

  if (!changed) {
    return { nextState: state, hasChanges: false };
  }

  return {
    nextState: {
      ...state,
      tasks: [...nonIdeaUserTasks, ...mergedGeneratedTasks],
      tags: nextTags,
      lastUpdated: new Date().toISOString(),
    },
    hasChanges: true,
  };
}
