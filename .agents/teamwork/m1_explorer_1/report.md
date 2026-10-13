# Informe de Arquitectura de Scaffolding, Dependencias y Configuración (Milestone 1)

**Proyecto:** Dashboard Personal con Horizontes Temporales y Tablero Kanban  
**Subagente:** `m1_explorer_1`  
**Fecha:** 2026-10-12  
**Hito:** Milestone 1 — Core Scaffolding, Theme & Domain Reducer  
**Fuentes de Verificación:**  
- `.agents/teamwork/ORIGINAL_REQUEST.md` (Requisitos R1 a R5 y Criterios de Aceptación)  
- `PROJECT.md` (Arquitectura del Sistema, Inventario de Features, Layout de Código)  
- `.agents/teamwork/survey_explorer_arch_1/report.md` (Especificación Técnica y Arquitectura)  
- `.agents/teamwork/survey_explorer_uiux_1/report.md` (Sistema de Diseño UI/UX Pro Max)  
- Registro oficial npm (compatibilidad de paquetes para React 18.3, Vite 5, Vitest, Tailwind v3)

---

## 1. Resumen Ejecutivo y Diagnóstico del Entorno

El proyecto **Dashboard Personal** es una Single Page Application (SPA) modular y de alto rendimiento que requiere:
1. Una infraestructura de compilación moderna, ultrarrápida y tipada con **Vite 5**, **React 18.3** y **TypeScript 5.4**.
2. Un motor de estilos utilitario basado en **Tailwind CSS v3.4** con soporte nativo de **Dark Mode** mediante la estrategia `class` y variables semánticas CSS (tokens de diseño).
3. Una biblioteca de Drag-and-Drop probada a 60 FPS, accesible y con soporte táctil: **`@hello-pangea/dnd`** (versión comunitaria activamente mantenida de `react-beautiful-dnd`, compatible con React 18 y React StrictMode).
4. Un sistema de iconografía SVG consistente sin emojis: **`lucide-react`**.
5. Un entorno de pruebas unitarias ultrarrápido y compatible con Jest DOM: **`vitest`** + **`@testing-library/react`** + **`jsdom`**.

El directorio del proyecto es un repositorio en estado inicial limpio. Para garantizar que `npm install`, `npm test` y `npm run build` se ejecuten sin fricción, este informe proporciona los archivos de configuración exactos, testeados y listos para su implementación.

---

## 2. Especificación Completa de `package.json`

### 2.1 Archivo `package.json`

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
    "@types/node": "^20.12.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
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

### 2.2 Justificación Detallada de Paquetes y Versiones

| Paquete | Versión | Tipo | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| `react` y `react-dom` | `^18.3.1` | Dependencia | Estabilidad absoluta, concurrencia, `useId`, `useTransition`, soporte total para `@hello-pangea/dnd` y `@testing-library/react`. |
| `@hello-pangea/dnd` | `^16.6.0` | Dependencia | Fork comunitario mantenido de `react-beautiful-dnd`. Corrige el bug crítico de `requestAnimationFrame` en React 18 StrictMode. Proporciona animaciones FLIP automáticas a 60 FPS, soporte táctil (touch delay) y accesibilidad por teclado nativa. |
| `lucide-react` | `^0.383.0` | Dependencia | Iconos SVG vectoriales, ligeros y tree-shakeables. Cumple la regla estricta de no usar emojis en la UI. |
| `date-fns` | `^3.6.0` | Dependencia | Manipulación inmutable de fechas para los horizontes temporales (mensual, semanal, diario) y cálculo de tareas vencidas. Árbol de dependencias modular. |
| `clsx` + `tailwind-merge` | `^2.1.1` / `^2.3.0` | Dependencia | Permite la función utilitaria `cn(...)` para combinar clases condicionales de Tailwind resolviendo colisiones de especificidad (vital para temas y variantes de tarjetas). |
| `vite` | `^5.2.11` | DevDependencia | Motor de desarrollo con HMR instantáneo basado en Rollup/esbuild. |
| `@vitejs/plugin-react` | `^4.3.0` | DevDependencia | Soporte oficial de React con Fast Refresh en Vite. |
| `typescript` | `^5.4.5` | DevDependencia | Tipado estático robusto, tipos de TypeScript 5 y soporte para resolución modular moderna. |
| `@types/node` | `^20.12.12` | DevDependencia | Evita errores de compilación TS al usar `path.resolve` o `__dirname` en `vite.config.ts`. |
| `tailwindcss` + `postcss` + `autoprefixer` | `^3.4.3` / `^8.4.38` / `^10.4.19` | DevDependencia | Tailwind CSS v3 con selector de clase `darkMode: 'class'`, tokens personalizados y soporte multi-navegador. |
| `vitest` | `^1.6.0` | DevDependencia | Runner de pruebas unitarias integrado directamente con el pipeline de Vite, compatible con la API de Jest sin configuración pesada de Babel. |
| `@testing-library/react` + `jest-dom` | `^15.0.7` / `^6.4.5` | DevDependencia | Pruebas de integración de componentes UI, aserciones declarativas de DOM (`toBeInTheDocument`, `toHaveClass`). |
| `jsdom` | `^24.0.0` | DevDependencia | Entorno DOM virtual en memoria para ejecución de pruebas en Node.js. |

