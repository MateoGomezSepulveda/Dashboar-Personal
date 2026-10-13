# Dashboard Personal — Productividad y Tareas

Una aplicación web moderna, reactiva y elegante para organizar y planificar la productividad diaria, semanal y mensual, equipada con un tablero **Kanban interactivo con Drag & Drop**, motor de métricas en tiempo real y persistencia local sin dependencias de servidor.

Construida siguiendo los principios de diseño de **UI/UX Pro Max**: paleta Slate/Zinc minimalista, acentos en azul real (`#2563EB`), soporte para modo claro/oscuro y tipografía *Plus Jakarta Sans*.

---

## 🚀 Características Principales

### 1. Horizontes Temporales de Planificación
- **Mensual:** Definición y seguimiento de metas estratégicas de alto nivel.
- **Semanal:** Desglose de compromisos y prioridades operativas de la semana.
- **Diario:** Enfoque prioritario en las tareas del día ("Hoy").
- **Vinculación Jerárquica:** Conecta tareas diarias con objetivos semanales/mensuales con barra de progreso consolidada.

### 2. Tablero Kanban con Drag & Drop
- Arrastra y suelta tarjetas de tareas con física suave impulsada por `@hello-pangea/dnd`.
- Reordenamiento fluido entre columnas y dentro de la misma columna.
- Indicadores visuales de límites WIP (Work In Progress) y badges de estado.

### 3. Gestión Detallada de Tareas
- Panel lateral deslizante (*Slide Drawer*) para edición completa.
- Descripciones con renderizado en **Markdown**.
- Lista interactiva de subtareas / checklists con porcentaje de avance automático.
- Prioridades codificadas por color (Alta, Media, Baja) y etiquetas personalizables.

### 4. Persistencia Local y Copias de Seguridad
- Almacenamiento seguro en `localStorage` con versionado de esquema.
- Sincronización automática e instantánea entre múltiples pestañas del navegador.
- Exportación e importación de copias de seguridad en formato `.json`.
- Restablecimiento seguro a datos semilla de ejemplo (*seed data*).

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 + Vite 5 + TypeScript
- **Estilos:** Tailwind CSS + Lucide React (iconos SVG)
- **Drag & Drop:** `@hello-pangea/dnd`
- **Utilidades de Fecha:** `date-fns`
- **Testing:** Vitest + React Testing Library + Opaque-box E2E Test Harness

---

## 💻 Guía de Uso Local

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Abre tu navegador en la URL indicada (habitualmente `http://localhost:5173`).

### 3. Ejecutar las Pruebas Automatizadas
```bash
# Ejecutar todas las pruebas unitarias y de integración
npm test

# Ejecutar pruebas en modo observador (watch)
npm run test:watch
```

### 4. Compilar para Producción
```bash
npm run build
```
Generará el bundle optimizado en la carpeta `dist/`, listo para ser servido estáticamente.
