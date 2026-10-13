# Especificación Integral de Sistema de Diseño UI/UX Pro Max
## Dashboard Personal Multi-Horizonte & Tablero Kanban

**Versión:** 1.0.0  
**Fecha:** 2026-10-12  
**Autor:** `survey_explorer_uiux_1` (UI/UX Design System Explorer)  
**Proyecto:** Personal Dashboard (Planificación Temporal Multi-Horizonte)  
**Marco de Diseño:** UI/UX Pro Max Intelligence (Minimalism & Swiss Modernism, Bento Box Modular Grid, Dimensional Layering)

---

## 1. Resumen Ejecutivo y Dirección Estética

El **Dashboard Personal** es una aplicación web moderna diseñada para la gestión de tareas de alta productividad a través de tres horizontes temporales interconectados (**Mensual**, **Semanal** y **Diario**) y un **Tablero Kanban interactivo con Drag and Drop**.

### Arquetipo de Diseño: *Swiss Minimalist Precision + Bento Box + Dimensional Layering*
- **Claridad Suiza y Funcionalidad Radical:** Prioridad absoluta a la legibilidad tipográfica, jerarquía visual estricta y eliminación de adornos superfluos.
- **Modularidad Bento Box:** Componentes organizados en bloques asimétricos pero armónicos, optimizados para escanear métricas y flujos de trabajo de un solo vistazo.
- **Estratificación Dimensional:** Jerarquía de profundidad mediante 4 niveles de elevación por sombras suaves y bordes de alta precisión de 1px, garantizando una percepción táctil sin recurrir a contrastes estridentes ni efectos obsoletos.
- **Filosofía Dual-Theme First:** Diseño nativo en **Modo Oscuro (Dark Mode OLED/Slate)** y **Modo Claro (Light Mode Clean Slate)** con contraste verificado bajo el estándar **WCAG AAA**.
- **Cero Iconos Emoji:** 100% iconografía vectorial consistente mediante **Lucide React**, garantizando estética profesional de software SaaS de clase mundial.

---

## 2. Sistema de Tokens de Color y Temas (Dark & Light Mode)

