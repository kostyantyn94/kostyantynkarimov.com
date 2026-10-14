import { syncToCrm, MAX_ATTEMPTS } from './crm';
import { fingerprint, normalizeLead, validateLead } from './lead';
import { AUTO_DECIDE_AT, decide, mockModel, parseQualification, type ModelMode } from './llm';
import { applyRules } from './rules';
import type { Lead, Run, Step } from './types';

export type Level = 'easy' | 'medium' | 'hard' | 'expert';

export interface Options {
  model: ModelMode;
  crmDown: boolean;
  disabledRules: string[];
}

// Already in the "database", so sending this person again is a duplicate.
const KNOWN = new Set([fingerprint({ email: 'jonas.meyer@helixsoft.dev' })]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// "Email_Address" → email, trimmed name, … becomes "5 fields renamed, 2 trimmed, email lowercased".
function summarizeFixes(fixes: string[]): string {
  if (!fixes.length) return 'already clean';
  const count = (test: (fix: string) => boolean) => fixes.filter(test).length;
  const parts = [
    [count((fix) => fix.includes('→')), 'renamed'],
    [count((fix) => fix.startsWith('trimmed')), 'trimmed'],
    [count((fix) => fix.startsWith('dropped')), 'unknown dropped'],
  ]
    .filter(([n]) => n)
    .map(([n, what]) => `${n} ${what}`);
  if (fixes.includes('lowercased email')) parts.push('email lowercased');
  if (fixes.includes('cleaned phone')) parts.push('phone cleaned');
  return parts.join(', ');
}

/** Easy: webhook → normalize → validate → dedupe. */
export function runIntake(body: unknown): Run & { lead?: Lead; duplicate?: boolean } {
  if (!isObject(body)) {
    return {
      steps: [{ name: 'receive', status: 'error', detail: 'body must be a JSON object' }],
      response: { status: 400, body: { errors: ['body must be a JSON object'] } },
    };
  }
  const steps: Step[] = [
    { name: 'receive', status: 'ok', detail: `POST /webhook/lead, ${Object.keys(body).length} fields` },
  ];

  const { lead, fixes } = normalizeLead(body);
  steps.push({ name: 'normalize', status: 'ok', detail: summarizeFixes(fixes) });

  const errors = validateLead(lead);
  if (errors.length) {
    steps.push({ name: 'validate', status: 'error', detail: errors.join('; ') });
    return { steps, response: { status: 400, body: { errors } } };
  }
  steps.push({ name: 'validate', status: 'ok', detail: 'required fields present, formats valid' });

  const id = fingerprint(lead);
  if (KNOWN.has(id)) {
    steps.push({ name: 'dedupe', status: 'ok', detail: `fingerprint ${id} exists, nothing created` });
    return { steps, response: { status: 200, body: { duplicate: true, fingerprint: id } }, lead, duplicate: true };
  }
  steps.push({ name: 'dedupe', status: 'ok', detail: `new fingerprint ${id}` });
  return { steps, response: { status: 202, body: { accepted: true, fingerprint: id, lead } }, lead };
}

/** Medium: rules as data, first match wins, no match goes to the model. */
export function runRules(lead: Lead, disabledRules: string[] = []): Run {
  const result = applyRules(lead, undefined, disabledRules);
  const steps: Step[] = result.trace.map(({ rule, matched, disabled }) => ({
    name: rule.id,
    status: matched ? 'ok' : 'skip',
    detail: disabled
      ? `${rule.label}: disabled`
      : `${rule.label}: ${matched ? `match → ${rule.decision}` : 'no match'}`,
  }));
  if (result.decision === 'needs_model') {
    steps.push({ name: 'result', status: 'review', detail: 'no rule matched → the model decides' });
    return { steps, response: { status: 200, body: { decision: 'needs_model', llm_calls: 0 } } };
  }
  return {
    steps,
    response: { status: 200, body: { decision: result.decision, decided_by: result.rule?.id, llm_calls: 0 } },
  };
}

/** Hard: the model answers in JSON; retries, schema check and a confidence threshold guard it. */
export function runModel(lead: Lead, mode: ModelMode): Run {
  const steps: Step[] = [];
  let text: string | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && text === undefined; attempt++) {
    const reply = mockModel(lead, mode);
    if (reply.ok) text = reply.text;
    else steps.push({ name: `call ${attempt}`, status: 'error', detail: reply.error });
  }
  if (text === undefined) {
    steps.push({
      name: 'fallback',
      status: 'review',
      detail: `model down after ${MAX_ATTEMPTS} attempts → human review`,
    });
    return { steps, response: { status: 200, body: { decision: 'review', reason: 'ai_unavailable' } } };
  }
  steps.push({ name: 'model', status: 'ok', detail: text.length > 72 ? `${text.slice(0, 72)}…` : text });

  const parsed = parseQualification(text);
  if (!parsed.ok) {
    steps.push({ name: 'validate', status: 'error', detail: `schema check failed: ${parsed.error}` });
    steps.push({ name: 'fallback', status: 'review', detail: 'invalid output never decides → human review' });
    return { steps, response: { status: 200, body: { decision: 'review', reason: 'invalid_output' } } };
  }
  steps.push({ name: 'validate', status: 'ok', detail: 'matches the closed JSON schema' });

  const { confidence, reasons } = parsed.value;
  const decision = decide(parsed.value);
  const comparison = confidence >= AUTO_DECIDE_AT ? '≥' : '<';
  steps.push({
    name: 'threshold',
    status: decision === 'review' ? 'review' : 'ok',
    detail: `confidence ${confidence} ${comparison} ${AUTO_DECIDE_AT} → ${decision}`,
  });
  return { steps, response: { status: 200, body: { decision, confidence, reasons } } };
}

