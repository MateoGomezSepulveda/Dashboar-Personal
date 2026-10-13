# Informe de Arquitectura y Especificación Técnica
## Proyecto: Dashboard Personal con Horizontes Temporales y Tablero Kanban

- **Autor:** survey_explorer_arch_1 (Architecture & Technical Explorer)
- **Fecha:** 2026-10-12
- **Estado:** Completado
- **Fuente Autorizada:** `.agents/teamwork/ORIGINAL_REQUEST.md`

---

## 1. Resumen Ejecutivo y Metas Arquitectónicas

El objetivo es diseñar la arquitectura de software modular para una aplicación web moderna, responsiva y de alto rendimiento orientada a la planificación personal integral mediante **Horizontes Temporales (Mensual, Semanal, Diario)** y un **Tablero Kanban interactivo con Drag and Drop**.

### Principios Rectores:
1. **Rendimiento y Cero-Lag (60 FPS):** Interacciones fluidas de arrastrar y soltar tanto en escritorio como en dispositivos móviles (touch) sin saltos visuales ni re-renderizados innecesarios.
2. **Modularidad y Separación de Responsabilidades:** Arquitectura basada en componentes atómicos, servicios desacoplados para almacenamiento y cálculo, y una capa de estado predecible basada en React 18+.
3. **Persistencia Local Segura y Resiliente:** Operación 100% offline en el navegador mediante `localStorage` con versionado de esquema, migraciones automáticas, respaldo/restauración JSON y fallback a datos semilla (*seed data*).
4. **Diseño Visual de Nivel Profesional (UI/UX Pro Max):** Adherencia rigurosa a las directrices de diseño UI/UX (paleta Slate/Zinc, acento Azul Real `#2563EB`, modo oscuro nativo con persistencia, iconos vectoriales Lucide, cero emojis como iconos y accesibilidad WCAG AAA).
5. **Verificabilidad y Calidad de Código:** Configuración completa de pruebas con Vitest y `@testing-library/react` con cobertura para lógica de dominio, persistencia y reducers.

---

## 2. Análisis del Entorno y Ecosistema de Paquetes

### 2.1. Evaluación Comparativa de Librerías Drag and Drop

| Criterio | `@hello-pangea/dnd` (Recomendada) | `@dnd-kit` (Alternativa) | HTML5 Drag & Drop Nativo |
| :--- | :--- | :--- | :--- |
| **Compatibilidad React 18+** | Excelente (Fork comunitario activo de react-beautiful-dnd, StrictMode OK) | Excelente (Diseñada para React moderno) | Nativo en el navegador |
| **Animaciones Fluidas (FLIP)** | **Nativas de fábrica**: las tarjetas se desplazan con física suave al pasar sobre ellas | Requiere configuración manual de animaciones y `<DragOverlay>` | Muy deficiente: genera imagen fantasma estática sin animaciones de placeholder |
| **Soporte Táctil (Móvil/Tablet)** | **Nativo**: Maneja retardo de pulsación (press-delay) para no interferir con scroll | Nativo con `TouchSensor` configurado | Nulo en móviles sin polyfill externo pesado |
| **Accesibilidad (WCAG AAA)** | **Nativa**: Tabulación a tarjeta, Barra Espaciadora para levantar, Flechas para mover, Enter para soltar | Requiere configuración de anuncios ARIA manual | Nula por defecto |
| **Complejidad de Integración** | **Baja**: Modelo mental directo `<DragDropContext>`, `<Droppable>`, `<Draggable>` | Media-Alta: Requiere coordinar múltiples sensores, colisiones y estado activo | Muy alta para lograr reordenamiento y Kanban multi-columna |
| **Veredicto Arquitectónico** | **Elección Oficial**: Proporciona exactamente la experiencia Kanban de Trello/Linear con cero fricción y 60 FPS garantizados. | Opción secundaria si se requiere una personalización geométrica no lineal. | Descartado: Experiencia pobre en móviles y falta de accesibilidad. |

### 2.2. Manejo de Fechas y Tiempo