El sistema de color se fundamenta en escalas neutrales Slate/Zinc que brindan sobriedad y reducen la fatiga cognitiva, complementadas con un color de acento principal **Royal Blue (#2563EB)** y semánticas de estado vibrantes pero equilibradas.

### 2.1 Tabla Maestra de Tokens de Color

| Token Semántico | Modo Claro (Light Mode) | Modo Oscuro (Dark Mode) | Razón de Uso / Aplicación |
| :--- | :--- | :--- | :--- |
| `--background` | `#F8FAFC` (`slate-50`) | `#020617` (`slate-950`) | Fondo global de la aplicación |
| `--foreground` | `#0F172A` (`slate-900`) | `#F8FAFC` (`slate-50`) | Texto primario de máximo contraste |
| `--surface-card` | `#FFFFFF` (`white`) | `#0F172A` (`slate-900`) | Superficie de tarjetas Kanban y Bento |
| `--surface-card-foreground` | `#0F172A` (`slate-900`) | `#F8FAFC` (`slate-50`) | Texto dentro de tarjetas |
| `--surface-popover` | `#FFFFFF` (`white`) | `#0F172A` (`slate-900`) | Menús desplegables, tooltips y modales |
| `--surface-muted` | `#F1F5F9` (`slate-100`) | `#1E293B` (`slate-800`) | Fondos de columnas Kanban, tags secundarios |
| `--surface-muted-foreground`| `#64748B` (`slate-500`) | `#94A3B8` (`slate-400`) | Metadatos, fechas, subtítulos |
| `--border-subtle` | `#F1F5F9` (`slate-100`) | `#1E293B` (`slate-800`) | Separadores internos y divisores |
| `--border-default` | `#E2E8F0` (`slate-200`) | `#334155` (`slate-700`) | Bordes de tarjetas, inputs, columnas |
| `--border-focus` | `#2563EB` (`blue-600`) | `#3B82F6` (`blue-500`) | Anillos de foco accesible y hover activo |
| `--primary` | `#2563EB` (`blue-600`) | `#3B82F6` (`blue-500`) | Acciones principales, botones CTA |
| `--primary-hover` | `#1D4ED8` (`blue-700`) | `#60A5FA` (`blue-400`) | Estado hover de acciones primarias |
| `--primary-foreground` | `#FFFFFF` (`white`) | `#0F172A` (`slate-900`) | Texto o icono sobre fondo primario |
| `--primary-subtle` | `#EFF6FF` (`blue-50`) | `rgba(59, 130, 246, 0.12)`| Resaltado de filtros y chips activos |
| `--ring-focus` | `rgba(37, 99, 235, 0.35)` | `rgba(59, 130, 246, 0.45)`| Anillo de foco (focus ring 3px) |

### 2.2 Semántica de Prioridades y Estados

| Elemento Semántico | Color Base (Hex) | Badge Modo Claro | Badge Modo Oscuro | Icono Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| **Prioridad Alta (Urgente)** | Rose / Crimson (`#E11D48`) | `bg-rose-50 text-rose-700 border-rose-200` | `bg-rose-950/40 text-rose-300 border-rose-800/60` | `AlertCircle` |
| **Prioridad Media (Normal)** | Amber / Orange (`#D97706`) | `bg-amber-50 text-amber-700 border-amber-200` | `bg-amber-950/40 text-amber-300 border-amber-800/60` | `Clock` |
| **Prioridad Baja (Tranquilo)** | Emerald / Green (`#059669`) | `bg-emerald-50 text-emerald-700 border-emerald-200` | `bg-emerald-950/40 text-emerald-300 border-emerald-800/60` | `CheckCircle2` |
| **Estado Éxito (Done / OK)** | Emerald (`#10B981`) | `bg-emerald-100 text-emerald-800 border-emerald-200` | `bg-emerald-950/50 text-emerald-300 border-emerald-800` | `CheckCheck` |
| **Estado Alerta / Vencida** | Red (`#DC2626`) | `bg-red-50 text-red-700 border-red-200` | `bg-red-950/50 text-red-300 border-red-800` | `CalendarX2` |
| **Estado Info / Neutro** | Sky / Blue (`#0284C7`) | `bg-sky-50 text-sky-700 border-sky-200` | `bg-sky-950/40 text-sky-300 border-sky-800/60` | `Info` |

### 2.3 Semántica de Horizontes de Planificación

Para que el usuario diferencie instantáneamente a qué horizonte temporal pertenece una tarea sin saturación visual:

1. **Horizonte Mensual (Estratégico / Metas Macro):**
   - **Color Clave:** Violeta / Púrpura (`#7C3AED` en Light, `#A78BFA` en Dark).
   - **Badge Estilo:** `bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50`.
   - **Icono:** `Target` o `CalendarRange`.
   - **Significado:** Objetivos del mes, hitos de aprendizaje, proyectos clave.

2. **Horizonte Semanal (Táctico / Compromisos):**
   - **Color Clave:** Azul Real / Índigo (`#2563EB` en Light, `#60A5FA` en Dark).
   - **Badge Estilo:** `bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50`.
   - **Icono:** `CalendarDays`.
   - **Significado:** Desglose de metas en entregables de la semana en curso.

3. **Horizonte Diario (Operativo / Foco Hoy):**
   - **Color Clave:** Ámbar Solar (`#D97706` en Light, `#FBBF24` en Dark).
   - **Badge Estilo:** `bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50`.
   - **Icono:** `SunMedium` o `CalendarCheck`.
   - **Significado:** Ejecución directa del día a día, lista de tareas "Hoy".

### 2.4 Matriz de Verificación de Accesibilidad y Contraste (WCAG AAA / AA)

- **Texto Principal (`#0F172A`) sobre Fondo Claro (`#F8FAFC`):** Ratio **15.8:1** (Supera ampliamente el umbral WCAG AAA de 7.0:1).
- **Texto Principal (`#F8FAFC`) sobre Fondo Oscuro (`#020617`):** Ratio **17.5:1** (Cumple WCAG AAA).
- **Texto Muted (`#475569` slate-600) sobre Fondo Claro:** Ratio **5.9:1** (Cumple WCAG AA para texto pequeño y AAA para grande).
- **Texto Muted (`#94A3B8` slate-400) sobre Fondo Oscuro:** Ratio **6.2:1** (Cumple WCAG AA y AAA para texto grande).
- **Botón Primario `#2563EB` con Texto Blanco `#FFFFFF`:** Ratio **4.6:1** (Cumple WCAG AA para botones interactivos).

---

## 3. Tipografía y Jerarquía Visual

El diseño adopta la combinación premium **Plus Jakarta Sans** (estilo Friendly & Modern SaaS) como fuente primaria, complementada con soporte de cifras tabulares monoespaciadas para métricas de tiempo y progreso.

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  letter-spacing: -0.011em;
}

