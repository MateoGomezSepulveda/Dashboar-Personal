import React, { useState, useEffect } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  List,
  CheckSquare,
  Sparkles,
  Minus,
  Plus,
  Trash2,
  Dumbbell,
  Type,
  ArrowUp,
  ArrowDown,
  Code2,
  Eye,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type NotionBlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'bullet'
  | 'todo'
  | 'callout'
  | 'divider'
  | 'table';

export interface NotionBlock {
  id: string;
  type: NotionBlockType;
  text: string;
  checked?: boolean;
  icon?: string;
  headers?: string[];
  rows?: string[][];
}

function makeBlockId(): string {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Convierte un string Markdown (incluyendo tablas GFM) en bloques visuales estilo Notion.
 */
export function parseMarkdownToBlocks(md: string): NotionBlock[] {
  if (!md || !md.trim()) {
    return [
      {
        id: makeBlockId(),
        type: 'paragraph',
        text: '',
      },
    ];
  }

  const lines = md.split('\n');
  const blocks: NotionBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Detectar tabla Markdown (| Col1 | Col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 1) {
        const parseRow = (rowStr: string) =>
          rowStr
            .slice(1, -1)
            .split('|')
            .map((cell) => cell.trim());

        const headers = parseRow(tableLines[0]);
        const dataLines = tableLines.slice(1).filter((l) => !/^\|[\s:-]+\|$/.test(l.replace(/\|/g, '|')));
        // Filtrar fila separadora |---|---|
        const cleanRows = tableLines
          .slice(1)
          .filter((l) => !l.slice(1, -1).split('|').every((c) => /^[\s:-]+$/.test(c)))
          .map(parseRow);

        void dataLines;
        const normalizedRows =
          cleanRows.length > 0
            ? cleanRows.map((r) => {
                const copy = [...r];
                while (copy.length < headers.length) copy.push('');
                return copy.slice(0, headers.length);
              })
            : [headers.map(() => '')];

        blocks.push({
          id: makeBlockId(),
          type: 'table',
          text: '',
          headers,
          rows: normalizedRows,
        });
        continue;
      }
    }

    if (trimmed === '---' || trimmed === '***') {
      blocks.push({ id: makeBlockId(), type: 'divider', text: '' });
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push({ id: makeBlockId(), type: 'h1', text: line.slice(2) });
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({ id: makeBlockId(), type: 'h2', text: line.slice(3) });
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({ id: makeBlockId(), type: 'h3', text: line.slice(4) });
      i++;
      continue;
    }

    if (line.startsWith('> ')) {
      const content = line.slice(2).trim();
      const emojiMatch = content.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s+(.*)$/u);
      blocks.push({
        id: makeBlockId(),
        type: 'callout',
        icon: emojiMatch ? emojiMatch[1] : '💡',
        text: emojiMatch ? emojiMatch[2] : content,
      });
      i++;
      continue;
    }

    if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      blocks.push({
        id: makeBlockId(),
        type: 'todo',
        checked: true,
        text: trimmed.slice(6),
      });
      i++;
      continue;
    }

    if (trimmed.startsWith('- [ ] ')) {
      blocks.push({
        id: makeBlockId(),
        type: 'todo',
        checked: false,
        text: trimmed.slice(6),
      });
      i++;
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({
        id: makeBlockId(),
        type: 'bullet',
        text: trimmed.slice(2),
      });
      i++;
      continue;
    }

    blocks.push({
      id: makeBlockId(),
      type: 'paragraph',
      text: line,
    });
    i++;
  }

  return blocks.length > 0
    ? blocks
    : [{ id: makeBlockId(), type: 'paragraph', text: '' }];
}

/**
 * Serializa los bloques visuales estilo Notion de vuelta a Markdown estándar.
 */
