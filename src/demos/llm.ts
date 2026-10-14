import type { Lead } from './types';

export type ModelMode = 'normal' | 'invalid_json' | 'low_confidence' | 'down';

export interface Qualification {
  decision: 'qualified' | 'rejected';
  confidence: number;
  reasons: string[];
}

// The model may only answer with this closed shape. Anything else never decides on its own.
export const SCHEMA = {
  type: 'object',
  required: ['decision', 'confidence', 'reasons'],
  additionalProperties: false,
  properties: {
    decision: { enum: ['qualified', 'rejected'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reasons: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
} as const;

/**
 * Stand-in for the model so the playground works offline. The deployed version sends the
 * lead and SCHEMA to Claude Haiku; everything after this function stays the same.
 */
export function mockModel(lead: Lead, mode: ModelMode): { ok: true; text: string } | { ok: false; error: string } {
  if (mode === 'down') return { ok: false, error: '503 Service Unavailable' };
  if (mode === 'invalid_json') return { ok: true, text: 'Sure! Here is my answer: {decision: qualified' };

  const buyer = /\b(manager|lead|ops|operations|marketing|sales|growth|revops)\b/i.test(lead.title ?? '');
  const answer: Qualification = buyer
    ? { decision: 'qualified', confidence: 0.86, reasons: [`"${lead.title}" matches the buyer persona`] }
    : {
        decision: 'rejected',
        confidence: 0.82,
        reasons: [`"${lead.title ?? 'no title'}" is outside the buyer persona`],
      };
  if (mode === 'low_confidence') answer.confidence = 0.55;
  return { ok: true, text: JSON.stringify(answer) };
}

export function parseQualification(text: string): { ok: true; value: Qualification } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not valid JSON' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ok: false, error: 'not an object' };

  const value = data as Record<string, unknown>;
  const extra = Object.keys(value).filter((key) => !(key in SCHEMA.properties));
  if (extra.length) return { ok: false, error: `unexpected field ${extra[0]}` };
  if (value.decision !== 'qualified' && value.decision !== 'rejected') return { ok: false, error: 'bad decision' };
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) {
    return { ok: false, error: 'confidence must be 0..1' };
  }
  if (!Array.isArray(value.reasons) || !value.reasons.length || value.reasons.some((r) => typeof r !== 'string')) {
    return { ok: false, error: 'reasons must be a non-empty list of strings' };
  }
  return { ok: true, value: value as unknown as Qualification };
}

/** Below the threshold the answer goes to a human, whatever the model decided. */
export const AUTO_DECIDE_AT = 0.8;

export function decide(answer: Qualification): Qualification['decision'] | 'review' {
  return answer.confidence >= AUTO_DECIDE_AT ? answer.decision : 'review';
}