Se seleccionó **`date-fns` (v3.x)** frente a alternativas:
- **`date-fns`**: Modular y *tree-shakeable* (solo se empaquetan las funciones utilizadas como `format`, `isToday`, `isThisWeek`, `isThisMonth`, `differenceInDays`, `parseISO`). Funciona con objetos `Date` nativos inmutables y soporte de localización en español (`date-fns/locale/es`).
- **`dayjs`**: Aunque ligero, requiere plugins para operaciones avanzadas y la arquitectura funcional de `date-fns` se alinea mejor con TypeScript.
- **API `Intl` nativa**: Utilizada complementariamente para formateo de fechas relativas y números sin dependencias adicionales.

### 2.3. Estilizado y Sistema de Diseño

- **Tailwind CSS v3**: Motor de utilidades con estrategia `darkMode: 'class'`.
- **`clsx` + `tailwind-merge` (`cn` utility)**: Para composición condicional segura de clases CSS sin conflictos de especificidad.
- **`lucide-react`**: Biblioteca de iconos SVG ligeros, configurados con trazo uniforme (`strokeWidth={1.75}`).

---

## 3. Arquitectura del Modelo de Dominio y Tipos TypeScript

### 3.1. Estructura de Tipos (`src/types/task.ts`)

```typescript
export type HorizonType = 'monthly' | 'weekly' | 'daily';

export type PriorityLevel = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  label: string;
  color: string; // Ej: 'blue' | 'purple' | 'amber' | 'emerald' | 'rose'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  horizon: HorizonType;
  status: string; // Corresponde al columnId (ej. 'todo', 'in_progress', 'done')
  priority: PriorityLevel;
  dueDate: string; // Formato ISO YYYY-MM-DD
  order: number; // Índice de ordenamiento dentro de la columna
  parentTaskId?: string; // Vinculación entre horizontes (ej. tarea diaria ligada a meta semanal/mensual)
  subtasks: Subtask[];
  tags: Tag[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  order: number;
  maxTasks?: number; // Límite WIP opcional
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  activeHorizon: HorizonType | 'all';
  searchQuery: string;
  filterPriority?: PriorityLevel | 'all';
  filterTag?: string | 'all';
}
```

### 3.2. Esquema de Persistencia y Migraciones (`src/types/storage.ts`)

```typescript
export const CURRENT_SCHEMA_VERSION = 1;

export interface StoragePayload {
  version: number;
  timestamp: string;
  data: {
    tasks: Task[];
    columns: KanbanColumn[];
    preferences: Partial<UserPreferences>;
  };
}

export interface BackupMetadata {
  exportDate: string;
  schemaVersion: number;
  appVersion: string;
  taskCount: number;
  columnCount: number;
}

export interface BackupFile extends StoragePayload {
  metadata: BackupMetadata;
}
```

---

## 4. Diseño de la Arquitectura de Estado y Flujo de Datos

Para evitar prop drilling sin introducir sobrecargas de librerías externas pesadas, se implementa el patrón **Separated Contexts + useReducer**:

