# 🚀 Personal Dashboard — Productividad, Hábitos y Planificación Inteligente

Una aplicación web progresiva (**PWA**) moderna, reactiva y offline-first para gestionar la productividad personal a través de horizontes temporales (**Mensual, Semanal y Diario**). Combina un **Tablero Kanban interactivo**, un **Panel Principal de Analítica de Cumplimiento**, un **Editor de Bloques estilo Notion** (con soporte para rutinas y tablas de entrenamiento), **sincronización en tiempo real con Firebase** e **integración bidireccional con Google Calendar**.

Diseñada bajo los principios estéticos de **UI/UX Pro Max**: paleta *Slate/Zinc* de alto contraste (WCAG AAA), acentos en Azul Real (`#2563EB`), soporte nativo para modo claro/oscuro y tipografía *Plus Jakarta Sans*.

---

## ✨ Características Principales

### 1. 📊 Panel Principal de Efectividad y Cumplimiento
- **Índice de Efectividad Global:** Anillo interactivo SVG y barra multicapa que muestran en tiempo real el porcentaje de tareas cumplidas, en progreso, pendientes en plazo y vencidas.
- **Desglose Analítico:** Métricas detalladas de tasa de éxito segmentadas por **Horizonte Temporal** (Diario, Semanal, Mensual) y por **Nivel de Prioridad** (Alta, Media, Baja).
- **Tablero Comparativo Directo:**
  - *Tareas No Cumplidas / Pendientes:* Filtros rápidos (*Todas*, *Vencidas*, *Hoy*) con alerta visual de retraso y botón de acción rápida para marcar como cumplida en 1 clic.
  - *Historial de Logros (Tareas Cumplidas):* Registro consolidado de tareas finalizadas y rutinas diarias archivadas automáticamente.

### 2. 🎯 Horizontes Temporales y Vinculación Jerárquica
- **Mensual (30 días):** Definición de metas estratégicas y objetivos macro.
- **Semanal (7 días):** Desglose de compromisos y entregables del sprint semanal.
- **Diario ("Hoy" - 24h):** Enfoque táctico en las tareas críticas del día.
- **Rollup de Progreso Jerárquico:** Vincula tareas diarias a metas semanales o mensuales (`parentTaskId`) para calcular automáticamente el porcentaje de avance de tus objetivos superiores.
- **Doble Vista:** Alterna al instante entre la **Vista de Jerarquía y Rollup** y el **Tablero Kanban**.

### 3. 📋 Tablero Kanban con Drag & Drop a 60 FPS
- Arrastra y suelta tarjetas fluidamente entre columnas y dentro de la misma columna gracias a `@hello-pangea/dnd`.
- Columnas personalizables (*Por hacer*, *En progreso*, *Completado*), límites **WIP (Work In Progress)** y contadores dinámicos.
- **Optimización Móvil de Primera Clase:** Selector táctil segmentado por columna, buscador desplegable y **Botón de Acción Flotante (FAB)** centrado para uso con una sola mano.

### 4. 📝 Editor Visual Estilo Notion & Modo Gym
Dentro del panel lateral de cada tarea (`TaskDrawer`), cuentas con un editor de bloques enriquecido que serializa automáticamente a **GitHub Flavored Markdown (GFM)**:
- **Bloques soportados:** Títulos (`H1`, `H2`, `H3`), párrafos, listas de viñetas, checklists interactivos (`todo`), bloques destacados (`callout` con iconos personalizables), divisores y vista de código Markdown crudo.
- **Tablas Interactivas estilo Notion:** Agrega o elimina filas y columnas dinámicamente desde la interfaz.
- **🏋️ Plantilla y Tabla Gym:** Botones dedicados (`+ Tabla Gym` y `⚡ Plantilla Gym`) para estructurar rutinas de entrenamiento con columnas de *Ejercicio, Series, Reps y Peso (kg)*.

