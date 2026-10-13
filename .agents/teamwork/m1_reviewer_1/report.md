# Informe de Revisión de Código y Desafío Adversarial — Milestone 1

- **Revisor / Crítico Adversarial:** `m1_reviewer_1`
- **Fecha:** 2026-10-12
- **Directorio de Trabajo:** `.agents/teamwork/m1_reviewer_1`
- **Proyecto:** Dashboard Personal Multi-Horizonte & Tablero Kanban
- **Veredicto:** **REQUEST_CHANGES**

---

## 1. Resumen Ejecutivo de Revisión

Se ha llevado a cabo una auditoría independiente, exhaustiva y adversarial de los 20 archivos que conforman la entrega de **Milestone 1**. Se contrastaron directamente contra las especificaciones de `ORIGINAL_REQUEST.md`, los contratos de interfaz de `PROJECT.md`, el oráculo y suite de pruebas `tests/e2e/harness.ts`, y las opciones de compilación estricta de `tsconfig.json`.

El scaffolding general, la arquitectura de separación de contextos (`TaskStateContext` / `TaskDispatchContext`), el diseño UI/UX Pro Max, y el modelado de datos en `src/types/domain.ts` son de muy alta calidad y demuestran una implementación genuina y sin atajos.

Sin embargo, se han detectado **1 hallazgo Crítico** que causará una rotura inmediata del build de TypeScript (`npm run build` / `tsc`), **2 hallazgos Mayores** de lógica y consistencia de estado, y **2 hallazgos Menores**. En consecuencia, el veredicto formal es **REQUEST_CHANGES**.

---

## 2. Hallazgos Detallados (Findings)

### [Critical] Hallazgo 1: Importaciones Huérfanas en `src/App.tsx` Rompen la Compilación `tsc` (`noUnusedLocals`)

- **Qué:** Los identificadores `Target` y `CalendarDays` se importan desde `lucide-react` en `src/App.tsx` pero no se utilizan en ningún lugar del archivo.
- **Ubicación:** `src/App.tsx`, líneas 16-17:
  ```typescript
  16:   Target,
  17:   CalendarDays,
  ```
- **Por qué es un problema crítico:** En `tsconfig.json`, la regla `"noUnusedLocals": true` está habilitada en modo estricto:
  ```json
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  ```
  Cuando el desarrollador o CI ejecute el comando de build estipulado en `package.json` (`npm run build`, que ejecuta `tsc && vite build`), el compilador TypeScript abortará inmediatamente con errores fatales:
  ```text
  error TS6133: 'Target' is declared but its value is never read.
  error TS6133: 'CalendarDays' is declared but its value is never read.
  ```
  Esto viola directamente el Criterio de Aceptación de `ORIGINAL_REQUEST.md`:
  > *"El proyecto compila limpiamente mediante npm run build sin errores tipográficos ni warnings críticos."*
- **Sugerencia de corrección:** Eliminar `Target` y `CalendarDays` de la lista de importación en `src/App.tsx`, o utilizarlos activamente en las tarjetas de horizonte.

---

### [Major] Hallazgo 2: `RESET_TO_SEED` y `resetState()` sin Parámetros es un No-Op

- **Qué:** Si se despacha la acción `{ type: 'RESET_TO_SEED' }` sin `payload`, o se invoca `resetState()` desde `useTasks()` sin argumentos, el reducer no restablece el estado y retorna el estado actual sin cambios.
- **Ubicación:** 
  - `src/context/taskReducer.ts`, líneas 416-427:
    ```typescript
    case 'RESET_TO_SEED':
    case 'RESET_STATE': {
      if (action.payload) {
        if ('seedState' in action.payload && action.payload.seedState) {
          return { ...action.payload.seedState };
        }
        if ('tasks' in action.payload) {
          return { ...(action.payload as unknown as DashboardAppState) };
        }
      }
      return state;
    }
    ```
  - `src/context/TaskContext.tsx`, líneas 121-126:
    ```typescript
    const resetState = useCallback(
      (seedState?: DashboardAppState) => {
        dispatch({ type: 'RESET_STATE', payload: { seedState } });
      },
      [dispatch]
    );
    ```