```
+--------------------------------------------------------------------------+
|                                AppProvider                               |
|  +---------------------------+  +-------------------------------------+  |
|  |     ThemeContext.Provider |  |         FilterContext.Provider      |  |
|  +---------------------------+  +-------------------------------------+  |
|  +--------------------------------------------------------------------+  |
|  |                        TaskStateContext.Provider                   |  |
|  |                 (tasks, columns, selectedTaskId, metrics)          |  |
|  +--------------------------------------------------------------------+  |
|  +--------------------------------------------------------------------+  |
|  |                       TaskDispatchContext.Provider                 |  |
|  |     (addTask, updateTask, deleteTask, moveTask, reorderColumns)    |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

### 4.1. Ventaja de Separar State y Dispatch
1. Los componentes que únicamente emiten eventos (como el botón "Nueva Tarea", selectores de filtros o acciones rápidas) se suscriben a `useTaskDispatch()` y **no se re-renderizan** cuando el estado de las tareas cambia.
2. Los componentes que renderizan columnas o tarjetas individuales se suscriben a `useTaskState()` o usan selectores memoizados (`useTasksByColumn(columnId)`).

### 4.2. Acciones del Reducer (`TaskReducer.ts`)
- `INIT_STATE`: Inicializa el estado desde almacenamiento o seed data.
- `ADD_TASK`: Crea una tarea nueva con UUID, cálculo automático de `order` y timestamps.
- `UPDATE_TASK`: Actualiza propiedades parciales de una tarea (título, notas, subtareas, fechas).
- `DELETE_TASK`: Elimina la tarea y reajusta las relaciones jerárquicas hijas (`parentTaskId`).
- `MOVE_TASK`: Maneja el movimiento de una tarjeta (mismo origen/destino con reordenamiento, o cambio de columna con actualización de estado y orden).
- `REORDER_COLUMNS`: Reorganiza el orden de las columnas Kanban.
- `ADD_COLUMN` / `EDIT_COLUMN` / `DELETE_COLUMN`: Gestión dinámica de columnas.
- `TOGGLE_SUBTASK`: Alterna el estado de una subtarea individual y recalcula progreso.
- `IMPORT_BACKUP`: Reemplaza o fusiona el estado tras validación de esquema.

---

## 5. Estrategia de Drag and Drop (Kanban Interactivo)

El flujo de Drag and Drop con `@hello-pangea/dnd` se encapsula en un hook dedicado `useKanbanDnD.ts`.

### 5.1. Máquina de Estados del Arrastre
1. **`onDragStart`**: Se captura el `draggableId` y la columna de origen. Se activa un estado visual accesible si es necesario.
2. **`onDragUpdate`**: El motor calcula dinámicamente las matrices de transformación CSS y desplaza los elementos vecinos con animación de física acelerada por hardware (`transform: translate3d`).
3. **`onDragEnd(result: DropResult)`**:
   - Si no hay destino (`!result.destination`), la tarjeta vuelve elásticamente a su posición original sin alterar el estado.
   - Si origen y destino coinciden en columna e índice, no hay operación.
   - **Reordenamiento intra-columna**: Se reordenan las tarjetas dentro del array y se recalculan los atributos `order` de las tarjetas afectadas.
   - **Transferencia inter-columna**: La tarjeta cambia su `status = destination.droppableId`, se inserta en el nuevo índice `destination.index`, se actualizan los timestamps (`updatedAt`, y `completedAt` si la columna destino es "Done"), y se persisten los cambios.

### 5.2. Código Arquitectónico del Hook `useKanbanDnD`

```typescript
// src/hooks/useKanbanDnD.ts
import { useCallback } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { useTaskDispatch } from '../context/TaskContext';

export function useKanbanDnD() {
  const dispatch = useTaskDispatch();

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId, type } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    if (type === 'COLUMN') {
      dispatch({
        type: 'REORDER_COLUMNS',
        payload: {
          startIndex: source.index,
          endIndex: destination.index,
        },
      });
      return;
    }

    // Movimiento de Tarea
    dispatch({
      type: 'MOVE_TASK',
      payload: {
        taskId: draggableId,
        sourceColumnId: source.droppableId,
        destinationColumnId: destination.droppableId,
        sourceIndex: source.index,
        destinationIndex: destination.index,
      },
    });
  }, [dispatch]);

  return { handleDragEnd };
}
```

---

## 6. Persistencia, Sincronización y Migración de Esquema

### 6.1. Servicio de Almacenamiento (`src/services/storage/storageService.ts`)

El servicio aísla `localStorage`, proporcionando:
1. **Serialización Segura**: Manejo con bloque `try/catch` para capturar excepciones como `QuotaExceededError` o JSON malformado.
2. **Sincronización Multi-Pestaña**: Escucha del evento global `window.addEventListener('storage', ...)` para actualizar reactivamente la aplicación si el usuario modifica datos en otra pestaña.
3. **Persistencia Atómica**: Las escrituras se efectúan tras cada mutación del reducer, garantizando que ninguna acción del usuario se pierda ante recargas inesperadas.

### 6.2. Motor de Migraciones (`src/services/storage/migrations.ts`)

```typescript
type MigrationStep = (oldData: any) => any;