### 5. 🔄 Hábitos, Rutinas Recurrentes y Auto-Reinicio Diario
- Configura tareas repetitivas (**Todos los días**, **Lunes a Viernes** o **Días personalizados**).
- **Rutina por Día de la Semana:** Asigna notas o tablas de ejercicios específicas para cada día (Lunes a Domingo).
- **Motor de Auto-Reinicio a Medianoche:** Al comenzar un nuevo día, el dashboard guarda automáticamente la tarea completada del día anterior en tu historial de logros, reinicia las subtareas y carga la rutina correspondiente al nuevo día.

### 6. ☁️ Sincronización en la Nube (Firebase) + Modo Local Híbrido
- **Google Authentication:** Inicio de sesión en 1 clic con tu cuenta de Google.
- **Cloud Firestore en Tiempo Real:** Sincronización instantánea entre múltiples dispositivos (`onSnapshot`) con indicador de estado en vivo (*Nube Sincronizada*, *Guardando...*, *Modo Local*).
- **Persistencia Local y Backups JSON:** Funciona 100% offline usando `localStorage` con versionado de esquema, migraciones automáticas, sincronización entre pestañas y exportación/importación de copias de seguridad `.json`.

### 7. 📅 Integración Bidireccional con Google Calendar
- **Exportación Automática y Manual:** Envía tus tareas con fecha u hora programada directamente a tu calendario principal de Google Calendar (creando o actualizando eventos con recordatorios).
- **Importación Inteligente:** Importa eventos próximos (hasta +30 días) desde tu Google Calendar hacia el Dashboard evitando duplicados.

### 8. ⏰ Reloj de Alertas en Tiempo Real & PWA Instalable
- **Vigilancia de Horarios (`dueTime`):** Cuando llega la hora exacta de una tarea programada para hoy, se dispara una alerta triple:
  1. **Sonido Sintetizado:** Acorde musical generado con **Web Audio API** (sin depender de archivos de audio externos).
  2. **Banner Flotante Interactivo:** Alerta en pantalla con opción de abrir la tarea o marcarla como completada inmediatamente.
  3. **Notificación Nativa:** Vía **Service Worker** en celulares (Android / iOS PWA) con vibración, o **Notification API** en escritorio.
- **Progressive Web App (PWA):** Incluye `manifest.json` y Service Worker (`sw.js`) para instalar la aplicación en tu celular o PC como una app nativa.

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnologías |
| :--- | :--- |
| **Frontend Core** | React 18, TypeScript 5, Vite 5 |
| **Estilos y UI/UX** | Tailwind CSS 3, Lucide React (Iconos SVG), `clsx`, `tailwind-merge` |
| **Drag & Drop** | `@hello-pangea/dnd` |
| **Backend & Cloud** | Google Firebase v13 (Firebase Auth + Cloud Firestore) |
| **Integraciones API** | Google Calendar REST API v3 (OAuth 2.0 Scope `calendar.events`) |
| **Fechas y Audio** | `date-fns`, Web Audio API, Notifications API + Service Workers |
| **Testing & QA** | Vitest, React Testing Library, JSDOM (Suite Unitaria, E2E y Stress Testing) |

---

## 📂 Arquitectura del Proyecto