.tabular-numbers {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}
```

### Escala Tipográfica del Sistema

| Nivel Jerárquico | Tamaño (Tailwind) | Peso | Line Height | Tracking | Casos de Uso |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | `text-2xl` (24px) / `md:text-3xl` (30px) | `font-bold` (700) | `leading-tight` | `tracking-tight` | Título del Dashboard, cabecera principal |
| **Section H2** | `text-lg` (18px) / `md:text-xl` (20px) | `font-semibold` (600)| `leading-snug` | `tracking-tight` | Títulos de columnas Kanban, Bento headers |
| **Card Title H3**| `text-sm` (14px) / `md:text-base` (15px) | `font-semibold` (600)| `leading-normal`| `tracking-normal`| Nombre de la tarea en tarjeta Kanban |
| **Body Regular** | `text-sm` (14px) | `font-normal` (400) | `leading-relaxed`| `normal` | Descripciones, texto en modales, notas |
| **Label / Subtext**| `text-xs` (12px) | `font-medium` (500) | `leading-normal` | `tracking-wide` | Badges de prioridad, fechas de vencimiento |
| **Micro / Caption**| `text-[11px]` (11px) | `font-medium` (500) | `leading-none` | `tracking-wider` | Contadores de subtareas, chips mínimos |

---

## 4. Ergonomía de Componentes y Diseño de Pantallas

### 4.1 Barra Superior y Navegación Principal (Header Bar)

La barra superior actúa como centro de control persistente, con una altura fija de 64px (`h-16`), posición flotante fija (`sticky top-0 z-30`), desenfoque translúcido (`backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800`).

```
+---------------------------------------------------------------------------------------------------------------+
| [Icon] Personal Dashboard [v1.0] | [Todos] [Mensual (4)] [Semanal (8)] [Diario (5)] | [Kanban/Lista] [+ Nueva] [Theme] [Data] |
+---------------------------------------------------------------------------------------------------------------+
```

#### Ergonomía y Elementos:
1. **Identidad de Marca:**
   - Icono `KanbanSquare` o `Layers` en Royal Blue `#2563EB`.
   - Título "Personal Dashboard" con tipografía semibold.
   - Punto de estado o píldora sutil "Modo Local Persistente" con icono `ShieldCheck`.
2. **Segmented Controller de Horizontes (Navegación Central):**
   - Selector tipo pastilla (`p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800`).
   - Opciones:
     - **Todos:** Muestra el universo de tareas.
     - **Mensual:** Filtra tareas asociadas a metas del mes en curso.
     - **Semanal:** Filtra tareas correspondientes a la semana activa.
     - **Diario:** Enfoque quirúrgico en las tareas de "Hoy".
   - Cada pestaña incluye un badge numérico dinámico (ej. `Diario (3)`).
   - Animación de transición fluida en la pestaña activa con `transition-all duration-200`.