export function serializeBlocksToMarkdown(blocks: NotionBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'h1':
          return `# ${b.text}`;
        case 'h2':
          return `## ${b.text}`;
        case 'h3':
          return `### ${b.text}`;
        case 'callout':
          return `> ${b.icon || '💡'} ${b.text}`;
        case 'todo':
          return `- [${b.checked ? 'x' : ' '}] ${b.text}`;
        case 'bullet':
          return `- ${b.text}`;
        case 'divider':
          return `---`;
        case 'table': {
          const headers = b.headers && b.headers.length > 0 ? b.headers : ['Columna 1', 'Columna 2'];
          const rows = b.rows && b.rows.length > 0 ? b.rows : [headers.map(() => '')];
          const headerLine = `| ${headers.join(' | ')} |`;
          const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
          const rowLines = rows.map(
            (r) => `| ${headers.map((_, idx) => (r[idx] ?? '').replace(/\|/g, '/')).join(' | ')} |`
          );
          return [headerLine, separatorLine, ...rowLines].join('\n');
        }
        case 'paragraph':
        default:
          return b.text;
      }
    })
    .filter((line, idx, arr) => !(arr.length === 1 && line === '' && idx === 0))
    .join('\n');
}

interface NotionDescriptionEditorProps {
  value: string;
  onChange: (newMarkdown: string) => void;
  placeholder?: string;
  compact?: boolean;
}

const CALLOUT_ICONS = ['💡', '🏋️', '🔥', '📌', '⚡', '✅', '🎯'];