```text
.
├── public/
│   ├── icon.svg                         # Icono vectorial de la app
│   ├── manifest.json                    # Manifiesto Web App (PWA)
│   └── sw.js                            # Service Worker para soporte PWA y notificaciones móviles
├── src/
│   ├── App.tsx                          # Cabecera, reloj de alertas, sync Calendar y layout raíz
│   ├── main.tsx                         # Punto de entrada y registro del Service Worker
│   ├── types/
│   │   └── domain.ts                    # Contratos TypeScript (Task, Horizon, KanbanColumn, Metrics)
│   ├── constants/
│   │   ├── initialData.ts               # Datos semilla (Seed Data) iniciales
│   │   └── theme.ts                     # Tokens visuales de horizontes y prioridades
│   ├── context/
│   │   ├── AuthContext.tsx              # Estado de sesión con Google y estado de sincronización Cloud
│   │   ├── TaskContext.tsx              # Proveedor de tareas, persistencia híbrida (Local + Firestore)
│   │   ├── taskReducer.ts               # Reducer puro inmutable para acciones del tablero
│   │   └── ThemeContext.tsx             # Proveedor de tema Claro / Oscuro
│   ├── services/
│   │   ├── firebase.ts                  # Inicialización de Firebase Auth, Firestore y tokens OAuth
│   │   ├── googleCalendarService.ts     # Cliente REST para Google Calendar API v3 (Import/Export)
│   │   ├── storageService.ts            # Persistencia en localStorage e importación/exportación JSON
│   │   └── migrationService.ts          # Validación y migración de esquemas de datos
│   ├── utils/
│   │   ├── metrics.ts                   # Motor de cálculo de métricas y rollup jerárquico
│   │   ├── dateUtils.ts                 # Utilidades de fechas en zona horaria local
│   │   └── cn.ts                        # Helper para fusión condicional de clases Tailwind
│   └── components/
│       ├── horizons/
│       │   ├── HorizonView.tsx          # Conmutador de vistas (Panel Principal, Mensual, Semanal, Diario)
│       │   ├── PrincipalOverview.tsx    # Dashboard analítico de cumplimiento vs. pendientes
│       │   ├── MonthlyGoals.tsx         # Vista jerárquica de objetivos mensuales
│       │   └── WeeklyCommitments.tsx    # Vista jerárquica de compromisos semanales
│       ├── kanban/
│       │   ├── KanbanBoard.tsx          # Tablero Drag & Drop y selector móvil de columnas
│       │   ├── KanbanColumn.tsx         # Columna Kanban con límites WIP
│       │   └── TaskCard.tsx             # Tarjeta de tarea con badges de prioridad, hora y progreso
│       ├── task/
│       │   ├── TaskDrawer.tsx           # Panel deslizante de creación/edición y rutinas recurrentes
│       │   ├── NotionDescriptionEditor.tsx # Editor por bloques estilo Notion y tablas Gym
│       │   ├── SubtaskList.tsx          # Checklist interactivo de subtareas
│       │   └── TagSelector.tsx          # Selector de etiquetas por color
│       ├── layout/
│       │   ├── HorizonNav.tsx           # Barra de navegación por horizontes temporales
│       │   └── QuickStats.tsx           # Cinta Bento de métricas rápidas
│       └── settings/
│           └── DataManagementModal.tsx  # Modal de copias de seguridad JSON y restablecimiento
└── tests/                               # Suite de pruebas E2E por niveles (Tiers 1-4)
```

---

## 💻 Instalación y Uso Local

### 1. Clonar e instalar dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno (Opcional para Nube y Google Calendar)
La aplicación funciona de inmediato en **Modo Local** sin configuración adicional. Si deseas habilitar **Firebase (Auth + Firestore)** y **Google Calendar**, copia el archivo `.env.example` a `.env` (o `.env.local`) y coloca tus credenciales de Firebase:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

> **Nota para Google Calendar:** Asegúrate de habilitar la **Google Calendar API** en tu consola de Google Cloud vinculada al proyecto de Firebase y de agregar tu dominio en *Authentication -> Settings -> Authorized domains*.

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre tu navegador en `http://localhost:5173`.

### 4. Ejecutar pruebas automatizadas y verificación de tipos
```bash
# Ejecutar toda la suite de pruebas con Vitest
npm test

# Modo observador interactivo
npm run test:watch

# Verificar tipado estricto de TypeScript
npm run typecheck
```

### 5. Compilar para Producción
```bash
npm run build
```
Generará la versión optimizada en la carpeta `dist/`, lista para desplegar en **Netlify** (configuración incluida en `netlify.toml`) o cualquier hosting estático.