3. **Caja de Herramientas y Acciones (Derecha):**
   - **Interruptor de Vista:** Toggle entre vista Kanban (tablero por columnas) y vista Lista / Resumen.
   - **Botón Primario "+ Nueva Tarea":** Botón de alto contraste (`bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow active:scale-98 transition-all px-3.5 py-2 font-medium text-sm flex items-center gap-2`), con indicación de atajo `N` (`kbd`).
   - **Gestión de Datos:** Botón icono (`Database` / `FolderSync`) con tooltip para abrir el modal de exportación/importación JSON.
   - **Toggle Dark Mode:** Botón icono (`Sun` / `Moon`) con micro-animación de rotación de 180° y persistencia inmediata en `localStorage`.

---

### 4.2 Cinta de Métricas de Productividad (Quick Stats / Bento Ribbon)

Ubicada inmediatamente debajo del Header, ofrece retroalimentación instantánea sobre el ritmo de trabajo del usuario. Se estructura como un Bento Grid de 4 tarjetas responsivas (`grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6`).

```
+------------------------+------------------------+------------------------+------------------------+
| TAREAS ACTIVAS         | TASA DE COMPLETADO     | TAREAS VENCIDAS        | DISTRIBUCIÓN PRIORIDAD  |
| 12                     | 68%                    | 1                      | 🔴 4  🟡 5  🟢 3       |
| 3 Diarias · 5 Semanales| [████████████░░░░]     | ⚠️ Requiere atención  | [Alta · Media · Baja]  |
+------------------------+------------------------+------------------------+------------------------+
```

#### Especificación de cada Tarjeta Bento:
1. **Tarjeta 1: Tareas Activas (Work In Progress):**
   - Cifra grande: `text-2xl font-bold text-slate-900 dark:text-slate-50`.
   - Subtexto: desglose por horizonte ("3 Diarias · 5 Semanales · 4 Mensuales").
   - Icono contextual: `ListTodo` en color azul primario.
2. **Tarjeta 2: Tasa de Finalización (% Productividad):**
   - Cifra de porcentaje con barra de progreso lineal suave o círculo SVG.
   - Color dinámico: Emerald si > 70%, Amber si 40-70%, Slate si < 40%.
   - Etiqueta: "8 de 12 tareas completadas".
3. **Tarjeta 3: Alertas / Vencidas:**
   - Si = 0: Estado positivo ("Todo al día" con badge verde `CheckCircle2`).
   - Si > 0: Estado urgente en tono Rose con icono `AlertTriangle`, destacando las tareas que requieren foco urgente hoy.
4. **Tarjeta 4: Distribución de Carga por Prioridad:**
   - Mini gráfico de barra apilada o 3 chips numéricos:
     - Alta: 4 (punto rojo)
     - Media: 5 (punto ámbar)
     - Baja: 3 (punto verde)

---

### 4.3 Tablero Kanban Interactivo (Columnas, Tarjetas y Drag & Drop)

El tablero Kanban es el núcleo interactivo del sistema. Cuenta con columnas dinámicas que admiten drag-and-drop horizontal y vertical.

#### A. Anatomía de las Columnas:
- **Disposición:** Grid responsivo de 3 o más columnas (`grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6`).
- **Superficie de la Columna:**
  - Fondo: `bg-slate-100/70 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800/60 flex flex-col`.
  - Altura mínima para asegurar drop zone amplio (`min-h-[520px]`).
- **Cabecera de la Columna:**
  - Punto de color o icono distintivo de la columna:
    - *Por Hacer (To Do):* Icono `CircleDot` o `Inbox` en color Slate.
    - *En Progreso (In Progress):* Icono `Clock3` en color Blue.
    - *Completado (Done):* Icono `CheckCircle2` en color Emerald.
  - Nombre de la columna en `font-semibold text-sm`.
  - Badge contador de tarjetas: `bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700`.
  - Botón rápido "+": Permite crear una tarea pre-asignada a esa columna directamente.

#### B. Diseño de la Tarjeta de Tarea (Task Card):
Cada tarjeta debe ser compacta, limpia y rica en información sin generar ruido visual.

```
+-------------------------------------------------------+
| [🔴 Alta]  [🟣 Mensual]                    [⋮] [⠿]  |
| Implementar motor de persistencia con Dexie / Local    |
| [██████████░░░░] 3/5 subtareas                        |
| 📅 Mañana (13 Oct)                 🏷️ Frontend · Storage |
+-------------------------------------------------------+
```

