import { useEffect, useRef, useState } from 'react';
import {
  Ban,
  Braces,
  CircleCheck,
  Database,
  Fingerprint,
  Flag,
  Gauge,
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
import { RULES } from '../../demos/rules';
import type { Run, StepStatus } from '../../demos/types';

interface Props {
  run: Run;
  /** How many log lines are revealed; the canvas lights up nodes in step with the log. */
  shown: number;
}

type OutputState = 'taken' | 'checked' | 'disabled' | 'idle';

interface CanvasNode {
  key: string;
  name: string;
  status: StepStatus;
  details: string[];
  /** Index of the last log step folded into this node (-1: input, steps.length: response). */
  lastIndex: number;
  /** Set for a Switch node: one output per rule plus the fallback, like n8n's Switch. */
  outputs?: { label: string; state: OutputState }[];
}

const ICONS: Record<string, LucideIcon> = {
  lead: Braces,
  receive: Webhook,
  normalize: WandSparkles,
  validate: ShieldCheck,
  dedupe: Fingerprint,
  rules: Split,
  model: Sparkles,
  'to model': Sparkles,
  threshold: Gauge,
  fallback: UserRound,
  'on error': TriangleAlert,
  parse: TriangleAlert,
  crm: Database,
  audit: ScrollText,
  result: Flag,
  qualified: CircleCheck,
  rejected: Ban,
  respond: Send,
};

const STATUS_TEXT: Record<number, string> = { 200: 'OK', 202: 'Accepted', 400: 'Bad Request' };
const RULE_IDS = new Set(RULES.map((rule) => rule.id));

function toNodes(run: Run): CanvasNode[] {
  const nodes: CanvasNode[] = [];
  const first = run.steps[0]?.name;
  if (first && first !== 'receive' && first !== 'parse') {
    nodes.push({ key: 'lead', name: 'lead', status: 'ok', details: ['lead JSON from the Request tab'], lastIndex: -1 });
  }

  run.steps.forEach((step, index) => {
    // Rule checks fold into one Switch node; the taken output carries the item on.
    const previous = nodes.at(-1);
    if (RULE_IDS.has(step.name) || (step.name === 'result' && previous?.outputs)) {
      let switchNode = previous?.outputs ? previous : undefined;
      if (!switchNode) {
        switchNode = {
          key: `${index}-rules`,
          name: 'rules',
          status: 'ok',
          details: [],
          lastIndex: index,
          outputs: [
            ...RULES.map((rule) => ({ label: rule.id, state: 'idle' as const })),
            { label: 'fallback', state: 'idle' },
          ],
        };
        nodes.push(switchNode);
      }
      const outputs = switchNode.outputs ?? [];
      const output = step.name === 'result' ? outputs.at(-1) : outputs.find((item) => item.label === step.name);
      if (output) {
        output.state =
          step.name === 'result' || step.status === 'ok'
            ? 'taken'
            : step.detail.endsWith(': disabled')
              ? 'disabled'
              : 'checked';
      }
      switchNode.details.push(step.detail);
      switchNode.lastIndex = index;
      return;
    }

    // Retries are one node with several attempts, like n8n's "Retry on fail".
    const name = /^call \d+$/.test(step.name) ? 'model' : step.name;
    if (previous && previous.name === name && !previous.outputs) {
      previous.details.push(step.detail);
      previous.status = step.status;
      previous.lastIndex = index;
      return;
    }
    nodes.push({ key: `${index}-${name}`, name, status: step.status, details: [step.detail], lastIndex: index });
  });

  // After a Switch, show where the item went.
  const last = nodes.at(-1);
  if (last?.outputs) {
    for (const output of last.outputs) {
      if (output.state === 'idle' && output.label !== 'fallback') {
        last.details.push(`${output.label}: not evaluated, a rule above matched`);
      }
    }
    const decision = String((run.response.body as { decision?: string }).decision ?? '');
    const toModel = decision === 'needs_model';
    nodes.push({
      key: 'decision',
      name: toModel ? 'to model' : decision,
      status: toModel ? 'review' : 'ok',
      details: [toModel ? 'no rule matched: the LLM decides next' : `decided by a rule, 0 LLM calls`],
      lastIndex: last.lastIndex,
    });
  }

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

// Geometry, in px. Every node sits on one center line; a Switch is taller and wider.
const NODE = 56;
const SWITCH_W = 176;
const GAP = 64;
const PAD_X = 28;
const CENTER_Y = 96;
const OUTPUT_ROW = 18;

const widthOf = (node: CanvasNode) => (node.outputs ? SWITCH_W : NODE);
const heightOf = (node: CanvasNode) => (node.outputs ? node.outputs.length * OUTPUT_ROW + 20 : NODE);
const outputY = (node: CanvasNode, index: number) =>
  CENTER_Y - heightOf(node) / 2 + 10 + OUTPUT_ROW / 2 + index * OUTPUT_ROW;

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

const OUTPUT_TEXT: Record<OutputState, string> = {
  taken: 'text-ok',
  checked: 'text-muted',
  disabled: 'text-faint line-through',
  idle: 'text-muted opacity-50',
};

export default function PipelineCanvas({ run, shown }: Props) {
  const nodes = toNodes(run);
  const xs = nodes.reduce<number[]>(
    (acc, node, index) => [...acc, index === 0 ? PAD_X : acc[index - 1] + widthOf(nodes[index - 1]) + GAP],
    [],
  );
  const width = (xs.at(-1) ?? 0) + widthOf(nodes.at(-1) ?? nodes[0]) + PAD_X;
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
    const left = xs[active] + widthOf(nodes[active]) / 2 - element.clientWidth / 2;
    element.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, nodes.length, selectedIndex]);

  const inspected = nodes.find((node) => node.key === selected) ?? nodes[Math.max(0, doneCount - 1)];
  const inspectedDone = shown > inspected.lastIndex;
  const InspectedIcon = ICONS[inspected.name] ?? Split;

  return (
    <div className="flex h-full flex-col font-sans">
      <div
        ref={scroller}
        className="canvas-grid relative min-h-52 flex-1 overflow-x-auto overflow-y-hidden"
        role="group"
        aria-label="Workflow canvas"
      >
        <div className="relative h-full" style={{ width, minWidth: '100%' }}>
          <svg className="pointer-events-none absolute inset-0 h-full" width={width} aria-hidden="true">
            {nodes.slice(1).map((node, index) => {
              const source = nodes[index];
              const taken = source.outputs?.findIndex((output) => output.state === 'taken') ?? -1;
              const x1 = xs[index] + widthOf(source);
              const y1 = source.outputs ? outputY(source, taken >= 0 ? taken : source.outputs.length - 1) : CENTER_Y;
              const x2 = xs[index + 1];
              const y2 = CENTER_Y;
              const reached = shown > node.lastIndex;
              const running = !reached && index + 1 === doneCount;
              const skipped = node.status === 'skip';
              return (
                <g key={node.key}>
                  <path
                    d={`M ${x1} ${y1} C ${x1 + GAP / 2} ${y1}, ${x2 - GAP / 2} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={reached && !skipped ? 'var(--ok)' : 'var(--border-strong)'}
                    strokeWidth={reached ? 1.75 : 1.25}
                    strokeDasharray={(skipped && reached) || running ? '5 5' : undefined}
                    className={running ? 'canvas-flow' : undefined}
                  />
                  {!source.outputs && (
                    <circle cx={x1} cy={y1} r={3} fill="var(--surface)" stroke="var(--border-strong)" />
                  )}
                  <circle cx={x2} cy={y2} r={3} fill="var(--surface)" stroke="var(--border-strong)" />
                  {reached && !skipped && !source.outputs && (
                    <text x={(x1 + x2) / 2} y={y1 - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
                      1 item
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {nodes.map((node, index) => {
            const Icon = ICONS[node.name] ?? Split;
            const done = shown > node.lastIndex;
            const running = !done && index === doneCount;
            const isSelected = inspected.key === node.key;
            const tries = node.details.length;
            const w = widthOf(node);
            const h = heightOf(node);
            return (
              <button
                key={node.key}
                type="button"
                onClick={() => setSelected(node.key)}
                className="absolute flex flex-col items-center gap-2 text-center"
                style={{ left: xs[index], top: CENTER_Y - h / 2, width: w }}
                aria-label={`${node.name}: ${done ? node.status : 'pending'}`}
              >
                <span
                  className={cx(
                    'relative flex w-full items-stretch rounded-xl border-2 bg-surface transition-colors duration-300',
                    done ? BORDER[node.status] : running ? 'animate-pulse border-ink' : 'border-border opacity-50',
                    isSelected && 'ring-2 ring-ink/30 ring-offset-2 ring-offset-bg',
                  )}
                  style={{ height: h }}
                >
                  <span
                    className={cx('grid place-items-center', node.outputs ? 'w-11 border-r border-border' : 'w-full')}
                  >
                    <Icon className={cx('size-6', done && node.status !== 'skip' ? 'text-ink' : 'text-muted')} />
                  </span>
                  {node.outputs && (
                    <span className="flex flex-1 flex-col justify-center py-2.5">
                      {node.outputs.map((output) => (
                        <span
                          key={output.label}
                          className={cx(
                            'relative flex items-center justify-end pr-3 font-mono text-[10px] whitespace-nowrap',
                            done ? OUTPUT_TEXT[output.state] : 'text-muted opacity-50',
                          )}
                          style={{ height: OUTPUT_ROW }}
                        >
                          {output.label}
                          {/* Output handle on the right edge, like n8n. */}
                          <span
                            className={cx(
                              'absolute -right-1.75 size-2.25 rounded-full border',
                              done && output.state === 'taken' ? 'border-ok bg-ok' : 'border-border-strong bg-surface',
                            )}
                          />
                        </span>
                      ))}
                    </span>
                  )}
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
                  {done && tries > 1 && !node.outputs && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border bg-bg px-1.5 font-mono text-[9px] whitespace-nowrap text-muted">
                      {tries} tries
                    </span>
                  )}
                </span>
                <span className={cx('w-22 truncate text-[11px] leading-tight', done ? 'text-ink' : 'text-muted')}>
                  {node.outputs ? 'rules · switch' : node.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex max-h-28 min-h-22 gap-3 overflow-y-auto border-t border-border bg-surface/60 px-4 py-3">
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
