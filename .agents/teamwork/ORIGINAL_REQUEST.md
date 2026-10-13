# Original User Request

## 2026-10-12T16:55:51Z

Aplicación web moderna y responsive de Dashboard Personal para la planificación y seguimiento integral de tareas organizadas en horizontes mensuales, semanales y diarios, con un tablero Kanban interactivo con drag-and-drop y persistencia local en el navegador.

Working directory: c:\Users\mateo\OneDrive\Documentos\Proyectos\Dashboar Personal
Integrity mode: development

## Requirements

### R1. Sistema de Planificación por Horizontes Temporales
- Proporcionar vistas dedicadas y filtrado para tareas en tres niveles:
  1. **Mensual:** Objetivos y metas de alto nivel del mes con calendario/lista de hitos.
  2. **Semanal:** Desglose de prioridades y compromisos de la semana en curso.
  3. **Diario:** Enfoque en las tareas críticas del día ("Hoy").
- Capacidad de asociar tareas entre horizontes (ej. una tarea diaria vinculada a una meta semanal o mensual).

### R2. Tablero Kanban Interactivo
- Tablero Kanban visual con columnas de estado (por defecto: Por hacer / To Do, En progreso / In Progress, Completado / Done, con posibilidad de personalizar o añadir columnas).
- Soporte fluido de arrastrar y soltar (Drag and Drop) para mover tarjetas de tareas entre columnas y reordenar dentro de la misma columna.
- Visualización compacta de cada tarjeta con etiquetas de prioridad (Alta, Media, Baja), fecha límite, horizonte temporal y barra de progreso de subtareas.

### R3. Gestión Integral de Tareas y Métricas
- Creación, edición rápida, duplicación y eliminación de tareas con modal o panel lateral detallado.
- Soporte para títulos, descripciones en markdown o texto enriquecido, checklists de subtareas, fecha de vencimiento y etiquetas/tags con código de color.
- Resumen visual / métricas rápidas de productividad en el dashboard (ej. % de tareas completadas hoy/semana, tareas vencidas, distribución por prioridad).

### R4. Persistencia de Datos y Sincronización Local
- Persistencia completa en el almacenamiento del navegador (localStorage o IndexedDB) sin requerir backend externo, con serialización y migración de esquema robusta.
- Función de exportación e importación de datos en formato JSON para copias de seguridad personales.
- Inicialización con datos de ejemplo (seed data) ilustrativos la primera vez que se abre la aplicación para guiar al usuario.

### R5. Interfaz y Experiencia de Usuario Premium (UI/UX Pro Max)
- Stack técnico: React 18+ con Vite y Tailwind CSS.
- Diseño minimalista, limpio y moderno basado en paleta Slate/Zinc con acentos vibrantes (#2563EB / Azul real o Indigo), tipografía Plus Jakarta Sans / Inter.
- Soporte nativo para modo claro y modo oscuro (Dark Mode con toggle persistente).
- Iconografía mediante SVGs consistentes (Lucide React o Heroicons), sin uso de emojis como iconos.
- Micro-interacciones y transiciones suaves (150-250ms), estados hover estables, cursor-pointer en elementos interactivos y soporte de accesibilidad (contraste mínimo WCAG AAA, navegación por teclado).
- Diseño completamente responsivo optimizado para resoluciones móviles (375px), tablets (768px) y pantallas de escritorio (1024px+).

## Acceptance Criteria

### Compilación y Calidad Técnica
- [ ] El proyecto compila limpiamente mediante npm run build sin errores tipográficos ni warnings críticos.
- [ ] Se incluye suite de pruebas unitarias/integración (npm test) que valida la lógica central del gestor de tareas (creación, edición, cambio de estado y persistencia).
- [ ] La aplicación se inicia en modo desarrollo sin errores (npm run dev).

### Funcionalidad de Negocio
- [ ] El usuario puede crear, editar, eliminar y filtrar tareas por horizonte (Mensual, Semanal, Diario).
- [ ] El tablero Kanban permite mover tarjetas arrastrando y soltando (drag-and-drop) entre columnas, reflejando el nuevo estado inmediatamente.
- [ ] Al recargar la página, todas las tareas, estados, columnas y preferencias se mantienen intactas en el almacenamiento local.
- [ ] La función de exportar descarga un archivo .json válido y la importación restaura la información correctamente.

### Experiencia de Usuario y Estética
- [ ] La interfaz cumple con los estándares UI/UX: tipografía profesional, iconos SVG de Lucide, modo oscuro/claro funcional, estados vacíos elegantes ("empty states") y animaciones fluidas sin desplazamiento de layout.
- [ ] La navegación entre las vistas de horizontes (Mensual, Semanal, Diario) y el tablero Kanban es instantánea y reactiva.