const MIGRATIONS: Record<number, MigrationStep> = {
  // Ejemplo: migración de v1 a v2 en futuras evoluciones
  // 2: (data) => ({ ...data, tasks: data.tasks.map(t => ({ ...t, newField: 'default' })) })
};

export function migrateData(rawPayload: any): StoragePayload {
  let current = rawPayload;
  const fromVersion = current.version || 0;

  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    if (MIGRATIONS[v]) {
      current = {
        version: v,
        timestamp: new Date().toISOString(),
        data: MIGRATIONS[v](current.data),
      };
    }
  }

  current.version = CURRENT_SCHEMA_VERSION;
  return current;
}
```

### 6.3. Arquitectura de Exportación e Importación

- **Exportación**: Construye un objeto `BackupFile` con metadatos (fecha, versión del esquema, recuento de tareas), genera un Blob `application/json` y dispara una descarga invisible mediante un enlace `<a download="...">`.
- **Importación**: Lee el archivo `.json` subido mediante `FileReader`, valida con un esquema estricto (existencia de arrays `tasks`, `columns`, y propiedades requeridas de cada tarea) y previene la inyección de datos corruptos mediante validación preventiva antes de sobreescribir el estado.

### 6.4. Datos Semilla Iniciales (*Seed Data*)

La aplicación incluirá un conjunto curado de tareas iniciales que demuestran la jerarquía entre horizontes:
- **Meta Mensual**: *"Dominar desarrollo frontend moderno con React 18 y TypeScript"*.
- **Prioridad Semanal vinculada**: *"Diseñar e implementar el tablero Kanban interactivo"*.
- **Tareas Diarias vinculadas**:
  - *"Configurar pruebas unitarias con Vitest y jsdom"*.
  - *"Estilizar tarjetas con modo oscuro en Tailwind CSS"*.
  - *"Verificar accesibilidad por teclado en Drag and Drop"*.

---

## 7. Estructura de Directorios Modular

Se adopta una estructura organizada por características y responsabilidades:

```
src/
├── assets/
│   └── logo.svg
├── components/
│   ├── common/                    # Componentes UI reutilizables
│   │   ├── Badge.tsx              # Etiquetas de prioridad y horizonte
│   │   ├── Button.tsx             # Botón primario, secundario, destructivo
│   │   ├── ConfirmDialog.tsx       # Modal de confirmación para borrado/reinicio
│   │   ├── EmptyState.tsx          # Estados vacíos elegantes con ilustración SVG
│   │   ├── Input.tsx              # Inputs de texto accesibles con label
│   │   ├── Modal.tsx              # Contenedor modal con trampa de foco y aria
│   │   └── ProgressBar.tsx        # Barra de progreso visual para subtareas
│   ├── layout/                    # Estructura general de navegación
│   │   ├── Header.tsx             # Barra superior con buscador, métricas y acciones
│   │   ├── Sidebar.tsx            # Navegación entre vistas y horizontes
│   │   └── ThemeToggle.tsx        # Interruptor de Modo Claro / Modo Oscuro
│   ├── kanban/                    # Dominio del Tablero Kanban
│   │   ├── KanbanBoard.tsx        # Contenedor principal DragDropContext
│   │   ├── KanbanColumn.tsx       # Droppable de columna con encabezado y contador
│   │   ├── TaskCard.tsx           # Draggable individual con badges e indicadores
│   │   └── ColumnHeader.tsx       # Título de columna, badge de cantidad y opciones
│   ├── horizons/                  # Dominio de Planificación por Horizontes
│   │   ├── HorizonNav.tsx         # Selector de pestañas: Todos, Mensual, Semanal, Diario
│   │   ├── HorizonHierarchy.tsx   # Vista de árbol / vinculaciones de metas
│   │   └── DailyFocusView.tsx     # Vista optimizada para el día a día ("Hoy")
│   ├── tasks/                     # Gestión y formulación de tareas
│   │   ├── TaskModal.tsx          # Modal de creación y edición completa
│   │   ├── TaskForm.tsx           # Formulario controlado de campos de tarea
│   │   ├── SubtaskList.tsx        # Gestor interactivo de subtareas y checklists
│   │   └── TagPicker.tsx          # Selector de etiquetas con colores
│   ├── metrics/                   # Métricas y productividad
│   │   ├── MetricsBar.tsx         # Barra horizontal de estadísticas rápidas
│   │   └── StatCard.tsx           # Tarjeta individual de métrica (% completado, etc.)
│   └── backup/                    # Respaldo y restauración
│       └── BackupModal.tsx        # Modal para exportar/importar archivo JSON
├── context/
│   ├── TaskContext.tsx            # Proveedor de estado y despacho
│   ├── TaskReducer.ts             # Reducer puro con lógica inmutable
│   ├── ThemeContext.tsx           # Contexto de Modo Oscuro / Claro
│   └── FilterContext.tsx          # Contexto para filtros activos y búsqueda
├── hooks/
│   ├── useTasks.ts                # Facade hook para consumir tareas y operaciones
│   ├── useKanbanDnD.ts            # Hook con manejador onDragEnd optimizado
│   ├── useHorizons.ts             # Filtros y cálculo de relaciones padre-hijo
│   ├── useMetrics.ts              # Cálculo memoizado de métricas de productividad
│   ├── useKeyboardShortcuts.ts    # Atajos de teclado ('n' = nueva tarea, '/' = buscar)
│   └── useLocalStorage.ts        # Hook base para lectura/escritura reactiva
├── types/
│   ├── task.ts                    # Interfaces de Tarea, Columna, Subtarea, Prioridad
│   ├── storage.ts                 # Interfaces de Almacenamiento, Respaldo y Migración
│   └── metrics.ts                 # Tipos de métricas y estadísticas
├── services/
│   ├── storage/
│   │   ├── storageService.ts      # Abstracción segura de localStorage
│   │   ├── migrations.ts          # Pipeline de actualización de esquemas
│   │   ├── seedData.ts            # Tareas iniciales de ejemplo
│   │   └── backupService.ts       # Exportación e importación de JSON
│   └── date/
│       └── dateUtils.ts           # Funciones de horizonte, formateo e ISO
├── utils/
│   ├── cn.ts                      # Utilidad clsx + tailwind-merge
│   └── formatters.ts              # Formateo de porcentajes y textos
├── test/
│   ├── setup.ts                   # Configuración de Vitest, jest-dom y mock de storage
│   └── mocks/
│       └── mockData.ts            # Datos estables para pruebas unitarias
├── App.tsx                        # Punto de entrada de la UI y providers
├── main.tsx                       # Montaje de React DOM en #root
└── index.css                      # Directivas de Tailwind y estilos base
```

---

## 8. Configuración de Herramientas de Compilación y Pruebas

### 8.1. `package.json` Especificación

```json
{
  "name": "dashboard-personal",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@hello-pangea/dnd": "^16.6.0",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.383.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.5",
    "@testing-library/react": "^15.0.7",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.2",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

### 8.2. `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

### 8.3. `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb', // Acento Azul Real principal
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

### 8.4. `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock de localStorage con memoria volátil para pruebas aisladas
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});
```

---

## 9. Plan de Pruebas Unitarias y de Integración

Se establecen 5 suites de pruebas esenciales:

1. **`TaskReducer.test.ts`**:
   - Agregar tarea con valores por defecto y asignación de ID.
   - Actualizar título, prioridad y fecha límite de una tarea existente.
   - Eliminar tarea existente.
   - Mover tarea dentro de la misma columna (reordenamiento de índices).
   - Mover tarea hacia otra columna (cambio de status e inserción ordenada).
   - Alternar estado de subtarea y cálculo de progreso.

2. **`storageService.test.ts`**:
   - Inicializar con seed data si `localStorage` está vacío.
   - Guardar y recuperar tareas válidas.
   - Manejar errores de JSON corrupto sin provocar caídas en la app.
   - Ejecutar la función de migración cuando el `schemaVersion` es inferior al actual.

3. **`backupService.test.ts`**:
   - Validar que el archivo de exportación cumpla la estructura esperada de `BackupFile`.
   - Rechazar archivos JSON con formato inválido o campos obligatorios faltantes.
   - Restaurar datos correctamente a partir de un JSON válido.

4. **`useMetrics.test.ts`**:
   - Calcular correctamente el total de tareas por estado.
   - Calcular el porcentaje de completitud global y por horizonte.
   - Contar tareas vencidas respecto a la fecha actual.

5. **`KanbanBoard.test.tsx` (Integración UI)**:
   - Renderizar las columnas por defecto (Por hacer, En progreso, Completado).
   - Renderizar tarjetas de tareas con sus etiquetas de prioridad y horizonte.
   - Filtrar tarjetas al seleccionar un horizonte específico (ej. "Diario").

---

## 10. Matriz de Cumplimiento de Criterios de Aceptación

| Requisito / Criterio | Solución Diseñada | Verificación |
| :--- | :--- | :--- |
| **R1: Horizontes Temporales** | Tipo `HorizonType` ('monthly', 'weekly', 'daily') + campo `parentTaskId` para vinculación relacional. Vistas y filtros dedicados. | Pruebas unitarias de filtrado y visualización jerárquica en componentes. |
| **R2: Tablero Kanban Interactivo** | `@hello-pangea/dnd` con columnas dinámicas, tarjetas compactas, prioridades y barras de progreso de subtareas. | Renderizado fluido a 60 FPS con transiciones de arrastre y soporte táctil/teclado. |
| **R3: Gestión y Métricas** | Modales de creación/edición, soporte markdown/notas, etiquetas de color y hook `useMetrics` con estadísticas en tiempo real. | Cálculo verificado en suite `useMetrics.test.ts`. |
| **R4: Persistencia y Sincronización** | `storageService` con auto-guardado, control de versiones, migraciones, seed data y exportador/importador JSON. | Suite `storageService.test.ts` y prueba de export/import JSON. |
| **R5: UI/UX Pro Max** | Tailwind CSS con paleta Slate/Zinc, Azul Real `#2563EB`, modo oscuro persistente, Lucide icons, cero emojis y WCAG AAA. | Revisión visual de contrastes, estados hover sin saltos y modo oscuro nativo. |
| **Compilación y Pruebas** | Vite 5 + TypeScript estricto + Vitest + `@testing-library/react`. | `npm run build` y `npm test` limpios sin warnings. |