/** Expert: the whole pipeline, from webhook to CRM, with failures you can switch on. */
export function runPipeline(body: unknown, options: Options): Run {
  const intake = runIntake(body);
  if (!intake.lead || intake.duplicate) return intake;
  const lead = intake.lead;
  const steps = [...intake.steps];

  const rules = applyRules(lead, undefined, options.disabledRules);
  let decision: string;
  let decidedBy: string;
  if (rules.decision !== 'needs_model') {
    decision = rules.decision;
    decidedBy = `rule:${rules.rule?.id}`;
    steps.push({ name: 'rules', status: 'ok', detail: `${rules.rule?.label} → ${decision}, 0 LLM calls` });
  } else {
    steps.push({ name: 'rules', status: 'skip', detail: 'no rule matched → model' });
    const model = runModel(lead, options.model);
    steps.push(...model.steps);
    decision = (model.response.body as { decision: string }).decision;
    decidedBy = decision === 'review' ? 'pending human' : 'ai';
  }

  let crm: number | string = 'skipped';
  if (decision === 'qualified') {
    const sync = syncToCrm(lead, options.crmDown);
    if (sync.ok) {
      crm = sync.contactId;
      steps.push({ name: 'crm', status: 'ok', detail: sync.attempts.at(-1) ?? '' });
    } else {
      crm = 'queued';
      for (const attempt of sync.attempts) steps.push({ name: 'crm', status: 'error', detail: attempt });
      steps.push({ name: 'on error', status: 'review', detail: 'failure stored, retry scheduled in 15 min' });
    }
  } else {
    steps.push({ name: 'crm', status: 'skip', detail: `not synced: ${decision}` });
  }
  steps.push({ name: 'audit', status: 'ok', detail: `decision "${decision}" by ${decidedBy} logged` });

  const status = typeof crm === 'number' || crm === 'skipped' ? 200 : 202;
  return { steps, response: { status, body: { decision, decided_by: decidedBy, crm_contact: crm } } };
}

export interface Sample {
  label: string;
  payload: Record<string, unknown>;
}

export interface Scenario {
  title: string;
  flow: string;
  input: string;
  file: string;
  samples: Sample[];
  run: (body: unknown, options: Options) => Run;
}

const messyForm = {
  Email_Address: '  Ana.Kovacs@Northwind-Labs.IO ',
  'Full Name': 'Ana   Kovacs',
  Company: 'Northwind Labs',
  'Job Title': 'Head of Sales Ops',
  'Phone Number': '+49 (151) 234-5678',
  utm_source: 'linkedin',
};

const asLead = (body: unknown): Lead => (isObject(body) ? normalizeLead(body).lead : {});

export const SCENARIOS: Record<Level, Scenario> = {
  easy: {
    title: 'Webhook intake',
    flow: 'receive → normalize → validate → dedupe',
    input: 'POST /webhook/lead',
    file: 'src/demos/lead.ts',
    samples: [
      { label: 'Messy form', payload: messyForm },
      {
        label: 'Same person again',
        payload: { email: 'JONAS.MEYER@helixsoft.dev', name: 'Jonas Meyer', company: 'HelixSoft' },
      },
      { label: 'Broken payload', payload: { email: 'ana@', company: 'Acme', phone: '12' } },
    ],
    run: (body) => runIntake(body),
  },
  medium: {
    title: 'Rule engine',
    flow: 'rules are rows → first match wins → no match goes to the model',
    input: 'lead',
    file: 'src/demos/rules.ts',
    samples: [
      {
        label: 'VP at a SaaS',
        payload: {
          email: 'sofia.brown@pinefield-saas.com',
          name: 'Sofia Brown',
          company: 'Pinefield',
          title: 'VP Marketing',
        },
      },
      {
        label: 'Student on Gmail',
        payload: { email: 'emma.bondar13@gmail.com', name: 'Emma Bondar', title: 'Student' },
      },
      {
        label: 'No rule fits',
        payload: {
          email: 'tom.schmidt@northwind-labs.io',
          name: 'Tom Schmidt',
          company: 'Northwind Labs',
          title: 'Office Administrator',
        },
      },
    ],
    run: (body, options) => runRules(asLead(body), options.disabledRules),
  },
  hard: {
    title: 'LLM with guardrails',
    flow: 'model → JSON schema check → confidence threshold → fallback to a human',
    input: 'lead',
    file: 'src/demos/llm.ts',
    samples: [
      {
        label: 'Growth lead',
        payload: {
          email: 'olena.dubois@cloudmesa.app',
          name: 'Olena Dubois',
          company: 'CloudMesa',
          title: 'Growth Lead',
        },
      },
      {
        label: 'Office admin',
        payload: {
          email: 'tom.schmidt@northwind-labs.io',
          name: 'Tom Schmidt',
          company: 'Northwind Labs',
          title: 'Office Administrator',
        },
      },
    ],
    run: (body, options) => runModel(asLead(body), options.model),
  },
  expert: {
    title: 'Full pipeline',
    flow: 'webhook → normalize → dedupe → rules → LLM → CRM → audit',
    input: 'POST /webhook/lead',
    file: 'src/demos/scenarios.ts',
    samples: [
      { label: 'Decided by a rule', payload: messyForm },
      {
        label: 'Needs the model',
        payload: {
          Email: 'Olena.Dubois@CloudMesa.app',
          Name: 'Olena Dubois',
          Company: 'CloudMesa',
          Title: 'Growth Lead',
        },
      },
      { label: 'Duplicate', payload: { email: 'jonas.meyer@helixsoft.dev', name: 'Jonas Meyer' } },
    ],
    run: (body, options) => runPipeline(body, options),
  },
};