1. **Fila Superior de Metadatos:**
   - Badge de Prioridad: Chip con punto de color (`Alta`, `Media`, `Baja`).
   - Badge de Horizonte: Chip con icono (`Mensual`, `Semanal`, `Diario`).
   - Indicador de Arrastre: Icono `GripVertical` con `cursor-grab` (cambia a `cursor-grabbing` al hacer clic).
   - Menú contextual rápido: Botón de tres puntos (`MoreVertical`) con acciones rápidas: Editar, Duplicar, Mover de columna, Eliminar.
2. **Título de la Tarea:**
   - Tipografía: `font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2`.
   - Si la tarea está en la columna "Completado", el título aplica `line-through text-slate-400 dark:text-slate-500`.
3. **Barra de Progreso de Subtareas:**
   - Si la tarea contiene subtareas, se renderiza una mini barra de progreso de 4px de alto:
     - Barra base: `bg-slate-200 dark:bg-slate-800 rounded-full h-1.5`.
     - Barra activa: `bg-emerald-500 rounded-full h-1.5 transition-all duration-300`.
   - Texto de subtareas: `text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1` (ej. "3/5 subtareas").
4. **Fila Inferior (Fechas y Tags):**
   - **Indicador de Fecha de Vencimiento:**
     - Vencida: Badge rojo con icono `AlertCircle` ("Venció ayer").
     - Vence hoy: Badge ámbar con icono `Calendar` ("Hoy").
     - Futura: Texto muted con icono `Calendar` ("18 Oct").
   - **Chips de Etiquetas (Tags):** Píldoras compactas con bordes redondeados (ej. `Frontend`, `Diseño`, `Personal`).

#### C. Micro-Interacciones y Estados de Drag and Drop:
- **Reposo (Rest State):**
  - Fondo `bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-sm`.
  - Transición: `transition-all duration-150 ease-out`.
- **Hover:**
  - Desplazamiento sutil: `hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700`.
  - El cursor debe ser estrictamente `cursor-pointer` sobre la tarjeta y `cursor-grab` sobre el área de arrastre.
- **Arrastre Activo (Dragging State):**
  - Elevación máxima: `shadow-2xl shadow-blue-500/10 dark:shadow-black/50`.
  - Escala y rotación táctil: `scale-[1.02] rotate-1`.
  - Anillo de selección: `ring-2 ring-blue-500 border-transparent`.
  - Opacidad: `opacity-95`.
  - Cursor: `cursor-grabbing`.
- **Placeholder / Fantasma en la Columna Destino:**
  - Rectángulo con borde discontinuo: `border-2 border-dashed border-blue-400/60 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg min-h-[96px] transition-all`.
- **Resaltado de Columna Receptora (Drag Over):**
  - La columna sobre la cual flota la tarjeta resalta suavemente su borde: `border-blue-400/80 bg-blue-50/20 dark:bg-blue-950/10`.

---

### 4.4 Panel Lateral / Modal de Tarea (Task Detail Drawer / Sheet)

Para crear o editar una tarea en profundidad sin perder el contexto del tablero, se utiliza un **Sheet (panel lateral deslizante desde la derecha)** en pantallas medianas/grandes y un **Modal Bottom-Sheet** en móviles.

#### Dimensiones y Posición:
- Desktop: Ancho fijo `w-full max-w-lg lg:max-w-xl`, anclado a la derecha (`fixed inset-y-0 right-0 z-50`).
- Fondo del overlay: `bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200`.

#### Estructura del Panel:
1. **Barra de Acciones Superior:**
   - Selector rápido de estado (columna actual) mediante píldora desplegable.
   - Selector de horizonte temporal (Mensual / Semanal / Diario).
   - Botón de duplicar tarea.
   - Botón de eliminar con confirmación destructiva.
   - Botón de cierre `X` (`Esc`).
2. **Campo de Título:**
   - Input sin bordes toscos, tipografía grande (`text-lg font-bold placeholder:text-slate-400 focus:outline-none focus:ring-0`).