export const NotionDescriptionEditor: React.FC<NotionDescriptionEditorProps> = ({
  value,
  onChange,
  placeholder = 'Escribe notas, agrega títulos grandes o inserta una tabla estilo Notion...',
  compact = false,
}) => {
  const [blocks, setBlocks] = useState<NotionBlock[]>(() => parseMarkdownToBlocks(value));
  const [rawMode, setRawMode] = useState(false);
  const [lastEmittedMd, setLastEmittedMd] = useState(value);

  // Sincronizar si el valor externo cambia (por ejemplo al cambiar de tarea o cargar rutina de un día)
  useEffect(() => {
    if (value !== lastEmittedMd) {
      setBlocks(parseMarkdownToBlocks(value));
      setLastEmittedMd(value);
    }
  }, [value, lastEmittedMd]);

  const commitBlocks = (nextBlocks: NotionBlock[]) => {
    const safeBlocks =
      nextBlocks.length > 0
        ? nextBlocks
        : [{ id: makeBlockId(), type: 'paragraph' as NotionBlockType, text: '' }];
    setBlocks(safeBlocks);
    const md = serializeBlocksToMarkdown(safeBlocks);
    setLastEmittedMd(md);
    onChange(md);
  };

  const addBlock = (type: NotionBlockType, preset?: 'gym-table') => {
    let newBlock: NotionBlock;

    if (preset === 'gym-table') {
      newBlock = {
        id: makeBlockId(),
        type: 'table',
        text: '',
        headers: ['Ejercicio', 'Series', 'Reps', 'Peso / Notas'],
        rows: [
          ['Press Banca / Principal', '4', '10-12', ''],
          ['Ejercicio Secundario', '4', '12', ''],
          ['Accesorio / Finalizador', '3', '15', ''],
        ],
      };
    } else if (type === 'table') {
      newBlock = {
        id: makeBlockId(),
        type: 'table',
        text: '',
        headers: ['Elemento', 'Detalle', 'Estado'],
        rows: [
          ['', '', ''],
          ['', '', ''],
        ],
      };
    } else if (type === 'callout') {
      newBlock = {
        id: makeBlockId(),
        type: 'callout',
        icon: '💡',
        text: '',
      };
    } else {
      newBlock = {
        id: makeBlockId(),
        type,
        text: '',
        checked: false,
      };
    }

    // Si solo hay un bloque vacío de párrafo, reemplazarlo
    if (blocks.length === 1 && blocks[0].type === 'paragraph' && !blocks[0].text.trim()) {
      commitBlocks([newBlock]);
    } else {
      commitBlocks([...blocks, newBlock]);
    }
  };

  const insertGymWorkoutTemplate = () => {
    const templateBlocks: NotionBlock[] = [
      {
        id: makeBlockId(),
        type: 'h1',
        text: '🏋️ Rutina de Entrenamiento',
      },
      {
        id: makeBlockId(),
        type: 'callout',
        icon: '🔥',
        text: 'Enfoque del día: Calentamiento 10 min + sobrecarga progresiva',
      },
      {
        id: makeBlockId(),
        type: 'table',
        text: '',
        headers: ['Ejercicio', 'Series', 'Reps', 'Peso (kg)'],
        rows: [
          ['Ejercicio 1', '4', '10', ''],
          ['Ejercicio 2', '4', '12', ''],
          ['Ejercicio 3', '3', '12-15', ''],
          ['Ejercicio 4', '3', '15', ''],
        ],
      },
      {
        id: makeBlockId(),
        type: 'h3',
        text: 'Checklist de cierre',
      },
      {
        id: makeBlockId(),
        type: 'todo',
        checked: false,
        text: 'Estiramiento final y cardio 15 min',
      },
      {
        id: makeBlockId(),
        type: 'todo',
        checked: false,
        text: 'Hidratación y proteína post-entreno',
      },
    ];
    commitBlocks(templateBlocks);
  };

  const updateBlock = (id: string, patch: Partial<NotionBlock>) => {
    commitBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    commitBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    commitBlocks(copy);
  };

  // Funciones para editar tablas interactivas
  const updateTableHeader = (blockId: string, colIdx: number, val: string) => {
    const blk = blocks.find((b) => b.id === blockId);
    if (!blk || !blk.headers) return;
    const nextHeaders = [...blk.headers];
    nextHeaders[colIdx] = val;
    updateBlock(blockId, { headers: nextHeaders });
  };

  const updateTableCell = (blockId: string, rowIdx: number, colIdx: number, val: string) => {
    const blk = blocks.find((b) => b.id === blockId);
    if (!blk || !blk.rows) return;
    const nextRows = blk.rows.map((r, rI) =>
      rI === rowIdx ? r.map((c, cI) => (cI === colIdx ? val : c)) : r
    );
    updateBlock(blockId, { rows: nextRows });
  };

  const addTableRow = (blockId: string) => {
    const blk = blocks.find((b) => b.id === blockId);
    if (!blk || !blk.headers) return;
    const cols = blk.headers.length;
    const nextRows = [...(blk.rows || []), Array(cols).fill('')];
    updateBlock(blockId, { rows: nextRows });
  };

  const removeTableRow = (blockId: string, rowIdx: number) => {
    const blk = blocks.find((b) => b.id === blockId);
    if (!blk || !blk.rows) return;
    if (blk.rows.length <= 1) return;
    updateBlock(blockId, { rows: blk.rows.filter((_, idx) => idx !== rowIdx) });
  };

  const addTableColumn = (blockId: string) => {
    const blk = blocks.find((b) => b.id === blockId);
    if (!blk || !blk.headers) return;
    const nextHeaders = [...blk.headers, `Col ${blk.headers.length + 1}`];
    const nextRows = (blk.rows || []).map((r) => [...r, '']);
    updateBlock(blockId, { headers: nextHeaders, rows: nextRows });
  };

  const removeTableColumn = (blockId: string, colIdx: number) => {
    const blk = blocks.find((b) => b.id === blockId);
    if (!blk || !blk.headers || blk.headers.length <= 1) return;
    const nextHeaders = blk.headers.filter((_, idx) => idx !== colIdx);
    const nextRows = (blk.rows || []).map((r) => r.filter((_, idx) => idx !== colIdx));
    updateBlock(blockId, { headers: nextHeaders, rows: nextRows });
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs overflow-hidden">
      {/* Barra de Herramientas Estilo Notion */}
      <div className="px-3 py-2 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => addBlock('h1')}
            title="Insertar Título Grande (H1)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
          >
            <Heading1 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Título 1</span>
          </button>

          <button
            type="button"
            onClick={() => addBlock('h2')}
            title="Insertar Subtítulo (H2)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
          >
            <Heading2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Título 2</span>
          </button>

          <button
            type="button"
            onClick={() => addBlock('h3')}
            title="Insertar Encabezado Pequeño (H3)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
          >
            <Heading3 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Título 3</span>
          </button>

          <span className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          <button
            type="button"
            onClick={() => addBlock('table')}
            title="Insertar Tabla estilo Notion"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70 hover:bg-blue-100 transition-all cursor-pointer"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>+ Tabla</span>
          </button>

          <button
            type="button"
            onClick={() => addBlock('table', 'gym-table')}
            title="Insertar Tabla de Ejercicios (Ejercicio, Series, Reps, Peso)"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70 hover:bg-emerald-100 transition-all cursor-pointer"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>+ Tabla Gym</span>
          </button>

          <button
            type="button"
            onClick={() => addBlock('callout')}
            title="Insertar Bloque Destacado (Callout)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Destacado</span>
          </button>

          <button
            type="button"
            onClick={() => addBlock('bullet')}
            title="Agregar Lista de Viñetas"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => addBlock('todo')}
            title="Agregar Casilla de Verificación"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => addBlock('divider')}
            title="Insertar Línea Divisoria"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Botón Plantilla Completa o Ver Markdown */}
        <div className="flex items-center gap-1">
          {!compact && (
            <button
              type="button"
              onClick={insertGymWorkoutTemplate}
              title="Cargar plantilla completa tipo Notion para entrenamiento"
              className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
            >
              ⚡ Plantilla Gym
            </button>
          )}
          <button
            type="button"
            onClick={() => setRawMode(!rawMode)}
            title="Alternar entre Editor Visual Notion y texto Markdown"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {rawMode ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Lienzo del Documento Estilo Notion */}
      {rawMode ? (
        <div className="p-3">
          <textarea
            value={value}
            onChange={(e) => {
              setLastEmittedMd(e.target.value);
              setBlocks(parseMarkdownToBlocks(e.target.value));
              onChange(e.target.value);
            }}
            rows={compact ? 4 : 7}
            placeholder={placeholder}
            className="w-full p-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>
      ) : (
        <div className={cn('p-3 sm:p-4 space-y-2.5', compact ? 'min-h-[120px]' : 'min-h-[180px]')}>
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="group/block relative flex items-start gap-1.5 rounded-xl transition-colors"
            >
              {/* Contenido del Bloque según su tipo */}
              <div className="flex-1 min-w-0">
                {block.type === 'h1' && (
                  <input
                    type="text"
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder="Título Principal Grande..."
                    className="w-full text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 bg-transparent border-0 border-b border-transparent focus:border-blue-500/40 pb-1 focus:outline-none placeholder-slate-300 dark:placeholder-slate-700"
                  />
                )}

                {block.type === 'h2' && (
                  <input
                    type="text"
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder="Subtítulo de sección..."
                    className="w-full text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 bg-transparent border-0 border-b border-slate-100 dark:border-slate-800/80 focus:border-purple-500/50 pb-1 focus:outline-none placeholder-slate-300 dark:placeholder-slate-700"
                  />
                )}

                {block.type === 'h3' && (
                  <input
                    type="text"
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder="Encabezado..."
                    className="w-full text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-transparent border-0 focus:outline-none placeholder-slate-300 dark:placeholder-slate-700"
                  />
                )}

                {block.type === 'paragraph' && (
                  <textarea
                    rows={Math.max(1, block.text.split('\n').length)}
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder={index === 0 ? placeholder : 'Escribe texto o usa la barra superior para insertar tablas o títulos...'}
                    className="w-full text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-transparent border-0 focus:outline-none resize-none leading-relaxed placeholder-slate-400 dark:placeholder-slate-600"
                  />
                )}

                {block.type === 'bullet' && (
                  <div className="flex items-center gap-2 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <input
                      type="text"
                      value={block.text}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const next = [...blocks];
                          next.splice(index + 1, 0, {
                            id: makeBlockId(),
                            type: 'bullet',
                            text: '',
                          });
                          commitBlocks(next);
                        }
                      }}
                      placeholder="Elemento de lista (Enter para otro)..."
                      className="w-full text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-transparent border-0 focus:outline-none"
                    />
                  </div>
                )}

                {block.type === 'todo' && (
                  <div className="flex items-center gap-2 pl-1">
                    <input
                      type="checkbox"
                      checked={Boolean(block.checked)}
                      onChange={(e) => updateBlock(block.id, { checked: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={block.text}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const next = [...blocks];
                          next.splice(index + 1, 0, {
                            id: makeBlockId(),
                            type: 'todo',
                            checked: false,
                            text: '',
                          });
                          commitBlocks(next);
                        }
                      }}
                      placeholder="Tarea / Ejercicio por hacer..."
                      className={cn(
                        'w-full text-xs sm:text-sm bg-transparent border-0 focus:outline-none',
                        block.checked
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      )}
                    />
                  </div>
                )}

                {block.type === 'callout' && (
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const currIdx = CALLOUT_ICONS.indexOf(block.icon || '💡');
                        const nextIcon = CALLOUT_ICONS[(currIdx + 1) % CALLOUT_ICONS.length];
                        updateBlock(block.id, { icon: nextIcon });
                      }}
                      title="Cambiar icono"
                      className="text-base hover:scale-110 transition-transform cursor-pointer shrink-0"
                    >
                      {block.icon || '💡'}
                    </button>
                    <input
                      type="text"
                      value={block.text}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      placeholder="Nota destacada importante..."
                      className="w-full text-xs sm:text-sm font-medium text-amber-950 dark:text-amber-200 bg-transparent border-0 focus:outline-none placeholder-amber-700/50"
                    />
                  </div>
                )}

                {block.type === 'divider' && (
                  <div className="py-2">
                    <hr className="border-slate-200 dark:border-slate-800" />
                  </div>
                )}

                {/* TABLA INTERACTIVA ESTILO NOTION */}
                {block.type === 'table' && (
                  <div className="my-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                            {(block.headers || []).map((header, colIdx) => (
                              <th
                                key={colIdx}
                                className="p-0 border-r last:border-r-0 border-slate-200 dark:border-slate-700 min-w-[95px]"
                              >
                                <div className="flex items-center px-2.5 py-1.5 gap-1">
                                  <input
                                    type="text"
                                    value={header}
                                    onChange={(e) =>
                                      updateTableHeader(block.id, colIdx, e.target.value)
                                    }
                                    placeholder={`Col ${colIdx + 1}`}
                                    className="w-full text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-transparent border-0 focus:outline-none"
                                  />
                                  {(block.headers?.length || 0) > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeTableColumn(block.id, colIdx)}
                                      title="Eliminar columna"
                                      className="opacity-0 hover:opacity-100 group-hover/block:opacity-60 text-slate-400 hover:text-rose-500 text-[10px] cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="w-8 bg-slate-100/90 dark:bg-slate-800/80 text-center">
                              <button
                                type="button"
                                onClick={() => addTableColumn(block.id)}
                                title="Agregar columna"
                                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                          {(block.rows || []).map((row, rowIdx) => (
                            <tr
                              key={rowIdx}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              {(block.headers || []).map((_, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="p-0 border-r last:border-r-0 border-slate-200/70 dark:border-slate-800"
                                >
                                  <input
                                    type="text"
                                    value={row[colIdx] ?? ''}
                                    onChange={(e) =>
                                      updateTableCell(block.id, rowIdx, colIdx, e.target.value)
                                    }
                                    placeholder="..."
                                    className={cn(
                                      'w-full px-2.5 py-1.5 text-xs bg-transparent border-0 focus:outline-none focus:bg-blue-50/40 dark:focus:bg-blue-950/20',
                                      colIdx === 0
                                        ? 'font-semibold text-slate-800 dark:text-slate-100'
                                        : 'text-slate-600 dark:text-slate-300'
                                    )}
                                  />
                                </td>
                              ))}
                              <td className="w-8 text-center">
                                {(block.rows?.length || 0) > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeTableRow(block.id, rowIdx)}
                                    title="Eliminar fila"
                                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pie de tabla: + Nueva fila */}
                    <div className="px-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => addTableRow(block.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nueva fila</span>
                      </button>

                      <span className="text-[10px] text-slate-400">
                        {(block.rows || []).length} fila(s) · {(block.headers || []).length} col(s)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones laterales del bloque (Subir, Bajar, Eliminar bloque) */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 focus-within:opacity-100 transition-opacity pt-0.5 shrink-0">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveBlock(index, -1)}
                    title="Subir bloque"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                )}
                {index < blocks.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 1)}
                    title="Bajar bloque"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  title="Eliminar bloque"
                  className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Botón inferior para añadir otro bloque de texto rápidamente */}
          <button
            type="button"
            onClick={() => addBlock('paragraph')}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 pt-1 cursor-pointer"
          >
            <Type className="w-3 h-3" />
            <span>+ Añadir bloque de texto</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NotionDescriptionEditor;
