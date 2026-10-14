import { useCallback, useEffect, useRef, useState } from 'react';
import { cx } from '../../lib/cx';
import type { ModelMode } from '../../demos/llm';
import { RULES } from '../../demos/rules';
import { SCENARIOS, type Level, type Options } from '../../demos/scenarios';
import type { Run, StepStatus } from '../../demos/types';
import PipelineCanvas from './PipelineCanvas';

interface Props {
  /** Source of each scenario's module, highlighted at build time (no highlighter shipped to the browser). */
  code: Record<Level, string>;
}

const LEVELS: { id: Level; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'expert', label: 'Expert' },
];

const MODEL_MODES: { id: ModelMode; label: string }[] = [
  { id: 'normal', label: 'normal' },
  { id: 'invalid_json', label: 'invalid JSON' },
  { id: 'low_confidence', label: 'low confidence' },
  { id: 'down', label: 'down' },
];

const MARK: Record<StepStatus, { glyph: string; className: string }> = {
  ok: { glyph: '✓', className: 'text-ok' },
  review: { glyph: '!', className: 'text-review' },
  error: { glyph: '×', className: 'text-error' },
  skip: { glyph: '·', className: 'text-muted' },
};

const STATUS_TEXT: Record<number, string> = { 200: 'OK', 202: 'Accepted', 400: 'Bad Request' };
const STEP_DELAY_MS = 220;

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function execute(level: Level, text: string, options: Options): Run {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return {
      steps: [{ name: 'parse', status: 'error', detail: 'request body is not valid JSON' }],
      response: { status: 400, body: { error: 'invalid JSON' } },
    };
  }
  return SCENARIOS[level].run(body, options);
}

const chip = (active: boolean) =>
  cx(
    'rounded-md border px-2 py-0.5 text-xs transition-colors',
    active ? 'border-border-strong bg-surface-2 text-ink' : 'border-border text-muted hover:text-ink',
  );

const label = 'font-mono text-[11px] tracking-wider text-muted uppercase';