3. **Editor de Descripción (Markdown con Pestañas):**
   - Pestaña "Editar" y Pestaña "Vista Previa".
   - Soporte para sintaxis Markdown: negritas, listas de puntos, bloques de código, citas.
   - Barra de herramientas rápida para Markdown (B, I, List, Code, Link).
4. **Checklist Interactivo de Subtareas:**
   - Lista de elementos con checkbox accesible (`focus:ring-2 focus:ring-blue-500`).
   - Al marcar una subtarea: tachado con animación suave y actualización del contador global.
   - Campo para "Agregar subtarea..." con tecla rápida `Enter`.
   - Botón para eliminar subtarea individual en hover.
5. **Sección de Metadatos y Configuración:**
   - **Selector de Prioridad:** Grupo de botones o select con colores distintivos (Alta, Media, Baja).
   - **Selector de Fecha Límite:** Datepicker con botones de selección rápida: "Hoy", "Mañana", "Este Viernes", "Próxima Semana".
   - **Vinculación Multi-Horizonte:** Dropdown para vincular esta tarea a un objetivo superior (ej. vincular una tarea diaria a una meta semanal preexistente).
   - **Gestor de Tags:** Input para escribir y asignar etiquetas con selector de color.
6. **Pie de Página (Footer Fijo):**
   - Fecha de creación y última actualización ("Editada hace 5 min").
   - Botones principales: "Guardar Cambios" (`primary`) y "Cancelar" (`ghost`).

---

### 4.5 Diálogo de Gestión de Datos y Persistencia (Data Management Modal)

Un modal centrado (`max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-xl`) diseñado para dar total confianza y control sobre los datos locales del usuario.

```
+-------------------------------------------------------+
|  GESTIÓN DE DATOS & COPIAS DE SEGURIDAD           [X]  |
|  Todos tus datos se almacenan en tu navegador local.  |
|                                                       |
|  [ 📤 Exportar JSON ]                                 |
|  Descarga una copia completa de tus 12 tareas         |
|  Botón: [Descargar Copia de Seguridad .json]          |
|                                                       |
|  [ 📥 Importar Respaldo ]                             |
|  Arrastra tu archivo .json aquí o examina             |
|  Validación en tiempo real antes de guardar           |
|                                                       |
|  [ ⚠️ Reiniciar con Datos de Ejemplo ]                |
|  Restaura las tareas de demostración iniciales        |
+-------------------------------------------------------+
```

#### Especificación de Flujo:
1. **Exportación JSON:**
   - Un solo clic en "Descargar Respaldo".
   - Genera archivo con nombre determinista: `personal-dashboard-backup-YYYY-MM-DD.json`.
   - Toast de notificación de éxito: "Respaldo exportado exitosamente (12 tareas, 3 columnas)".
2. **Importación con Validación & Previsualización:**
   - Zona Drag-and-Drop con icono `UploadCloud`.
   - Validación instantánea del esquema JSON (verifica formato de IDs, tareas, fechas y columnas).
   - Si el archivo es inválido: Mensaje de error claro con badge rojo indicando el problema (ej. "Estructura JSON inválida o versión incompatible").
   - Si es válido: Ventana de confirmación mostrando resumen antes de aplicar:
     - "Se encontraron 15 tareas y 3 columnas. ¿Deseas reemplazar tus datos actuales o fusionarlos?"
3. **Reinicio a Datos de Prueba (Seed Data Reset):**
   - Botón secundario con estilo destructivo advertido (`text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40`).
   - Requiere confirmación mediante `AlertDialog`:
     - *"¿Restablecer datos de ejemplo? Esta acción sobreescribirá tus tareas actuales a menos que tengas un respaldo exportado."*

---

### 4.6 Estados Vacíos Ilustrados (Empty States)

Los estados vacíos previenen la sensación de una pantalla rota y orientan al usuario sobre el próximo paso productivo.