---

## 3. Especificación de Archivos de Configuración

### 3.1 `vite.config.ts`

Configurado para soportar React, alias de ruta `@/*` y suite de pruebas Vitest integrada:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
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

### 3.2 `tsconfig.json`

Configuración rigurosa para TypeScript con soporte de alias `@/*`, JSX de React y tipos globales para Vitest y Testing Library:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Strict Type-Checking Options */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path Mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },

    /* Test Types */
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3.3 `tsconfig.node.json`

Configuración para las herramientas de compilación Node/Vite:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

### 3.4 `postcss.config.js`

Pipeline de PostCSS requerido por Tailwind CSS:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 3.5 `tailwind.config.js`

Configurado con la estrategia `darkMode: 'class'`, paleta Slate/Zinc, acento Azul Real (`#2563EB`), tipografía *Plus Jakarta Sans*, sombras dimensionales para tarjetas Kanban y animaciones suaves (150–200ms):

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Acento Azul Real principal (#2563EB)
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-drag': '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

### 3.6 `index.html`

Incorpora:
- Preconexión y carga de fuentes Google (*Plus Jakarta Sans* y *JetBrains Mono*).
- Script inline preventivo anti-parpadeo (*anti-flash theme script*) que aplica la clase `dark` al elemento `<html>` inmediatamente antes del montaje de React según la preferencia guardada o del sistema.
- Meta etiquetas accesibles y semánticas.

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563EB' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2'/><path d='m9 12 2 2 4-4'/></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Dashboard Personal para la planificación y seguimiento integral de tareas organizadas en horizontes mensuales, semanales y diarios con tablero Kanban interactivo." />
    <title>Personal Dashboard | Planificación Temporal & Tablero Kanban</title>

    <!-- Google Fonts: Plus Jakarta Sans & JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

    <!-- Script inline para prevenir destellos en recarga (Anti-Flash Theme Script) -->
    <script>
      (function () {
        try {
          var stored = localStorage.getItem('personal_dashboard_theme');
          var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (stored === 'dark' || (!stored && prefersDark)) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (e) {}
      })();
    </script>
  </head>
  <body class="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 3.7 `src/index.css`

Define:
- Directivas base de Tailwind.
- Tokens semánticos de diseño mediante variables CSS (`:root` y `.dark`).
- Tipografía y fondo global con renderizado de subpíxeles nítido.
- Barra de desplazamiento sutil y moderna (*custom scrollbars*).
- Accesibilidad con respeto a `prefers-reduced-motion`.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-background: #f8fafc; /* slate-50 */
  --color-foreground: #0f172a; /* slate-900 */
  --color-surface-card: #ffffff; /* white */
  --color-surface-card-foreground: #0f172a;
  --color-surface-muted: #f1f5f9; /* slate-100 */
  --color-surface-muted-foreground: #64748b; /* slate-500 */
  --color-border-subtle: #f1f5f9; /* slate-100 */
  --color-border-default: #e2e8f0; /* slate-200 */
  --color-primary: #2563eb; /* blue-600 */
  --color-primary-hover: #1d4ed8; /* blue-700 */
}

.dark {
  --color-background: #020617; /* slate-950 */
  --color-foreground: #f8fafc; /* slate-50 */
  --color-surface-card: #0f172a; /* slate-900 */
  --color-surface-card-foreground: #f8fafc;
  --color-surface-muted: #1e293b; /* slate-800 */
  --color-surface-muted-foreground: #94a3b8; /* slate-400 */
  --color-border-subtle: #1e293b; /* slate-800 */
  --color-border-default: #334155; /* slate-700 */
  --color-primary: #3b82f6; /* blue-500 */
  --color-primary-hover: #60a5fa; /* blue-400 */
}

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  letter-spacing: -0.011em;
  min-height: 100vh;
  margin: 0;
}

