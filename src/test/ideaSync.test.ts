import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildTasksFromIdeas,
  isSeedIdea,
  mergeIdeasIntoDashboardState,
  parsePhaseWindowDays,
  readRealIdeasFromLocalStorage,
  type IdeaRecord,
} from '../services/ideaSyncService';
import { INITIAL_APP_STATE } from '../constants/initialData';

describe('ideaSyncService — Organización Mensual, Semanal y 1 Tarea Activa en Diario', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('descarta las 3 ideas de ejemplo semilla (idea-seed-1, idea-seed-2, idea-seed-3)', () => {
    expect(isSeedIdea({ id: 'idea-seed-1', title: 'Ejemplo 1: Cómo capturar' })).toBe(true);
    expect(isSeedIdea({ id: 'idea-seed-2', title: 'Ejemplo 2: Avanza el estado' })).toBe(true);
    expect(isSeedIdea({ id: 'idea-seed-3', title: 'Ejemplo 3: Inicia sesión' })).toBe(true);
    expect(isSeedIdea({ id: 'idea-real-1', title: 'Dashboard Financiero' })).toBe(false);
  });

  it('calcula correctamente las ventanas de días según el texto de duración de cada fase del Roadmap', () => {
    const p1 = parsePhaseWindowDays('Semanas 1 - 2', 0, 0);
    expect(p1).toEqual({ startDay: 0, endDay: 14 });

    const p2 = parsePhaseWindowDays('Semanas 3 - 5', 1, p1.endDay);
    expect(p2).toEqual({ startDay: 14, endDay: 35 });
  });

  it('genera 1 tarea Mensual, las Fases Semanales con fechas por semana, y SOLO 1 tarea activa en Diario por idea', () => {
    const sampleIdea: IdeaRecord = {
      id: 'idea-100',
      title: 'Dashboard Financiero',
      summary: 'Control de finanzas personales.',
      stage: 'building',
      isPinned: true,
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      roadmap: [
        {
          id: 'phase-1',
          phase: 'Fase 1: Diseño y Prototipo',
          duration: 'Semanas 1 - 2',
          objective: 'Validar UX',
        },
        {
          id: 'phase-2',
          phase: 'Fase 2: MVP en Producción',
          duration: 'Semanas 3 - 4',
          objective: 'Lanzar beta funcional',
        },
      ],
      validationSteps: [
        { id: 'st-1', text: 'Definir métricas clave', completed: true },
        { id: 'st-2', text: 'Diseñar prototipo en Figma', completed: false },
        { id: 'st-3', text: 'Elegir stack tecnológico', completed: false },
        { id: 'st-4', text: 'Probar con 3 amigos', completed: false },
      ],
    };

    const tasks = buildTasksFromIdeas([sampleIdea]);

    const monthly = tasks.filter((t) => t.horizon === 'monthly');
    const weekly = tasks.filter((t) => t.horizon === 'weekly');
    const daily = tasks.filter((t) => t.horizon === 'daily');

    expect(monthly).toHaveLength(1);
    expect(monthly[0].dueDate).toBe('2026-11-29');

    expect(weekly).toHaveLength(2);
    expect(weekly[0].dueDate).toBe('2026-11-15');
    expect(weekly[1].dueDate).toBe('2026-11-29');

    // Estrictamente 1 sola tarea en Diario para este proyecto (el paso #2, que es el primero pendiente)
    expect(daily).toHaveLength(1);
    expect(daily[0].title).toContain('Paso 2/4: Diseñar prototipo en Figma');
  });

  it('auto-genera 2 semanas de desarrollo en Semanal cuando una idea no tiene Roadmap explícito', () => {
    window.localStorage.setItem(
      'ideavault_profile_v2_uid_de_software_de_ideas',
      JSON.stringify({
        version: 1,
        ideas: [
          {
            id: 'idea-real-99',
            title: 'Dashboard Financiero',
            stage: 'spark',
            createdAt: '2026-11-01T00:00:00.000Z',
            updatedAt: '2026-11-05T00:00:00.000Z',
            validationSteps: [
              { id: 's1', text: 'Paso 1', completed: false },
              { id: 's2', text: 'Paso 2', completed: false },
              { id: 's3', text: 'Paso 3', completed: false },
              { id: 's4', text: 'Paso 4', completed: false },
            ],
          },
        ],
      })
    );

    const realIdeas = readRealIdeasFromLocalStorage();
    const { nextState, hasChanges } = mergeIdeasIntoDashboardState(
      INITIAL_APP_STATE,
      realIdeas
    );
    expect(hasChanges).toBe(true);

    const weeklyForIdea = nextState.tasks.filter(
      (t) => t.horizon === 'weekly' && t.title.includes('[Dashboard Financiero]')
    );
    const dailyForIdea = nextState.tasks.filter(
      (t) => t.horizon === 'daily' && t.title.includes('[Dashboard Financiero]')
    );
    expect(weeklyForIdea).toHaveLength(2);
    expect(dailyForIdea).toHaveLength(1);
  });
});