- **Por qué es un problema:** 
  1. En `tests/e2e/tier1_features.test.ts` (línea 499) y en el Feature #13 de `PROJECT.md` ("Reset to Seed Data"), la acción estándar esperada es:
     ```typescript
     dispatch({ type: 'RESET_TO_SEED' });
     ```
  2. Si `action.payload` es `undefined` o `{ seedState: undefined }`, la condición `if (action.payload)` falla o no encuentra un `seedState` válido, por lo que el reducer devuelve `return state;` inalterado.
  3. Esto bloquea la funcionalidad de reinicio a datos de fábrica.
- **Sugerencia de corrección:** 
  En `src/context/taskReducer.ts`, importar `INITIAL_APP_STATE` desde `../constants/initialData` y usarlo como fallback predeterminado:
  ```typescript
  case 'RESET_TO_SEED':
  case 'RESET_STATE': {
    if (action.payload) {
      if ('seedState' in action.payload && action.payload.seedState) {
        return { ...action.payload.seedState };
      }
      if ('tasks' in action.payload) {
        return { ...(action.payload as unknown as DashboardAppState) };
      }
    }
    return { ...INITIAL_APP_STATE };
  }
  ```

---

### [Major] Hallazgo 3: Riesgo de Duplicación de Tareas en `MOVE_TASK` por Desincronización de `sourceColumnId`

- **Qué:** En el manejo de `MOVE_TASK` entre columnas diferentes, se confía en `action.payload.sourceColumnId` por encima de la columna real de la tarea (`task.columnId`).
- **Ubicación:** `src/context/taskReducer.ts`, líneas 193 y 246-248:
  ```typescript
  const sourceColumnId = action.payload.sourceColumnId || task.columnId;
  ...
  const otherTasks = state.tasks.filter(
    t => t.columnId !== sourceColumnId && t.columnId !== destinationColumnId
  );
  ```
- **Por qué es un problema:** Si por un evento desincronizado de drag-and-drop o una llamada externa se pasa un `sourceColumnId` erróneo (diferente a `task.columnId`), la tarea existente en `task.columnId` se conserva dentro de `otherTasks` Y ADEMÁS se inserta en `destTasks`. Como resultado, la tarea se duplica en el estado. Además, si `destinationColumnId` no existe en `state.columns`, la tarea se mueve a un limbo invisible sin ser validada.
- **Sugerencia de corrección:**
  1. Utilizar siempre `task.columnId` como la única fuente de la verdad para la columna origen:
     ```typescript
     const sourceColumnId = task.columnId;
     ```
  2. Validar que la columna destino exista antes de operar:
     ```typescript
     if (!destColumn) return state;
     ```

---

### [Minor] Hallazgo 4: `DELETE_COLUMN` no Valida si la Columna Receptora es la Misma a Eliminar

- **Qué:** En `DELETE_COLUMN`, no se verifica si `targetCol === id`.
- **Ubicación:** `src/context/taskReducer.ts`, líneas 394-403:
  ```typescript
  const targetCol = action.payload.targetColumnId || action.payload.fallbackColumnId || state.columns.find(c => c.id !== id)?.id || 'todo';
  const updatedTasks = state.tasks.map(t => (t.columnId === id ? { ...t, columnId: targetCol } : t));
  return {
    ...state,
    columns: state.columns.filter(c => c.id !== id),
    tasks: normalizeColumnOrders(updatedTasks, targetCol),
  };
  ```
- **Por qué es un problema:** Si un usuario o API pasa accidentalmente `fallbackColumnId` igual a la columna que se está borrando, las tareas se mantienen asignadas a `id` y luego dicha columna se remueve de `state.columns`. Las tareas quedan huérfanas en una columna inexistente. Además, debería evitarse la eliminación de columnas default (`isDefault: true`).
- **Sugerencia de corrección:** Añadir una comprobación de seguridad:
  ```typescript
  const fallback = state.columns.find(c => c.id !== id)?.id || 'todo';
  const targetCol = (action.payload.targetColumnId && action.payload.targetColumnId !== id)
    ? action.payload.targetColumnId
    : (action.payload.fallbackColumnId && action.payload.fallbackColumnId !== id ? action.payload.fallbackColumnId : fallback);
  ```

---

### [Minor] Hallazgo 5: Orden Estable en `ADD_TASK` con `order: 0` Desplaza la Nueva Tarea al Índice 1