---

## 11. Conclusión y Recomendación para la Fase de Implementación

La arquitectura propuesta es modular, libre de dependencias innecesarias, altamente mantenible y cumple al 100% con los requerimientos técnicos y visuales establecidos. El flujo de trabajo recomendado para el implementador es:

1. **Paso 1: Inicialización del Proyecto**: Configurar Vite + React 18 + TypeScript + Tailwind CSS + Lucide Icons + `@hello-pangea/dnd` + Vitest.
2. **Paso 2: Capa de Dominio y Tipos**: Implementar `src/types/` y utilidades de fechas/estilos.
3. **Paso 3: Capa de Persistencia y Seed Data**: Implementar `storageService`, `migrations` y `seedData`.
4. **Paso 4: Capa de Estado (Context & Reducer)**: Implementar `TaskReducer` con su suite de pruebas unitarias aprobada.
5. **Paso 5: Componentes UI Base y Layout**: Implementar Navbar, Sidebar, ThemeToggle y botones comunes.
6. **Paso 6: Tablero Kanban y Drag and Drop**: Implementar `KanbanBoard`, `KanbanColumn`, `TaskCard` y `useKanbanDnD`.
7. **Paso 7: Horizontes Temporales y Métricas**: Implementar vistas de filtrado por horizonte, vinculación padre-hijo y barra de métricas.
8. **Paso 8: Modales de Tareas y Respaldo/Restauración**: Implementar `TaskModal` y `BackupModal` con validación de importación.
9. **Paso 9: Verificación Integral**: Ejecutar `npm run build` y `npm test` para asegurar cero errores y rendimiento óptimo.