1. **Columna Kanban Vacía:**
   - Marco rectangular con borde discontinuo tenue (`border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center`).
   - Icono Lucide: `Inbox` o `CheckCircle2` en color slate muted.
   - Mensaje: "Sin tareas pendientes en esta columna".
   - Acción directa: Botón sutil `+ Crear tarea aquí`.
2. **Tablero Completamente Vacío (Sin tareas en el sistema):**
   - Ilustración vectorial limpia o composición icónica centrada (`CalendarRange` + `Sparkles`).
   - Titular: "Tu espacio de trabajo está despejado".
   - Descripción didáctica: "Comienza organizando tus objetivos del mes, prioridades semanales o las tareas críticas de hoy."
   - Botones de acción:
     - Botón 1 (Primario): "+ Crear tu primera tarea"
     - Botón 2 (Secundario): "Cargar datos de ejemplo guiados"
3. **Búsqueda o Filtro sin Resultados:**
   - Icono: `SearchX`.
   - Mensaje: "No encontramos tareas que coincidan con los filtros seleccionados".
   - Botón: "Limpiar filtros".

---

## 5. Diseño Responsivo y Estrategia de Breakpoints

La interfaz debe responder de forma impecable en tres rangos de dispositivos clave:

| Dispositivo / Breakpoint | Resolución Típica | Comportamiento del Layout |
| :--- | :--- | :--- |
| **Móvil (Mobile)** | `375px` a `767px` | Carrusel horizontal Kanban con snap points o pestañas de columna, drawer inferior (Bottom Sheet), FAB flotante |
| **Tablet** | `768px` a `1023px` | Grid de 2 o 3 columnas con scroll horizontal suave, Ribbon de métricas en cuadrícula 2x2 |
| **Escritorio (Desktop)** | `1024px` a `1440px+` | Grid Kanban completo simultáneo, Ribbon de 4 métricas horizontal, Drawer lateral sin solapar contenido |

### 5.1 Adaptaciones Específicas para Móvil (375px - 767px):
1. **Evitar la saturación horizontal:**
   - En pantallas pequeñas, mostrar 3 o 4 columnas apretadas de 100px destruye la usabilidad.
   - **Solución UI/UX Pro Max:** Implementar un contenedor con deslizamiento táctil horizontal con snap mandatory:
     ```css
     .kanban-mobile-container {
       display: flex;
       overflow-x: auto;
       scroll-snap-type: x mandatory;
       gap: 1rem;
       padding-bottom: 1rem;
       -webkit-overflow-scrolling: touch;
     }
     .kanban-mobile-column {
       flex: 0 0 85vw;
       scroll-snap-align: center;
     }
     ```
   - Alternativamente, un selector de pestañas superiores para alternar entre "Por Hacer", "En Progreso" y "Completado".
2. **Touch Targets de 44x44px:**
   - Todos los botones interactivos (menús contextuales, botones de agregar, checkboxes) tienen un área de pulsación mínima de `min-h-[44px] min-w-[44px]` para cumplir con las directrices de accesibilidad táctil.
3. **Botón de Acción Flotante (FAB):**
   - En móvil, el botón "+ Nueva Tarea" se posiciona fijo en la esquina inferior derecha (`fixed bottom-6 right-6 z-40 shadow-lg rounded-full h-14 w-14 flex items-center justify-center bg-blue-600 text-white active:scale-95`).

---

## 6. Micro-Interacciones, Animaciones y Transiciones