- **Qué:** Cuando se añade una tarea con `payload.order = 0` en una columna donde ya existe una tarea con orden 0, `normalizeColumnOrders` ejecuta `sort((a, b) => a.order - b.order)`.
- **Ubicación:** `src/context/taskReducer.ts`, líneas 15-23 y 66-68.
- **Por qué es un problema:** Al existir dos tareas con orden 0 (`0 - 0 = 0`), la estabilidad de orden nativa de JavaScript preserva la tarea preexistente antes de la nueva. Por ende, la tarea preexistente mantiene el orden 0 y la nueva recibe el orden 1, incumpliendo la inserción deseada al inicio de la columna.
- **Sugerencia de corrección:** Al insertar en una posición explícita, desplazar previamente los índices existentes o insertar con `splice` en la posición solicitada antes de la renormalización.

---

## 3. Matriz de Reclamos Verificados (Verified Claims)

| Reclamo de `m1_worker_1` | Método de Verificación | Resultado | Observaciones |
| :--- | :--- | :--- | :--- |
| **Separación de Contextos de React** (`TaskStateContext` y `TaskDispatchContext`) | Inspección de `src/context/TaskContext.tsx` | **PASS** | Perfectamente implementado para aislar lecturas y despachos sin re-renders espurios. |
| **Modo Oscuro Dual con Anti-Flash Script** | Inspección de `index.html` y `src/context/ThemeContext.tsx` | **PASS** | Script inline en `<head>` sincronizado con `localStorage` y listener de eventos `storage` multi-pestaña. |
| **Orphan Safety en Eliminación de Tareas** | Inspección de `src/context/taskReducer.ts` y `src/test/reducer.test.ts` | **PASS** | Si se borra un padre, los hijos reciben `parentTaskId: null` sin ser eliminados. |
| **Invariante de Orden Contiguo ($0..N-1$)** | Inspección de `normalizeColumnOrders` | **PASS** | Preserva la secuencia sin saltos numéricos en adición, movimiento, duplicación y eliminación. |
| **Integridad y Realismo de Seed Data** | Inspección de `src/constants/initialData.ts` y `src/test/domain.test.ts` | **PASS** | 8 tareas detalladas, sin emojis, distribuidas coherentemente en los 3 horizontes y 3 columnas. |
| **Ausencia de Atajos o Facades Falsas (Integrity Check)** | Análisis estático y estructural de todo el código fuente | **PASS** | Cero violaciones de integridad detectadas. Lógica real y completa. |
| **Compilación Limpia de TypeScript (`npm run build`)** | Análisis estático con reglas de `tsconfig.json` | **FAIL** | **TS6133** por importaciones no usadas (`Target`, `CalendarDays`) en `src/App.tsx`. |

---

## 4. Cobertura de Pruebas y Brechas

- **Pruebas Existentes**:
  - `src/test/domain.test.ts`: 7 pruebas unitarias robustas que validan modelos y seed data.
  - `src/test/reducer.test.ts`: 16 pruebas unitarias completas sobre ramas de acción e inmutabilidad (`Object.freeze`).
- **Brechas Identificadas**:
  - Falta prueba explícita para la acción `{ type: 'RESET_TO_SEED' }` sin payload en `src/test/reducer.test.ts`.
  - Falta prueba unitaria de renderizado para `ThemeContext.tsx` y `TaskContext.tsx` (planificadas o transferibles a siguientes hitos).

---

## 5. Veredicto y Acciones Requeridas

**Veredicto Formal: REQUEST_CHANGES**

Para que el Milestone 1 alcance el estado **APPROVE**, el agente de implementación (`m1_worker_1`) debe aplicar las siguientes correcciones puntuales:

1. **[Obligatorio]** En `src/App.tsx`: Eliminar `Target` y `CalendarDays` de la sentencia `import { ... } from 'lucide-react';`.
2. **[Obligatorio]** En `src/context/taskReducer.ts`:
   - Importar `INITIAL_APP_STATE` desde `../constants/initialData`.
   - Modificar los casos `'RESET_TO_SEED'` y `'RESET_STATE'` para retornar `{ ...INITIAL_APP_STATE }` cuando no se proporcione un payload o `seedState`.
3. **[Recomendado]** En `src/context/taskReducer.ts`:
   - En `MOVE_TASK`, fijar `const sourceColumnId = task.columnId;` y verificar `if (!destColumn) return state;`.
   - En `DELETE_COLUMN`, prevenir que `targetCol === id`.
