import { Task } from '../types/domain';
import { addDays, getTodayString } from '../utils/dateUtils';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface GoogleCalendarRemoteEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  status?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
}

function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
  } catch {
    return 'America/Bogota';
  }
}

/**
 * Construye el cuerpo del evento para la API de Google Calendar v3 a partir de una Tarea.
 */
function buildCalendarEventResource(task: Partial<Task> & { title: string }) {
  const dueDate = task.dueDate || getTodayString();
  const timeZone = getLocalTimeZone();

  const descriptionParts: string[] = [];
  if (task.description?.trim()) {
    descriptionParts.push(task.description.trim());
  }
  if (task.subtasks && task.subtasks.length > 0) {
    const checklist = task.subtasks
      .map((st) => `${st.completed ? '☑' : '☐'} ${st.title}`)
      .join('\n');
    descriptionParts.push(`Subtareas:\n${checklist}`);
  }
  descriptionParts.push('— Sincronizado desde Personal Dashboard');

  if (task.dueTime) {
    // Evento con hora específica (duración predeterminada de 30 minutos)
    const [hhStr, mmStr] = task.dueTime.split(':');
    const hh = Number(hhStr) || 0;
    const mm = Number(mmStr) || 0;

    const [year, month, day] = dueDate.split('-').map(Number);
    const startObj = new Date(year, month - 1, day, hh, mm, 0);
    const endObj = new Date(startObj.getTime() + 30 * 60 * 1000);

    return {
      summary: `📌 ${task.title}`,
      description: descriptionParts.join('\n\n'),
      start: {
        dateTime: startObj.toISOString(),
        timeZone,
      },
      end: {
        dateTime: endObj.toISOString(),
        timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'popup', minutes: 0 },
        ],
      },
    };
  }

  // Evento de día completo si solo tiene fecha límite pero no hora
  const nextDay = addDays(dueDate, 1);
  return {
    summary: `📌 ${task.title}`,
    description: descriptionParts.join('\n\n'),
    start: {
      date: dueDate,
    },
    end: {
      date: nextDay,
    },
  };
}

/**
 * Crea o actualiza una tarea en el calendario principal de Google Calendar del usuario.
 * Devuelve el ID del evento de Google Calendar (`googleCalendarEventId`).
 */
export async function syncTaskToGoogleCalendar(
  task: Partial<Task> & { title: string },
  accessToken: string
): Promise<string | null> {
  if (!accessToken || (!task.dueDate && !task.dueTime)) {
    return null;
  }

  const eventBody = buildCalendarEventResource(task);
  const existingEventId = task.googleCalendarEventId;

  // Si ya tenía un ID de evento en Google Calendar, intentamos actualizarlo primero
  if (existingEventId) {
    const updateResp = await fetch(
      `${CALENDAR_API_BASE}/${encodeURIComponent(existingEventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (updateResp.ok) {
      const data = (await updateResp.json()) as GoogleCalendarRemoteEvent;
      return data.id || existingEventId;
    }

    // Si el error no es 404/410, lanzamos excepción para manejar token expirado o API deshabilitada
    if (updateResp.status !== 404 && updateResp.status !== 410) {
      const errData = await updateResp.json().catch(() => ({}));
      throw new Error(
        errData?.error?.message || `Error HTTP ${updateResp.status} al actualizar en Google Calendar`
      );
    }
  }

  // Crear un nuevo evento en Google Calendar
  const createResp = await fetch(CALENDAR_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!createResp.ok) {
    const errData = await createResp.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Error HTTP ${createResp.status} al crear evento en Google Calendar`
    );
  }

  const created = (await createResp.json()) as GoogleCalendarRemoteEvent;
  return created.id || null;
}

/**
 * Elimina un evento de Google Calendar cuando se elimina la tarea vinculada.
 */
export async function deleteGoogleCalendarEvent(
  eventId: string,
  accessToken: string
): Promise<boolean> {
  if (!eventId || !accessToken) return false;
  try {
    const resp = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return resp.ok || resp.status === 404 || resp.status === 410;
  } catch {
    return false;
  }
}

/**
 * Obtiene los próximos eventos del calendario principal de Google (desde hoy hasta +30 días)
 * para importarlos al Dashboard Personal.
 */
export async function fetchUpcomingGoogleCalendarEvents(
  accessToken: string
): Promise<GoogleCalendarRemoteEvent[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const thirtyDaysLater = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: startOfToday.toISOString(),
    timeMax: thirtyDaysLater.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const resp = await fetch(`${CALENDAR_API_BASE}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Error HTTP ${resp.status} al consultar Google Calendar`
    );
  }

  const data = await resp.json();
  const items: GoogleCalendarRemoteEvent[] = Array.isArray(data.items) ? data.items : [];
  return items.filter((item) => item.status !== 'cancelled' && Boolean(item.summary));
}

/**
 * Extrae fecha 'YYYY-MM-DD' y hora 'HH:mm' (en hora local) de un evento remoto de Google Calendar.
 */
export function parseGoogleEventDateTime(event: GoogleCalendarRemoteEvent): {
  dueDate: string | null;
  dueTime: string | null;
} {
  if (event.start?.dateTime) {
    const dt = new Date(event.start.dateTime);
    if (!isNaN(dt.getTime())) {
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const hours = String(dt.getHours()).padStart(2, '0');
      const mins = String(dt.getMinutes()).padStart(2, '0');
      return {
        dueDate: `${yyyy}-${mm}-${dd}`,
        dueTime: `${hours}:${mins}`,
      };
    }
  }

  if (event.start?.date) {
    return {
      dueDate: event.start.date,
      dueTime: null,
    };
  }

  return { dueDate: null, dueTime: null };
}

/**
 * Genera un enlace directo a Google Calendar como respaldo o acceso rápido.
 */
export function buildGoogleCalendarTemplateUrl(task: {
  title: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
}): string {
  const baseDate = task.dueDate || getTodayString();
  const cleanDate = baseDate.replace(/-/g, '');

  let datesParam = `${cleanDate}/${addDays(baseDate, 1).replace(/-/g, '')}`;
  if (task.dueTime) {
    const [hhStr, mmStr] = task.dueTime.split(':');
    const hh = Number(hhStr) || 0;
    const mm = Number(mmStr) || 0;
    const [year, month, day] = baseDate.split('-').map(Number);
    const startObj = new Date(year, month - 1, day, hh, mm, 0);
    const endObj = new Date(startObj.getTime() + 30 * 60 * 1000);

    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;

    datesParam = `${fmt(startObj)}/${fmt(endObj)}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.title || 'Nueva Tarea',
    details: task.description || 'Creada desde Personal Dashboard',
    dates: datesParam,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