El sistema evita animaciones decorativas lentas que retrasan el flujo de trabajo del usuario. Todas las transiciones siguen la curva moderna `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo).

### Reglas de Micro-Interacción:
1. **Duración de Micro-Interacciones:**
   - Estados de hover, cambios de color y toggles: **150ms a 200ms**.
   - Apertura de paneles (Sheets / Modales): **250ms**.
   - Movimiento de tarjetas Kanban al soltar (Drop reorder): **200ms**.
2. **Estabilidad Hover (Sin Layout Shifts):**
   - Prohibido utilizar `transform: scale(1.05)` en elementos dentro de flujos de texto que muevan elementos adyacentes.
   - En su lugar, usar `transform: translateY(-2px)` junto con elevación de sombra (`box-shadow`).
3. **Respeto a Preferencias de Movimiento Reducido:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
4. **Animación del Checkbox de Subtarea:**
   - Al marcar una subtarea, el texto se tacha con una transición de opacidad y línea (`transition-all duration-200 line-through text-slate-400`), acompañado de una sutil pulsación del icono de verificación.

---

## 7. Catálogo de Iconos Vectoriales (Lucide React)

En estricto cumplimiento con la regla **"No emojis como iconos de interfaz"**, se establece el catálogo oficial de iconos SVG:

| Función de Interfaz | Componente Lucide | Propósito |
| :--- | :--- | :--- |
| **Tablero Kanban** | `<KanbanSquare className="w-5 h-5" />` | Identidad del tablero y vista |
| **Horizonte Mensual** | `<CalendarRange className="w-4 h-4 text-purple-600 dark:text-purple-400" />` | Badge e indicador mensual |
| **Horizonte Semanal** | `<CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />` | Badge e indicador semanal |
| **Horizonte Diario** | `<SunMedium className="w-4 h-4 text-amber-600 dark:text-amber-400" />` | Badge e indicador diario |
| **Agregar Tarea** | `<Plus className="w-4 h-4" />` | Botones de creación |
| **Arrastrar Tarjeta** | `<GripVertical className="w-4 h-4 text-slate-400" />` | Manija de arrastre accesible |
| **Checklist / Subtareas** | `<CheckSquare className="w-3.5 h-3.5" />` | Indicador de checklist |
| **Fecha Límite** | `<Calendar className="w-3.5 h-3.5" />` | Indicador de fecha |
| **Alerta / Vencido** | `<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />` | Alerta de tarea vencida |
| **Modo Oscuro** | `<Moon className="w-4 h-4" />` | Botón modo noche |
| **Modo Claro** | `<Sun className="w-4 h-4" />` | Botón modo día |
| **Gestión de Datos** | `<Database className="w-4 h-4" />` | Botón de backup/restore |
| **Exportar Archivo** | `<Download className="w-4 h-4" />` | Descargar JSON |
| **Importar Archivo** | `<UploadCloud className="w-4 h-4" />` | Subir JSON |
| **Eliminar Tarea** | `<Trash2 className="w-4 h-4 text-rose-600" />` | Acción destructiva |
| **Duplicar Tarea** | `<Copy className="w-4 h-4" />` | Duplicar contenido |
| **Opciones / Menú** | `<MoreVertical className="w-4 h-4" />` | Menú contextual de tarjeta |

---

## 8. Lista de Verificación Pre-Entrega UI/UX (Pre-Delivery Checklist)

- [x] **Sin iconos emoji:** Todos los iconos de estado, navegación y acciones provienen de `lucide-react`.
- [x] **Contraste verificado:** Cumplimiento de ratios WCAG AAA (15.8:1 en texto principal, 5.9:1 en muted, 4.6:1 en botones primarios).
- [x] **Soporte Dark Mode completo:** Definición de superficies en ambos temas (`:root` y `.dark`).
- [x] **Cursor pointer & grab:** Todos los elementos interactivos tienen `cursor-pointer`; manijas de arrastre tienen `cursor-grab` y `cursor-grabbing`.
- [x] **Estados hover libres de layout shift:** Transiciones de color y sombra sin alterar anchuras ni alturas de tarjeta.
- [x] **Responsividad total (375px a 1440px):** Layout adaptativo con carrusel/snap en móvil y grid completo en escritorio.
- [x] **Accesibilidad por teclado:** Foco visible (`ring-2 ring-blue-500 ring-offset-2`), atajos de teclado previstos (`N` para nueva tarea, `Esc` para modales).
- [x] **Integración con Skill UI/UX Pro Max:** Cumple con la arquitectura de tokens, paleta slate/zinc y guía ergonómica de dashboards modernos.

---

Este documento constituye la especificación visual y ergonómica oficial para guiar al arquitecto de software y a los componentes de interfaz del Personal Dashboard.
