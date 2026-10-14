import { useEffect, useRef, useState } from 'react';
import {
  Database,
  Fingerprint,
  Flag,
  Gauge,
  ListFilter,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Split,
  TriangleAlert,
  UserRound,
  WandSparkles,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '../../lib/cx';
import type { Run, StepStatus } from '../../demos/types';

interface Props {
  run: Run;
  /** How many log lines are revealed; the canvas lights up nodes in step with the log. */
  shown: number;
}

interface CanvasNode {
  key: string;
  name: string;
  status: StepStatus;
  details: string[];
  /** Index of the last log step folded into this node (the response node uses steps.length). */
  lastIndex: number;
}

const ICONS: Record<string, LucideIcon> = {
  receive: Webhook,
  normalize: WandSparkles,
  validate: ShieldCheck,
  dedupe: Fingerprint,
  rules: Split,
  model: Sparkles,
  threshold: Gauge,
  fallback: UserRound,
  'on error': TriangleAlert,
  parse: TriangleAlert,
  crm: Database,
  audit: ScrollText,
  result: Flag,
  respond: Send,
};

const STATUS_TEXT: Record<number, string> = { 200: 'OK', 202: 'Accepted', 400: 'Bad Request' };

// Retries are one node with several attempts, like n8n shows "Retry on fail" on a single node.
function toNodes(run: Run): CanvasNode[] {
  const nodes: CanvasNode[] = [];
  run.steps.forEach((step, index) => {
    const name = /^call \d+$/.test(step.name) ? 'model' : step.name;
    const previous = nodes.at(-1);
    if (previous && previous.name === name) {
      previous.details.push(step.detail);
      previous.status = step.status;
      previous.lastIndex = index;
      return;
    }
    nodes.push({ key: `${index}-${name}`, name, status: step.status, details: [step.detail], lastIndex: index });
  });
  const { status } = run.response;
  nodes.push({
    key: 'respond',
    name: 'respond',
    status: status >= 400 ? 'error' : 'ok',
    details: [`${status} ${STATUS_TEXT[status] ?? ''}`],
    lastIndex: run.steps.length,
  });
  return nodes;
}

const NODE = 56;
const GAP = 64;
const PAD_X = 28;
const NODE_Y = 52;
const STEP = NODE + GAP;

const BADGE: Record<StepStatus, { glyph: string; className: string }> = {
  ok: { glyph: '✓', className: 'bg-ok' },
  review: { glyph: '!', className: 'bg-review' },
  error: { glyph: '×', className: 'bg-error' },
  skip: { glyph: '–', className: 'bg-border-strong' },
};

const BORDER: Record<StepStatus, string> = {
  ok: 'border-ok/70',
  review: 'border-review/70',
  error: 'border-error/70',
  skip: 'border-dashed border-border-strong opacity-60',
};

const EDGE: Record<StepStatus, string> = {
  ok: 'var(--ok)',
  review: 'var(--review)',
  error: 'var(--error)',
  skip: 'var(--border-strong)',
};

export default function PipelineCanvas({ run, shown }: Props) {
  const nodes = toNodes(run);
  const doneCount = nodes.filter((node) => shown > node.lastIndex).length;
  const [selected, setSelected] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // A new run clears the pinned node; the inspector then follows the execution.
  useEffect(() => setSelected(null), [run]);

  // Pan the canvas to keep the running (or the clicked) node in view, like n8n during an execution.
  const selectedIndex = nodes.findIndex((node) => node.key === selected);
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const active = selectedIndex >= 0 ? selectedIndex : Math.min(doneCount, nodes.length - 1);
    const left = PAD_X + active * STEP + NODE / 2 - element.clientWidth / 2;
    element.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [doneCount, nodes.length, selectedIndex]);

  const width = PAD_X * 2 + nodes.length * NODE + (nodes.length - 1) * GAP;
  const inspected = nodes.find((node) => node.key === selected) ?? nodes[Math.max(0, doneCount - 1)];
  const inspectedDone = shown > inspected.lastIndex;
  const InspectedIcon = ICONS[inspected.name] ?? ListFilter;

  return (
    <div className="flex h-full flex-col font-sans">
      <div
        ref={scroller}
        className="canvas-grid relative flex-1 overflow-x-auto overflow-y-hidden"
        role="group"
        aria-label="Workflow canvas"
      >
        <div className="relative h-full" style={{ width, minWidth: '100%' }}>
          <svg className="pointer-events-none absolute inset-0 h-full" width={width} aria-hidden="true">
            {nodes.slice(1).map((node, index) => {
              const from = PAD_X + index * STEP + NODE;
              const to = from + GAP;
              const y = NODE_Y + NODE / 2;
              const reached = shown > node.lastIndex;
              const running = !reached && index + 1 === doneCount;
              return (
                <g key={node.key}>
                  <path
                    d={`M ${from} ${y} C ${from + GAP / 2} ${y}, ${to - GAP / 2} ${y}, ${to} ${y}`}
                    fill="none"
                    stroke={reached ? EDGE[node.status === 'skip' ? 'skip' : 'ok'] : 'var(--border-strong)'}
                    strokeWidth={reached ? 1.75 : 1.25}
                    strokeDasharray={node.status === 'skip' && reached ? '4 4' : running ? '5 5' : undefined}
                    className={running ? 'canvas-flow' : undefined}
                  />
                  <circle cx={from} cy={y} r={3} fill="var(--surface)" stroke="var(--border-strong)" />
                  <circle cx={to} cy={y} r={3} fill="var(--surface)" stroke="var(--border-strong)" />
                  {reached && node.status !== 'skip' && (
                    <text x={(from + to) / 2} y={y - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
                      1 item
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {nodes.map((node, index) => {
            const Icon = ICONS[node.name] ?? ListFilter;
            const done = shown > node.lastIndex;
            const running = !done && index === doneCount;
            const isSelected = inspected.key === node.key;
            const tries = node.details.length;
            return (
              <button
                key={node.key}
                type="button"
                onClick={() => setSelected(node.key)}
                className="absolute flex w-[88px] flex-col items-center gap-2 text-center"
                style={{ left: PAD_X + index * STEP + NODE / 2 - 44, top: NODE_Y }}
                aria-label={`${node.name}: ${done ? node.status : 'pending'}`}
              >
                <span
                  className={cx(
                    'relative grid size-14 place-items-center rounded-xl border-2 bg-surface transition-colors duration-300',
                    done ? BORDER[node.status] : running ? 'animate-pulse border-ink' : 'border-border opacity-50',
                    isSelected && 'ring-2 ring-ink/30 ring-offset-2 ring-offset-bg',
                  )}
                >
                  <Icon className={cx('size-6', done && node.status !== 'skip' ? 'text-ink' : 'text-muted')} />
                  {done && (
                    <span
                      className={cx(
                        'absolute -top-2 -right-2 grid size-5 place-items-center rounded-full text-[11px] leading-none font-bold text-bg',
                        BADGE[node.status].className,
                      )}
                    >
                      {BADGE[node.status].glyph}
                    </span>
                  )}
                  {done && tries > 1 && (
                    <span className="absolute -bottom-2 rounded-full border border-border bg-bg px-1.5 font-mono text-[9px] text-muted">
                      {tries} tries
                    </span>
                  )}
                </span>
                <span className={cx('w-full truncate text-[11px] leading-tight', done ? 'text-ink' : 'text-muted')}>
                  {node.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[5.5rem] gap-3 border-t border-border bg-surface/60 px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-bg">
          <InspectedIcon className="size-4 text-muted" />
        </span>
        <div className="min-w-0 font-mono text-[12px] leading-5">
          <p className="text-ink">
            {inspected.name}{' '}
            <span className="text-muted">
              · {inspectedDone ? inspected.status : 'waiting'}
              {selected === null && ' · click a node to inspect it'}
            </span>
          </p>
          {inspectedDone &&
            inspected.details.map((detail, index) => (
              <p key={index} className="break-words text-muted">
                {detail}
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}