export default function Playground({ code }: Props) {
  const [level, setLevel] = useState<Level>('easy');
  const [sample, setSample] = useState(0);
  const [input, setInput] = useState(() => pretty(SCENARIOS.easy.samples[0].payload));
  const [options, setOptions] = useState<Options>({ model: 'normal', crmDown: false, disabledRules: [] });
  const [run, setRun] = useState<Run | null>(null);
  const [shown, setShown] = useState(0);
  const [tab, setTab] = useState<'request' | 'canvas' | 'log' | 'code'>('canvas');
  // The last result view the visitor chose (canvas or log); a new run returns to it.
  const view = useRef<'canvas' | 'log'>('canvas');
  const timer = useRef<number | undefined>(undefined);

  // Run, then reveal the log line by line so the flow is readable.
  const start = useCallback((nextLevel: Level, text: string, nextOptions: Options) => {
    const result = execute(nextLevel, text, nextOptions);
    setRun(result);
    setTab(view.current);
    window.clearInterval(timer.current);
    const total = result.steps.length + 1;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(total);
      return;
    }
    setShown(0);
    let count = 0;
    timer.current = window.setInterval(() => {
      count += 1;
      setShown(count);
      if (count >= total) window.clearInterval(timer.current);
    }, STEP_DELAY_MS);
  }, []);

  useEffect(() => {
    start('easy', pretty(SCENARIOS.easy.samples[0].payload), options);
    return () => window.clearInterval(timer.current);
    // First run on load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scenario = SCENARIOS[level];

  const pickLevel = (next: Level) => {
    const text = pretty(SCENARIOS[next].samples[0].payload);
    setLevel(next);
    setSample(0);
    setInput(text);
    start(next, text, options);
  };

  const pickSample = (index: number) => {
    const text = pretty(scenario.samples[index].payload);
    setSample(index);
    setInput(text);
    start(level, text, options);
  };

  const changeOptions = (patch: Partial<Options>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    start(level, input, next);
  };

  const toggleRule = (id: string) =>
    changeOptions({
      disabledRules: options.disabledRules.includes(id)
        ? options.disabledRules.filter((rule) => rule !== id)
        : [...options.disabledRules, id],
    });

  const running = run !== null && shown <= run.steps.length;
  const offline = level === 'hard' || level === 'expert';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-[0_32px_80px_-32px_rgb(0_0_0/0.55)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-muted">
          playground <span className="text-faint">/</span>{' '}
          <span className="text-ink">{scenario.title.toLowerCase()}</span>
        </p>
        <div role="tablist" aria-label="Difficulty" className="flex rounded-lg border border-border bg-bg p-0.5">
          {LEVELS.map(({ id, label: text }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === level}
              onClick={() => pickLevel(id)}
              className={cx(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                id === level ? 'bg-ink text-bg' : 'text-muted hover:text-ink',
              )}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-muted">{scenario.flow}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cx(label, 'mr-1')}>try</span>
          {scenario.samples.map((item, index) => (
            <button key={item.label} type="button" className={chip(index === sample)} onClick={() => pickSample(index)}>
              {item.label}
            </button>
          ))}
        </div>
        {level === 'medium' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cx(label, 'mr-1')}>rules</span>
            {RULES.map((rule) => {
              const enabled = !options.disabledRules.includes(rule.id);
              return (
                <button
                  key={rule.id}
                  type="button"
                  title={`${rule.label} → ${rule.decision}`}
                  aria-pressed={enabled}
                  className={cx(chip(enabled), !enabled && 'line-through')}
                  onClick={() => toggleRule(rule.id)}
                >
                  {rule.id}
                </button>
              );
            })}
          </div>
        )}
        {offline && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cx(label, 'mr-1')}>model</span>
            {MODEL_MODES.map(({ id, label: text }) => (
              <button
                key={id}
                type="button"
                aria-pressed={options.model === id}
                className={chip(options.model === id)}
                onClick={() => changeOptions({ model: id })}
              >
                {text}
              </button>
            ))}
            {level === 'expert' && (
              <>
                <span className={cx(label, 'mr-1 ml-3')}>crm</span>
                <button
                  type="button"
                  aria-pressed={options.crmDown}
                  className={chip(options.crmDown)}
                  onClick={() => changeOptions({ crmDown: !options.crmDown })}
                >
                  {options.crmDown ? 'down' : 'up'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border py-1.5 pr-2 pl-2">
        <div role="tablist" aria-label="View" className="flex gap-0.5">
          {(['request', 'canvas', 'log', 'code'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                if (id === 'canvas' || id === 'log') view.current = id;
              }}
              className={cx(
                'rounded-md px-2.5 py-1.5 text-xs capitalize transition-colors',
                tab === id ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {id}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => start(level, input, options)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-medium text-bg transition-colors hover:bg-ink/85"
        >
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
          </svg>
          Run
        </button>
      </div>

      <div className="h-80 overflow-auto bg-bg/60 font-mono text-[12.5px] leading-6">
        {tab === 'request' && (
          <div className="flex h-full flex-col">
            <p className="px-4 pt-3 text-[11px] text-muted">{scenario.input}</p>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault();
                  start(level, input, options);
                }
              }}
              spellCheck={false}
              aria-label="Request body, JSON"
              className="flex-1 resize-none bg-transparent px-4 py-2 text-ink outline-none"
            />
          </div>
        )}

        {tab === 'canvas' && run && <PipelineCanvas run={run} shown={shown} />}

        {tab === 'log' && run && (
          <ol className="px-4 py-3" aria-live="polite">
            {run.steps.slice(0, shown).map((step, index) => (
              <li
                key={index}
                className="grid animate-fade-in grid-cols-[1rem_5.25rem_1fr] gap-2 sm:grid-cols-[1rem_6.5rem_1fr]"
              >
                <span className={MARK[step.status].className} aria-label={step.status}>
                  {MARK[step.status].glyph}
                </span>
                <span className="truncate text-ink">{step.name}</span>
                <span className="break-words text-muted">{step.detail}</span>
              </li>
            ))}
            {shown > run.steps.length && (
              <li className="mt-3 animate-fade-in border-t border-border pt-3">
                <span className={run.response.status >= 400 ? 'text-error' : 'text-ok'}>
                  → {run.response.status} {STATUS_TEXT[run.response.status] ?? ''}
                </span>
                <pre className="mt-1 whitespace-pre-wrap text-muted">{pretty(run.response.body)}</pre>
              </li>
            )}
            {running && <li className="animate-pulse text-muted">▍</li>}
          </ol>
        )}

        {tab === 'code' && (
          <div>
            <p className="px-4 pt-3 text-[11px] text-muted">{scenario.file}</p>
            <div className="playground-code" dangerouslySetInnerHTML={{ __html: code[level] }} />
          </div>
        )}
      </div>

      <p className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 font-mono text-[11px] text-muted">
        <span>
          {offline
            ? 'Runs in your browser. Model and CRM are offline stand-ins; the deployed version calls Claude Haiku.'
            : 'Runs in your browser: the same TypeScript as on the Code tab.'}
        </span>
        <span className="hidden shrink-0 sm:inline">ctrl + enter</span>
      </p>
    </div>
  );
}