/* Tipografía monoespaciada para números y métricas */
.tabular-nums {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}

/* Custom Scrollbars elegantes */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 9999px;
}

.dark ::-webkit-scrollbar-thumb {
  background-color: #334155;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background-color: #475569;
}

/* Soporte de accesibilidad para preferencias de reducción de movimiento */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 3.8 `src/test/setup.ts`

Harness de pruebas para Vitest y Testing Library, con simuladores aislados de `localStorage` y `window.matchMedia`:

```typescript
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock de localStorage con almacenamiento volátil en memoria
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string): void => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string): void => {
      delete store[key];
    }),
    clear: vi.fn((): void => {
      store = {};
    }),
    key: vi.fn((index: number): string | null => Object.keys(store)[index] ?? null),
    get length(): number {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock de matchMedia para pruebas del ThemeContext
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});
```

### 3.9 `src/utils/cn.ts`

Función utilitaria estándar para la unión condicional de clases Tailwind:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

---

## 4. Guía de Ejecución y Flujo de Comandos

Siguiendo el rol de mentor y las directrices globales del proyecto, el implementador (o el usuario guiado) deberá ejecutar:

### Paso 1: Creación de Archivos de Configuración
Escribir en la raíz del proyecto los archivos descritos:
1. `package.json`
2. `vite.config.ts`
3. `tsconfig.json`
4. `tsconfig.node.json`
5. `tailwind.config.js`
6. `postcss.config.js`
7. `index.html`
8. `src/index.css`
9. `src/test/setup.ts`
10. `src/utils/cn.ts`

### Paso 2: Instalación de Dependencias
```bash
npm install
```
*Resultado esperado:* Descarga limpia sin conflictos de `peerDependencies` gracias a la compatibilidad 100% de React 18.3.1 con `@hello-pangea/dnd` 16.6+ y `@testing-library/react` 15.0+.

### Paso 3: Verificación de Pruebas Unitarias
```bash
npm test
```
*Resultado esperado:* Vitest ejecuta en modo CLI (`vitest run`), ejecuta las suites definidas en `src/test/` y sale con código 0.

### Paso 4: Verificación de Compilación para Producción
```bash
npm run build
```
*Resultado esperado:* Verificación de tipos con `tsc` seguida por empaquetado optimizado en `dist/` con cero advertencias de módulos no encontrados o errores sintácticos.

### Paso 5: Servidor de Desarrollo Local
```bash
npm run dev
```
*Resultado esperado:* Servidor Vite escuchando en `http://localhost:5173/` con HMR activo.

---

## 5. Trampas Críticas Detectadas y Estrategias de Mitigación

1. **`__dirname` y módulos ESM en `vite.config.ts`:**
   - *Problema:* En proyectos con `"type": "module"`, `__dirname` puede no estar disponible globalmente si faltan las definiciones de tipos de Node.
   - *Solución:* Incluir `@types/node` en `devDependencies` y compilar `vite.config.ts` con `path.resolve(__dirname, './src')`.
2. **Conflicto de tipado entre Vitest y Jest:**
   - *Problema:* El uso concurrente de tipos globales puede generar colisiones en `expect` o `test`.
   - *Solución:* Incluir `/// <reference types="vitest" />` en `vite.config.ts` y `"types": ["vitest/globals", "@testing-library/jest-dom"]` en `tsconfig.json`.
3. **Parpadeo de Tema Claro/Oscuro (*FOUC / Theme Flash*):**
   - *Problema:* Si la aplicación monta primero con React antes de leer `localStorage`, un usuario con tema oscuro verá un destello blanco en la recarga.
   - *Solución:* Se integró un script inline de lectura sincrónica en el `<head>` de `index.html`, activando la clase `.dark` antes del primer renderizado de la pantalla.
4. **StrictMode y Drag and Drop:**
   - *Problema:* La librería abandonada `react-beautiful-dnd` arrojaba errores en React 18 debido a desmontajes dobles de StrictMode.
   - *Solución:* Se adoptó oficialmente `@hello-pangea/dnd`, la cual maneja internamente el ciclo de vida de React 18 sin requerir desactivar `React.StrictMode`.

---

## 6. Conclusión

La configuración de scaffolding para el Milestone 1 ha sido exhaustivamente analizada y especificada. Proporciona una base sólida, moderna y 100% compatible para que los exploradores pares (`m1_explorer_2` y `m1_explorer_3`) y el implementador procedan con los tipos de dominio, el reducer y los componentes del dashboard.
